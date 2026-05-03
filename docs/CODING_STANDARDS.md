# Wez Coding Standards

Lower-level coding rules. For higher-level patterns (repository, service, strategy, factory), read `system-design-patterns.md`.

## File naming

- TypeScript files: `kebab-case.ts` (e.g., `hire-requests.service.ts`, `finalize-placement.use-case.ts`)
- React components: `PascalCase.tsx` (e.g., `WorkerProfileCard.tsx`)
- Tests: same name + `.test.ts` (e.g., `hire-requests.service.test.ts`)
- DTOs: `<verb>-<noun>.dto.ts` (e.g., `create-hire-request.dto.ts`)

## Class naming

| Kind | Suffix | Example |
|---|---|---|
| Controller | `Controller` | `WorkersController` |
| Service | `Service` | `HireRequestsService` |
| Repository | `Repository` | `WorkersRepository` |
| Use case | `UseCase` | `FinalizePlacementUseCase` |
| Strategy | `Strategy` | `FlatCommissionStrategy` |
| Factory | `Factory` | `PlacementFactory` |
| Specification | `Specification` | `WorkerFilterSpecification` |
| Entity | (domain noun) | `Worker`, `HireRequest`, `Placement` |
| DTO | `Dto` | `CreateHireRequestDto` |
| Event | `Event` | `HireRequestCreatedEvent` |
| Guard | `Guard` | `RoleGuard`, `StationOwnershipGuard` |

## Controller pattern

Controllers are thin. They validate input via DTOs and delegate to a service or use case. No business logic.

```typescript
@Controller('hire-requests')
@ApiTags('HireRequests')
@UseGuards(AuthGuard, RoleGuard)
export class HireRequestsController {
	constructor(private readonly service: HireRequestsService) {}

	@Post()
	@Roles('agent', 'employer')
	@ApiOperation({ summary: 'Create a hire request' })
	@ApiBody({ type: CreateHireRequestDto })
	@ApiResponse({ status: 201, description: 'Created' })
	create(@CurrentUser() user: User, @Body() dto: CreateHireRequestDto) {
		return this.service.create(user, dto);
	}

	@Get()
	@Roles('agent', 'admin')
	@ApiOperation({ summary: 'List hire requests for current station' })
	list(@CurrentUser() user: User, @Query() filter: ListHireRequestsDto) {
		return this.service.list(user, filter);
	}
}
```

## Service pattern

Services contain business logic. They orchestrate repositories and emit events. They throw typed exceptions on rule violations.

```typescript
@Injectable()
export class HireRequestsService {
	constructor(
		private readonly repo: HireRequestsRepository,
		private readonly workersRepo: WorkersRepository,
		private readonly employersRepo: EmployersRepository,
		private readonly events: EventEmitter2,
	) {}

	async create(currentUser: User, dto: CreateHireRequestDto): Promise<HireRequest> {
		const worker = await this.workersRepo.findById(dto.workerId);
		if (!worker) throw new NotFoundException('Worker not found');
		if (!worker.available) {
			throw new ConflictException({ code: 'WORKER_NOT_AVAILABLE', message: 'Worker is in another placement' });
		}

		const employer = await this.employersRepo.findById(currentUser.employerId);
		if (employer.rating === 'red') throw new ForbiddenException({ code: 'EMPLOYER_BANNED' });

		const created = await this.repo.create({ ...dto, employerId: employer.id, status: 'awaiting_visit' });
		this.events.emit('hire_request.created', { hireRequestId: created.id });
		return created;
	}
}
```

## Repository pattern

Every Prisma access goes through a repository. The repository maps Prisma rows to domain types so services never see Prisma types.

```typescript
@Injectable()
export class WorkersRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string): Promise<Worker | null> {
		const row = await this.prisma.worker.findFirst({ where: { id, deletedAt: null } });
		return row ? toWorker(row) : null;
	}

	async findManyByFilter(spec: WorkerFilterSpecification): Promise<Worker[]> {
		const rows = await this.prisma.worker.findMany({ where: spec.toPrismaWhere() });
		return rows.map(toWorker);
	}
}
```

## DTO + validation

```typescript
export class CreateHireRequestDto {
	@ApiProperty({ example: 'worker_abc123' })
	@IsUUID()
	workerId!: string;

	@ApiProperty({ example: 'barista' })
	@IsString()
	roleId!: string;

	@ApiProperty({ example: 600000, description: 'Salary in cents' })
	@IsInt()
	@Min(0)
	proposedSalaryCents!: number;

	@ApiProperty({ example: 'station_xyz' })
	@IsUUID()
	stationId!: string;

	@ApiProperty({ enum: ['online', 'in_person'] })
	@IsEnum(['online', 'in_person'] as const)
	channel!: 'online' | 'in_person';
}
```

## Frontend query keys factory

```typescript
// features/workers/api/worker-queries.ts
export const workerKeys = {
	all: ['workers'] as const,
	lists: () => [...workerKeys.all, 'list'] as const,
	list: (filter: WorkerFilter) => [...workerKeys.lists(), filter] as const,
	details: () => [...workerKeys.all, 'detail'] as const,
	detail: (id: string) => [...workerKeys.details(), id] as const,
};

export const useWorkers = (filter: WorkerFilter) =>
	useQuery({ queryKey: workerKeys.list(filter), queryFn: () => api.get('/workers', { params: filter }) });
```

## Frontend mutation pattern

```typescript
export const useCreateHireRequest = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateHireRequestInput) =>
			api.post('/hire-requests', input, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: hireRequestKeys.lists() }),
	});
};
```

## Error handling

Backend:
- Throw typed Nest exceptions: `NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`.
- Pass a structured payload: `{ code, message, details? }`.
- Never throw raw `Error`. Never return Prisma errors.
- No `try/catch` in controllers — `GlobalExceptionFilter` formats responses.

Frontend:
- TanStack Query `onError` shows sonner toasts.
- Switch on `error.code` to show localized text. Unknown codes → generic toast + report to Sentry.

## Strict TypeScript rules

- `const` only — never `let`/`var`.
- No `any`. Use `unknown` and narrow.
- No default exports (except TanStack Router route files).
- No magic numbers/strings — use `as const` objects or enums.
- No `console.log` in production code — use NestJS `Logger` (backend) or `reportError` (frontend).
- No relative imports across modules — use aliases (`#modules/*`, `#shared/*`, `#features/*`).
- shadcn components use `@/components/ui/*` (preserved alias).
- No `forEach()` — use `for...of`.
- No `.then()` — use `async/await`.
- No file > 600 lines.
- No function > 100 lines (React components: 300).
- Always `as const` on object literals when helpful.
- No return type annotations unless type stub or unclear inference.

## React rules

- Wrap every component in `React.memo` with `displayName`.
- Use `React.useCallback` for handlers passed to children.
- Use `React.useMemo` for derived values.
- Never set state inside scroll/resize/keypress handlers.
- Cleanup subscriptions / timers / listeners in `useEffect` cleanup.
- Use `AbortController` for cancellable fetches.
- Never store React refs in module-level state.

## Money

`BIGINT` cents at the DB. `bigint` (or `number` if always < 2^53) at the API boundary, cast to `string` for JSON safety on very large values. Column suffix `_cents`. Never `NUMERIC`/`DECIMAL`/`FLOAT` for money.

## Logging

- Backend: NestJS `Logger` or `nestjs-pino` `PinoLogger` injected into class.
- Structured: log with key/value, never string concat.
- PII masked: `Hanna T**`, `+251****567`, `F-3429-****-AA`.
- Audit log via `@AuditLog('action_name')` decorator on mutation methods.

## Git commit format

- Single line. No body. No co-author footer.
- `type(scope): description` — `feat(workers): add worker registration wizard step 2`.
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.
- Commit when changes exceed 8 new files OR 10 edits.

## Linting

- **Biome** (not ESLint/Prettier). Tabs for indent, double quotes.
- `pnpm lint` / `pnpm lint:fix`.
- Pre-commit via `lefthook`: biome + typecheck.
