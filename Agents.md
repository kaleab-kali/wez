#— wez

## Project overview

Wez is the digital platform for an **Ethiopian worker placement service**. Stations across Addis Ababa register workers (domestic, hospitality, retail) and employers (households, businesses), then agents broker placements between them. The system tracks the full lifecycle: registration, training, hire request, placement finalization, complaints, government reporting.

**Wez is single-tenant.** One Wez instance serves the whole company; there is NO `organizationId` scoping. Role-based access (worker / employer / agent / supervisor / hq_staff / admin) controls visibility.

## Domain summary (read [docs/modules.md](docs/modules.md) for full spec)

Core entities: `users`, `workers`, `employers`, `stations`, `roles` (commission catalog), `jobs`, `hire_requests`, `placements`, `complaints`, `tickets`, `courses`, `course_enrollments`, `audit_events`, `notifications`.

Phase 1 modules (MVP): auth + 2FA, worker registration & tier system, employer registration, hire requests, placements, complaints, stations, HQ tickets, in-person training, government reports (manual export), notifications (SMS+email+in-app), audit logging, files, basic search & analytics, i18n (Amharic+English), admin moderation, idempotency.

## Stack

NestJS 11 + React 19 + Vite + PostgreSQL 16 + Prisma 7 + Better Auth + BullMQ + Redis. Monorepo: pnpm workspaces + Turborepo. Deploy: PM2 + Caddy.

## Structure

```
apps/
├── api/           # NestJS backend (Clean Architecture per docs/system-design-patterns.md)
└── web/           # React frontend (TanStack Router + shadcn/ui)
docs/
├── modules.md                  # FULL FEATURE SPEC — read first for any new work
├── database-design.md          # SCHEMA — all Phase 1 tables, indexes, conventions
├── system-design-patterns.md   # PATTERNS — repo, service, strategy, factory, etc.
├── user-workflows.md           # FLOWS — happy paths + edge cases per role
├── qa-testing.md               # TESTS — unit/integration/E2E strategy
├── ui-design-system.md         # DESIGN — typography, spacing, components
├── API_CONVENTIONS.md          # API rules — URLs, errors, idempotency
├── CODING_STANDARDS.md         # Code rules — naming, patterns, TS rules
├── FRONTEND_CONVENTIONS.md     # React/TanStack/Vite rules
├── MODULE_GUIDE.md             # Step-by-step new-module template
└── PERMISSIONS_GUIDE.md        # Roles + permission matrix
```

## Ports

- API: `http://localhost:3005`
- Web: `http://localhost:5180`
- Swagger: `http://localhost:3005/api/docs`

## Commands

```bash
pnpm dev              # Both API + Web (Turborepo)
pnpm dev:api          # API only (port 3005)
pnpm dev:web          # Web only (port 5180)
pnpm build            # Build all
pnpm lint / lint:fix  # Biome check / auto-fix
pnpm typecheck        # tsc --noEmit across both apps
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations (committed)
pnpm db:push          # Push schema (dev — no migration file)
pnpm db:studio        # Prisma Studio GUI
pnpm db:seed          # Seed super admin + sample owner
```

## Read-before-you-write order

1. **[docs/modules.md](docs/modules.md)** — what to build, with phase markers (`[P1]`, `[P2]`, `[P3]`).
2. **[docs/database-design.md](docs/database-design.md)** — schema for the entity you're touching.
3. **[docs/system-design-patterns.md](docs/system-design-patterns.md)** — pattern to apply (repo / service / strategy / etc.).
4. **[docs/user-workflows.md](docs/user-workflows.md)** — edge cases for the flow.
5. **[docs/MODULE_GUIDE.md](docs/MODULE_GUIDE.md)** — folder structure for new module.
6. **[docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)** + **[docs/FRONTEND_CONVENTIONS.md](docs/FRONTEND_CONVENTIONS.md)** — code style.

If a request conflicts with these docs, surface it. Don't silently diverge.

## Hard rules

### General

- Use pnpm CLI to install packages — never edit `package.json` deps by hand.
- Never insert emoji into files. Use unicode codepoints if needed.
- Respect `.gitignore`.
- A branch / PR holds < 40 changed files. Split when over.
- Verify installed package versions before writing code that uses them.
- ALWAYS use import aliases: `#modules/*`, `#shared/*`, `#features/*`, `#routes/*`. shadcn keeps `@/components/ui/*`.
- Test small steps before moving on. The dev servers auto-reload.

### TypeScript

- `const` only. Never `let`/`var`.
- No `any` — use `unknown` and narrow.
- No magic numbers/strings — use `as const` objects or enums.
- No relative imports across modules — use aliases.
- No `console.log` — use NestJS `Logger` (backend) or `reportError` (frontend).
- No try/catch in controllers — `GlobalExceptionFilter` handles it.
- No `forEach` — use `for...of`.
- No `.then()` — use `async`/`await`.
- No file > 600 lines. No function > 100 lines (React components: 300).
- No default exports (except TanStack Router route files).
- No `index.ts` barrels.

### React

- Wrap every component in `React.memo` with `displayName`.
- `useCallback` for handlers, `useMemo` for derived values.
- Cleanup subscriptions / timers / listeners in `useEffect`.
- Use `AbortController` for cancellable fetches.
- Never set state from scroll/resize/keypress handlers.
- Always responsive (mobile / tablet / desktop). Worker app is mobile-first.
- TanStack Query for data fetching — never `useEffect` for fetching.
- TanStack Table for data tables.

### NestJS

- Every endpoint has Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`).
- Controllers thin — call service / use case only.
- DTOs with `class-validator`.
- `@RequirePermissions('resource:action')` + `@UseGuards(AuthGuard, RoleGuard, PermissionsGuard)` on protected routes.
- Modules communicate via service calls (when must succeed) or domain events (when side effect).
- Repositories implement domain repo interfaces. Map Prisma rows to domain types in mappers.

### Database

- Schema follows [docs/database-design.md](docs/database-design.md) exactly. snake_case tables, `id UUID DEFAULT gen_random_uuid()`, `created_at`/`updated_at`/`deleted_at TIMESTAMPTZ`, money as `BIGINT cents`, `BOOLEAN NOT NULL DEFAULT false`.
- Soft delete via `deleted_at`. Unique indexes filtered `WHERE deleted_at IS NULL`.
- No `organizationId` columns. Wez is single-tenant.
- Audit table is append-only.

### Git

- Single-line commit messages.
- `type(scope): description` — `feat(workers): add tier auto-upgrade job`.
- Commit when changes exceed 8 new files OR 10 edits.
- No "Co-Authored-By" footers.

## Multi-tenancy clarification

The current scaffolded code (Organization, Member, FeatureFlag, Plan, Subscription, etc.) is generic SaaS boilerplate from a starter template — NOT Wez. The Phase 1 implementation rip-and-replaces those models with the Wez domain per `docs/database-design.md`. Anything organization-related except possibly Better Auth's session bookkeeping should go.

## Auth instances

- **Tenant Better Auth** at `/api/auth/*` — workers, employers, agents, supervisors.
- **Admin Better Auth** at `/api/admin-auth/*` — HQ staff, compliance, super admin. Cookie prefix `wez_admin`.

## Testing

- **Unit**: Vitest. Mock repos. Cover services + pure utils.
- **Integration**: Vitest + real test DB. Cover controller → service → repo.
- **E2E**: Playwright. Cover ~30-50 critical flows.

Coverage targets: services 90%+, controllers irrelevant (thin), feature components 70%+.

Default to testing through the browser UI via Playwright when verifying a UI change. Do not curl the API as a substitute.

## Dev servers

API + Web auto-reload. Don't restart unless config changed (env vars, vite.config, ports).

## Your role

You write code, I test it. If I report a bug, fix it and ask me to verify.

Read files before changing them. Ask if unclear. Don't assume.

## Related slash commands (gstack)

`/browse`, `/qa`, `/qa-only`, `/investigate`, `/review`, `/ship`, `/codex`, `/cso`, `/design-review`, `/plan-eng-review`, `/plan-design-review`, `/health`, `/retro`, `/learn`. Use `/browse` for all web browsing. Verify gstack installed: `test -d ~/.claude/skills/gstack/bin && echo OK`.
