# Wez Module Creation Guide

How to add a new backend module (e.g., `complaints`, `tickets`, `placements`). Follow the same shape every time.

For higher-level patterns, see `system-design-patterns.md`.
For schema rules, see `database-design.md`.

## Folder shape

```
apps/api/src/modules/<feature>/
├── domain/
│   ├── entities/             # plain TS classes / types — Worker, HireRequest
│   ├── events/               # event payload types — HireRequestCreatedEvent
│   ├── value-objects/        # small immutable types — Money, Phone, Fayda
│   └── repositories/         # abstract repo interfaces — IWorkersRepository
├── application/
│   ├── commands/             # write use cases — CreateHireRequestUseCase
│   ├── queries/              # read use cases — ListWorkersUseCase
│   ├── services/             # orchestration — HireRequestsService
│   ├── strategies/           # algorithm variants — FlatCommissionStrategy
│   ├── factories/            # complex object creation — PlacementFactory
│   ├── specifications/       # filter/predicate logic — WorkerFilterSpecification
│   └── dto/                  # request/response shapes
├── infrastructure/
│   ├── repositories/         # Prisma repos implementing the interfaces
│   ├── mappers/              # row → domain mapping
│   └── gateways/             # WS gateways, external API adapters
├── presentation/
│   ├── controllers/          # HTTP controllers
│   └── validators/           # custom validation pipes if needed
└── <feature>.module.ts       # NestJS module wiring
```

## Steps

### 1. Define the domain types

In `domain/entities/<noun>.ts`, write a plain interface or class. No Prisma imports.

```typescript
export interface HireRequest {
	id: string;
	employerId: string;
	workerId: string;
	roleId: string;
	jobId: string | null;
	stationId: string;
	proposedSalaryCents: bigint;
	status: 'awaiting_visit' | 'completed' | 'cancelled' | 'expired';
	channel: 'online' | 'in_person';
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}
```

### 2. Define events

In `domain/events/<event>.ts`. Event names use dot notation: `<aggregate>.<verb>`.

```typescript
export type HireRequestCreatedEvent = { hireRequestId: string };
export type HireRequestExpiredEvent = { hireRequestId: string };
```

### 3. Define repository interface

In `domain/repositories/<noun>.repository.ts`. Lists only what the application layer needs.

```typescript
export interface IHireRequestsRepository {
	findById(id: string): Promise<HireRequest | null>;
	create(data: NewHireRequest): Promise<HireRequest>;
	update(id: string, patch: Partial<HireRequest>): Promise<HireRequest>;
	listExpiringBefore(when: Date): Promise<HireRequest[]>;
}
```

### 4. Implement Prisma repository

In `infrastructure/repositories/prisma-<noun>.repository.ts`. The mapper `toHireRequest(row)` lives here.

### 5. Write DTOs

In `application/dto/`. One file per shape: `create-hire-request.dto.ts`, `list-hire-requests.dto.ts`. Use `class-validator` + `@ApiProperty`.

### 6. Write the service / use case

In `application/services/<feature>.service.ts` for simple flows or `application/commands/<verb>-<noun>.use-case.ts` for multi-step ones. Inject the repo interface (NOT the Prisma class). Throw typed exceptions on rule violations. Emit events on side effects.

### 7. Write the controller

In `presentation/controllers/<feature>.controller.ts`. Apply `@UseGuards(AuthGuard, RoleGuard)`. Annotate with Swagger. Delegate to service.

### 8. Wire the module

```typescript
@Module({
	controllers: [HireRequestsController],
	providers: [
		HireRequestsService,
		{ provide: IHireRequestsRepository, useClass: PrismaHireRequestsRepository },
	],
	exports: [IHireRequestsRepository],
})
export class HireRequestsModule {}
```

### 9. Register in `app.module.ts`

Add to `imports`. Order doesn't matter; NestJS resolves DI graph.

### 10. Add Prisma models

Update `apps/api/prisma/schema.prisma`. Follow naming + column rules in `database-design.md` (snake_case `@@map`, `id`, `createdAt`, `updatedAt`, `deletedAt`, soft-delete-aware indexes).

### 11. Push schema + reseed

In dev: `pnpm db:push && pnpm db:seed`.
On staging/prod: `pnpm --filter api exec prisma migrate deploy` against committed migration files.

### 12. Tests

- `application/<service-or-use-case>.test.ts` — unit, mock the repo interface
- `presentation/<controller>.integration.test.ts` — full module wired, real DB
- `e2e/<flow>.spec.ts` — Playwright through the UI

See `qa-testing.md`.

## Cross-module communication

Modules communicate by:

1. Calling a service exposed by another module (when the operation must succeed)
2. Emitting / handling domain events (when it's a side effect that can fail without rolling back)

NEVER reach into another module's repositories directly. NEVER import Prisma rows across modules.

## Tenancy

Wez is **single-tenant**. Do not add `organizationId` to new tables. Scope queries by `stationId` or `userId` where appropriate (e.g., agent only sees hire requests for their stations).

## Idempotency

For any POST/PATCH/DELETE you add, ensure it's safe to replay with the same `Idempotency-Key`. The global idempotency middleware caches the response — if your handler has external side effects (sending SMS, calling Stripe), wrap them in an outbox pattern so they fire once even on retry.

## Audit

Annotate state-changing controller methods with `@AuditLog('hire_request.created')`. The interceptor records `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `metadata` (before/after for updates), `ip_address`, `user_agent`.
