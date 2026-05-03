# Wez Permissions Guide

Wez is single-tenant with role-based access. Sessions are issued by Better Auth (tenant) or Better Auth admin instance (HQ).

## Roles

| Role | Description | Auth instance |
|---|---|---|
| `worker` | Registered worker. Phone+OTP login. Can browse jobs, manage own profile, see own training/placements. | tenant |
| `employer_business` | Business employer. Email+password. Can post jobs, browse workers, file complaints, manage hires. | tenant |
| `employer_household` | Household employer. Phone+OTP. Limited UI vs business. | tenant |
| `agent` | Station agent. Email+password + 2FA. Registers workers/employers, finalizes placements, mediates complaints. | tenant |
| `station_supervisor` | Manages agents at one or more stations. Reviews escalations, approves manual overrides. | tenant |
| `hq_staff` | HQ functional manager (Ops, Compliance, HR, Finance, IT, Training). | admin |
| `compliance_officer` | Subset of HQ — handles `referred_external` complaints. | admin |
| `instructor` | Teaches courses. Sees own course batches, attendance, grades. | tenant |
| `admin` (super) | Full platform admin. Suspends/bans, edits config, role/commission catalog. | admin |

A user has exactly one role at a given time. Switching role requires logout + re-login as a different user.

## Permission model

Permission strings: `<resource>:<action>`.

Examples:
- `worker:read`, `worker:create`, `worker:update`, `worker:suspend`
- `placement:finalize`, `placement:end`
- `complaint:create`, `complaint:close`, `complaint:refer_external`
- `commission_config:update`
- `report:export`
- `audit:read`

Stored in `apps/api/src/modules/auth/permissions.ts` as a typed map of role → permission set. Source of truth is code; reviewed in PR.

## Backend: requiring permissions

Use `@Roles(...)` for coarse role checks and `@RequirePermissions(...)` for fine-grained:

```typescript
@Post()
@Roles('agent')
@RequirePermissions('placement:finalize')
@ApiOperation({ summary: 'Finalize a placement' })
finalize(@CurrentUser() user: User, @Body() dto: FinalizePlacementDto) {
	return this.useCase.execute(user, dto);
}
```

Guards:
- `AuthGuard` — checks valid session
- `RoleGuard` — reads `@Roles` decorator
- `PermissionsGuard` — reads `@RequirePermissions` decorator

Stack: `@UseGuards(AuthGuard, RoleGuard, PermissionsGuard)` at controller level.

## Backend: row-level / ownership checks (ABAC)

Permission strings authorize the action class. Object-level checks (e.g., "agent can only end placements at their assigned stations") happen in the service:

```typescript
async end(currentUser: User, placementId: string, dto: EndPlacementDto) {
	const placement = await this.repo.findById(placementId);
	if (!placement) throw new NotFoundException();

	const userStations = await this.assignmentsRepo.activeStationIdsForUser(currentUser.id);
	if (!userStations.includes(placement.stationId)) {
		throw new ForbiddenException({ code: 'NOT_YOUR_STATION' });
	}
	// ...
}
```

For reusable cross-module checks, write a guard: `StationOwnershipGuard`, `WorkerOwnershipGuard`.

## Frontend: gating UI

```typescript
import { useSession } from '#shared/lib/auth-client';
import { hasPermission } from '#shared/lib/permissions';

const { data: session } = useSession();
const canFinalize = hasPermission(session?.user.role, 'placement:finalize');

return <Button disabled={!canFinalize}>Finalize</Button>;
```

Frontend gating is UX only — backend always re-checks. Never trust the frontend.

## Adding a new permission

1. Add `<resource>:<action>` to the central permission map in `permissions.ts`.
2. Assign it to the role(s) that should have it.
3. Use `@RequirePermissions('<resource>:<action>')` on the controller method.
4. Add a frontend `hasPermission` check at any UI gating point.
5. Add a test that verifies the guard rejects users without the permission.

## Default permission matrix (Phase 1)

| Resource | worker | employer | agent | supervisor | admin |
|---|---|---|---|---|---|
| `worker:read` | own | none | yes | yes | yes |
| `worker:create` | no | no | yes | yes | yes |
| `worker:update` | own (limited) | no | yes | yes | yes |
| `worker:suspend` | no | no | no | flag only | yes |
| `employer:read` | no | own | yes | yes | yes |
| `employer:create` | no | no | yes | yes | yes |
| `placement:finalize` | no | no | yes | yes | yes |
| `placement:end` | no | request | yes | yes | yes |
| `complaint:create` | yes | yes | yes | yes | yes |
| `complaint:close` | no | no | yes (assigned) | yes | yes |
| `complaint:refer_external` | no | no | no | escalate | yes (compliance) |
| `commission_config:update` | no | no | no | no | yes |
| `audit:read` | no | no | no | own scope | yes |
| `report:export` | no | no | no | yes | yes |

(Full matrix in `permissions.ts`.)

## Sessions

- Tenant sessions: 30-day sliding expiration, 8h initial.
- HQ admin sessions: 8h fixed (no sliding) — re-auth required.
- 2FA cookie (HQ): trusted-device cookie valid 30 days.
- Sessions revocable via Settings → Sessions or admin force-logout.

## Audit

Every permission denial is logged with `actor_id`, `permission`, `target_type`, `target_id`. Three denials in 5 minutes for the same actor triggers a Sentry warning (potential probing).
