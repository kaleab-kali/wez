# Wez Platform — System Design & Patterns

This document defines the design patterns Claude Code should apply when implementing features. Use these consistently. If you're tempted to use a different pattern, justify it in the PR description.

---

## When to apply which pattern

### Repository pattern (mandatory)

**Use for**: every database access.

**Why**: keeps Prisma queries out of services, makes testing easier (mock the repository, not Prisma), provides a single place to apply soft-delete filters and tenant scoping later.

**Shape**:

```typescript
// workers.repository.ts
@Injectable()
export class WorkersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Worker | null> {
    const row = await this.prisma.worker.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toWorker(row) : null;
  }

  async findManyByFilter(filter: WorkerFilter): Promise<Worker[]> { /* ... */ }
  async create(data: CreateWorkerData): Promise<Worker> { /* ... */ }
  async update(id: string, patch: UpdateWorkerData): Promise<Worker> { /* ... */ }
  async softDelete(id: string, by: string): Promise<void> { /* ... */ }
}
```

The mapping function `toWorker(row)` lives in the repository file. It takes a Prisma row and returns the domain type. This decouples our types from Prisma's auto-generated types.

---

### Service pattern (mandatory)

**Use for**: all business logic.

Services are stateless (no instance properties beyond constructor-injected dependencies). They expose methods named for what they do in the domain language: `registerWorker`, `finalizePlacement`, `escalateComplaint`.

```typescript
// hire-requests.service.ts
@Injectable()
export class HireRequestsService {
  constructor(
    private readonly hireRequestsRepo: HireRequestsRepository,
    private readonly workersRepo: WorkersRepository,
    private readonly employersRepo: EmployersRepository,
    private readonly events: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  async create(currentUser: User, dto: CreateHireRequestDto): Promise<HireRequest> {
    const worker = await this.workersRepo.findById(dto.workerId);
    if (!worker) throw new NotFoundException('Worker not found');
    if (!worker.available) throw new ConflictException('Worker is not available');

    const employer = await this.employersRepo.findById(currentUser.employerId);
    if (employer.rating === 'red') throw new ForbiddenException('Account suspended');

    if (!worker.roles.includes(dto.roleId)) {
      throw new ConflictException('Worker does not perform this role');
    }

    const hireRequest = await this.hireRequestsRepo.create({
      ...dto,
      employerId: employer.id,
      status: 'awaiting_visit',
      channel: dto.channel ?? 'online',
    });

    this.events.emit('hire_request.created', { hireRequestId: hireRequest.id });
    return hireRequest;
  }
}
```

**Service rules**:
- Throw NestJS HTTP exceptions (mapped to HTTP errors by the global filter) OR custom DomainExceptions for business rules.
- Always return domain types, never raw database rows.
- Always emit events for cross-cutting side effects.
- Never call other services that would create circular dependencies. If you have a cycle, you have a missing module.

---

### Domain Event pattern

**Use for**: side effects that don't need to succeed for the operation to be valid.

```typescript
// Listener
@Injectable()
export class HireRequestEventHandler {
  @OnEvent('hire_request.created')
  async onCreated(payload: { hireRequestId: string }) {
    // queue notification, write audit, etc.
  }
}
```

**Rules**:
- Listeners are idempotent. The same event firing twice should not double-effect.
- Listeners do NOT throw. If they fail, log + send to a dead-letter queue.
- Don't put critical business logic in listeners. If it must succeed, it's not a listener — it's a service call in the main flow.

---

### Strategy pattern

**Use for**: things where the algorithm varies by configuration. Specifically:

- **Commission calculation** — flat vs. percentage strategies
- **Notification delivery** — SMS, email, push (Phase 3)
- **Report generation** — ERCA, MoLS, POESSA each have different formats
- **Tier-upgrade rules** — rules differ between Tier 0→1, 1→2, 2→3

```typescript
// commission.strategy.ts
export interface CommissionStrategy {
  calculate(salary: BigInt, role: Role): BigInt;
}

@Injectable()
export class FlatCommissionStrategy implements CommissionStrategy {
  calculate(_salary: BigInt, role: Role): BigInt {
    return role.commValue;
  }
}

@Injectable()
export class PercentageCommissionStrategy implements CommissionStrategy {
  calculate(salary: BigInt, role: Role): BigInt {
    return (salary * role.commValue) / 100n;
  }
}

@Injectable()
export class CommissionService {
  constructor(
    private flat: FlatCommissionStrategy,
    private percent: PercentageCommissionStrategy,
  ) {}

  forRole(role: Role): CommissionStrategy {
    return role.commType === 'flat' ? this.flat : this.percent;
  }
}
```

---

### Factory pattern

**Use for**: creating complex domain objects with required defaults.

Most common case: creating a HireRequest, Placement, or Complaint where many fields have computed or default values.

```typescript
// placement.factory.ts
@Injectable()
export class PlacementFactory {
  constructor(private commission: CommissionService) {}

  fromHireRequest(req: HireRequest, role: Role, salary: BigInt, agentId: string): NewPlacement {
    const commissionAmount = this.commission.forRole(role).calculate(salary, role);
    return {
      workerId: req.workerId,
      employerId: req.employerId,
      roleId: role.id,
      salaryCents: salary,
      commissionCents: commissionAmount,
      stationId: req.stationId,
      finalizedByAgentId: agentId,
      startDate: new Date(),
      status: 'active',
      sourceHireRequestId: req.id,
    };
  }
}
```

---

### Specification pattern

**Use for**: complex filtering logic that's reused across endpoints.

The agent's "Browse Workers" page has 12+ filters. Don't pile this into the controller; encapsulate filter logic in a Specification class.

```typescript
// worker-filter.specification.ts
export class WorkerFilterSpecification {
  constructor(private readonly filters: WorkerFilter) {}

  toPrismaWhere(): Prisma.WorkerWhereInput {
    const where: Prisma.WorkerWhereInput = { deletedAt: null, available: true };

    if (this.filters.search) {
      where.OR = [
        { name: { contains: this.filters.search, mode: 'insensitive' } },
        { bio: { contains: this.filters.search, mode: 'insensitive' } },
        // ...
      ];
    }
    if (this.filters.roleId) {
      where.workerRoles = { some: { roleId: this.filters.roleId } };
    }
    if (this.filters.minTier) where.tier = { gte: this.filters.minTier };
    if (this.filters.gender) where.gender = this.filters.gender;
    if (this.filters.language) where.languages = { has: this.filters.language };
    if (this.filters.religion) where.religion = this.filters.religion;
    if (this.filters.minExperience) where.experienceYears = { gte: this.filters.minExperience };
    // ...
    return where;
  }
}
```

The repository accepts a Specification, calls `toPrismaWhere()`, and runs the query. Centralizes the logic and makes it testable in isolation.

---

### Use Case (Command) pattern (optional but encouraged)

For complex multi-step operations with multiple side effects, encapsulate in a UseCase class instead of a long Service method.

Example: `FinalizePlacementUseCase`:
1. Validate hire request is in correct state
2. Verify both parties are at station (operationally true; we trust the agent)
3. Verify payment reference is recorded
4. Calculate commission
5. Create placement record
6. Mark worker as not-available
7. Mark hire request as completed
8. Generate agreement PDF
9. Emit events
10. Return the placement

When a method is doing more than 4-5 things, break it into a UseCase with sub-methods.

```typescript
@Injectable()
export class FinalizePlacementUseCase {
  async execute(input: FinalizePlacementInput): Promise<Placement> {
    const req = await this.fetchAndValidateRequest(input.hireRequestId);
    const commission = await this.calculateCommission(req, input.salary);
    await this.recordPayment(req, input.paymentRef, input.paymentMethod);
    const placement = await this.createPlacement(req, input, commission);
    await this.markWorkerUnavailable(req.workerId);
    await this.completeHireRequest(req.id);
    await this.generateAgreement(placement);
    this.events.emit('placement.finalized', { placementId: placement.id });
    return placement;
  }
  // private methods for each step
}
```

---

### Result type pattern (optional)

For operations where failure is expected and not exceptional (e.g., search-then-insert), return `Result<T, E>` instead of throwing:

```typescript
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
```

Don't overuse this. Default to throwing for genuinely exceptional things (DB connection lost, invariant violated).

---

### Anti-patterns to avoid

- **Anemic services**: services that just delegate every method to the repository. If your service is `return this.repo.findById(id)`, the controller can call the repo directly OR you don't need the layer.
  - Wait — *do* keep the service layer for consistency. But the service should add value: validation, authz, event emission.

- **God services**: a single `WorkerService` with 40+ methods. Split into multiple services or use cases when a service exceeds ~12 methods.

- **Manager / Helper / Util classes**: vague names that accumulate everything. Be specific.

- **Static methods on classes**: just write functions. TypeScript classes-with-only-static-methods are awkward.

- **Returning Prisma types from services**: leaks ORM detail upward. Always map to domain types.

- **Throwing strings**: throw typed exceptions.

- **Conditional types on dynamic data**: keeps the type system useful only as long as the data is static. Use type guards instead.

---

## Frontend patterns

### Container / Presenter split

Smart components (data fetching) and dumb components (rendering). The dumb component receives data via props and is easily testable in Storybook.

```typescript
// HireRequestList.tsx — presenter
export function HireRequestList({ requests, onSelect }: Props) {
  if (!requests.length) return <EmptyState />;
  return (
    <ul>
      {requests.map(r => <HireRequestRow key={r.id} request={r} onClick={() => onSelect(r)} />)}
    </ul>
  );
}

// HireRequestListContainer.tsx — container
export function HireRequestListContainer() {
  const { data, isLoading } = useHireRequestsQuery({ status: 'awaiting_visit' });
  const select = (r: HireRequest) => navigate(`/hire-requests/${r.id}`);
  if (isLoading) return <Skeleton />;
  return <HireRequestList requests={data ?? []} onSelect={select} />;
}
```

---

### TanStack Query hook conventions

```typescript
// features/workers/api.ts
export const workersApi = {
  list: (filter: WorkerFilter) => apiClient.get<Worker[]>('/workers', { params: filter }),
  byId: (id: string) => apiClient.get<Worker>(`/workers/${id}`),
  create: (data: CreateWorkerData) => apiClient.post<Worker>('/workers', data),
  update: (id: string, patch: UpdateWorkerData) => apiClient.patch<Worker>(`/workers/${id}`, patch),
};

export const workerKeys = {
  all: ['workers'] as const,
  lists: () => [...workerKeys.all, 'list'] as const,
  list: (filter: WorkerFilter) => [...workerKeys.lists(), filter] as const,
  details: () => [...workerKeys.all, 'detail'] as const,
  detail: (id: string) => [...workerKeys.details(), id] as const,
};

export function useWorkersQuery(filter: WorkerFilter) {
  return useQuery({
    queryKey: workerKeys.list(filter),
    queryFn: () => workersApi.list(filter),
  });
}

export function useWorkerQuery(id: string) {
  return useQuery({
    queryKey: workerKeys.detail(id),
    queryFn: () => workersApi.byId(id),
    enabled: !!id,
  });
}

export function useCreateWorkerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: workerKeys.lists() }),
  });
}
```

The query key factory pattern (`workerKeys`) means cache invalidation is precise and bug-free.

---

### Form pattern

```typescript
const schema = z.object({
  name: z.string().min(2).max(100),
  fayda: z.string().regex(/^F-\d{4}-\d{4}-[A-Z]{2}$/),
  // ...
});
type FormValues = z.infer<typeof schema>;

export function WorkerRegistrationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', fayda: '' },
  });
  const mutation = useCreateWorkerMutation();

  const onSubmit = form.handleSubmit(values => mutation.mutate(values));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <FormField name="name" /* ... */ />
        <FormField name="fayda" /* ... */ />
        <Button type="submit" disabled={mutation.isPending}>Register</Button>
      </form>
    </Form>
  );
}
```

---

## Error handling philosophy

### Backend

- **Validation errors** (bad request shape) → 400, returned as a structured array of `{ path, message }`.
- **Auth errors** → 401 (no session) / 403 (session but not authorized).
- **Not found** → 404.
- **Business rule violations** (e.g., "worker is not available") → 409 Conflict, with a `code` field that frontend can switch on.
- **Server errors** → 500, logged to Sentry, message hidden from user (generic "Something went wrong").

Every error response shape:

```json
{
  "error": {
    "code": "WORKER_NOT_AVAILABLE",
    "message": "The selected worker is currently in another placement",
    "details": [],
    "traceId": "abc123"
  }
}
```

### Frontend

- TanStack Query mutations return errors via `onError` callback. Show user-friendly toasts.
- Errors with known `code` values get translated to Amharic + English friendly messages.
- Unknown errors get a generic toast + log to Sentry.
- Form validation happens client-side via Zod, but server-side validation is the source of truth.

---

## Testing patterns

See `qa-testing.md` for the full strategy. The pattern principle:

- **Unit tests**: services and pure functions. Mock the repository.
- **Integration tests**: full module — controller → service → repository → in-memory or test database.
- **E2E tests**: real user flows in Playwright, against a fully running stack with seed data.

Coverage targets:
- Services: 90%+
- Controllers: doesn't matter (thin)
- Repositories: covered by integration tests, not units
- Frontend feature components: 70%+

---

## Code organization patterns

### File naming

- TypeScript files: `kebab-case.ts` (e.g., `hire-requests.service.ts`)
- React components: `PascalCase.tsx` (e.g., `HireRequestList.tsx`)
- Test files: same name + `.test.ts` (e.g., `hire-requests.service.test.ts`)

### Folder naming

- Modules: `kebab-case` plural (e.g., `hire-requests/`)
- Inside a module: `controllers/`, `services/`, `repositories/`, `dto/`, `entities/`, `events/`, `tests/`

### Import order

1. Node built-ins
2. External packages
3. `@wez/*` internal packages
4. Relative imports (`../`, `./`)

ESLint's `import/order` rule enforces this.

### Export patterns

- Prefer **named exports** over default exports. Default exports are confusing in renames.
- Each file exports its primary thing + tightly-coupled types. If you're exporting more than 3 things, split the file.

---

## When to refactor

- **Three uses make a pattern.** If you've copy-pasted the same logic three times, extract it.
- **Don't refactor on the first pass** — get it working, then think about where it should live.
- **Don't refactor speculatively.** YAGNI applies. Build for today's needs, refactor when tomorrow's needs arrive.
- **Refactoring should not change behavior.** Tests should pass before and after with no test changes.

---

## Common gotchas in NestJS + Prisma

- **Circular module dependencies**: NestJS won't allow them. If you hit this, you've discovered a missing module — extract the shared concern.
- **Prisma's `findFirst` vs `findUnique`**: `findUnique` requires a unique key in the where clause; use it when you have one (e.g., by ID). `findFirst` for everything else, including soft-delete filters.
- **Prisma's `BigInt`**: needs special JSON serialization. We have a global `BigIntInterceptor` that handles this.
- **Async constructors**: don't. Use NestJS lifecycle hooks (`OnModuleInit`) for async initialization.
- **Decorators on private methods**: don't work. Make the method public or wrap it.

---

## Versioning and deprecation

- API routes are versioned via URL: `/api/v1/workers`. We start with `v1`.
- When breaking changes are needed, introduce `v2` alongside `v1`. Migrate frontends. Remove `v1` only after 90+ days.
- Database migrations are forward-only. To "rollback," create a new migration that undoes.
- Deprecate fields by adding a `deprecated` JSDoc comment + a runtime warning log when accessed. Remove only after all clients have migrated.

---

## Performance patterns

- **Pagination by default.** Any list endpoint accepts `?page` + `?limit` (default 20, max 100). Never return unbounded lists.
- **N+1 query prevention.** Use Prisma's `include` and `select` carefully. Add a unit test that counts queries when you've got a complex relation.
- **Indexes**: see `database-design.md`.
- **Cache aggressively but invalidate carefully.** TanStack Query handles frontend caching. For backend, use Redis with TTL for: feature flags, role/commission config, station lists.
- **Skip work when possible.** Conditional emails, conditional re-renders, conditional re-queries.

---

## Security patterns

- **Defense in depth**: never trust frontend. Re-validate on backend.
- **Audit log everything administrative**. Use `@AuditLog('action_name')` decorator on the controller method.
- **Mask PII in logs.** Phone numbers, Fayda, names should be masked in any log line: `Hanna T**`, `+251****567`, `F-3429-****-AA`.
- **Time-limit signed URLs** for files (15 min default).
- **Rate limit** auth endpoints aggressively. Rate limit search endpoints moderately.
- **CSRF protection** is enabled by default in Better Auth's middleware.
- **Input validation always**. Even fields the user "shouldn't be able to change" — they can.

---

## What good looks like

- Module folder is < 12 files. If bigger, there's probably a sub-module hiding.
- Service method is < 30 lines. If longer, extract sub-methods or move to a UseCase.
- Component is < 200 lines. If longer, extract.
- Test files mirror source 1:1.
- Pull requests change one thing.
- README in each module explains what it does in 3-5 sentences.

---

## What questionable looks like

- A method named `process`, `handle`, `manage`, `do`. Be specific.
- A class with no clear single responsibility.
- A test that mocks 5+ things — likely the unit under test is doing too much.
- A function that takes 7+ parameters — package them into an options object.
- Comments that explain *what* the code does instead of *why*.

---

## Final principle

**Convention over configuration.** A new developer should be able to drop in and find their way around because every module looks the same. Don't surprise the next person reading the code.
