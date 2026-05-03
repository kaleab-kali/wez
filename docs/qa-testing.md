# Wez Platform — QA & Testing Strategy

This document defines how the Wez platform is tested. Testing is not optional and not bolted on at the end. Every feature ships with appropriate tests, and the test pyramid stays balanced.

---

## Testing philosophy

- **Tests document behavior.** A reader of the test should understand what the system is supposed to do.
- **Tests are not for hitting coverage numbers.** They're for catching regressions and documenting design.
- **Test the contract, not the implementation.** Refactoring should not break tests.
- **The test pyramid matters.** Many fast unit tests, fewer integration tests, even fewer E2E tests.
- **Tests run fast.** A slow test suite gets ignored. Optimize relentlessly.
- **Failures are clear.** A failing test should immediately tell you what went wrong without a debugger.

---

## The test pyramid

```
              ╱╲
             ╱  ╲    E2E tests (Playwright)
            ╱────╲   ~30-50 critical flows
           ╱      ╲  Slow (5-10 min total)
          ╱        ╲
         ╱──────────╲ Integration tests
        ╱            ╲ ~200-300 across modules
       ╱              ╲ Medium (1-2 min total)
      ╱                ╲
     ╱──────────────────╲ Unit tests
    ╱                    ╲ ~1000+ across services
   ╱                      ╲ Fast (under 30 sec)
  ╱________________________╲
```

---

## Unit tests

### What they cover

- Service methods (business logic)
- Pure functions (formatters, validators, utilities)
- Strategy implementations
- Specifications
- Factories

### What they don't cover

- HTTP handlers (covered by integration tests)
- Database queries (covered by integration tests)
- React components (covered by component tests)
- Authentication / authorization flows (covered by integration tests)

### Tools

- **Vitest** for both backend and frontend.
- Mocking via `vi.mock()` and `vi.fn()`.
- Test data builders in `__fixtures__/` folders.

### Example unit test (backend service)

```typescript
// hire-requests.service.test.ts
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HireRequestsService } from './hire-requests.service';
import { HireRequestsRepository } from './hire-requests.repository';
import { WorkersRepository } from '../workers/workers.repository';
import {
  anAvailableWorker,
  anUnavailableWorker,
  aValidEmployer,
  aValidCreateDto,
  aCurrentUser,
} from '../../__fixtures__/builders';

describe('HireRequestsService', () => {
  let service: HireRequestsService;
  let hireRequestsRepo: ReturnType<typeof mockHireRequestsRepo>;
  let workersRepo: ReturnType<typeof mockWorkersRepo>;
  let events: EventEmitter2;

  beforeEach(async () => {
    hireRequestsRepo = mockHireRequestsRepo();
    workersRepo = mockWorkersRepo();
    events = { emit: vi.fn() } as unknown as EventEmitter2;

    const module = await Test.createTestingModule({
      providers: [
        HireRequestsService,
        { provide: HireRequestsRepository, useValue: hireRequestsRepo },
        { provide: WorkersRepository, useValue: workersRepo },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = module.get(HireRequestsService);
  });

  describe('create', () => {
    it('creates a hire request when worker is available', async () => {
      const worker = anAvailableWorker();
      workersRepo.findById.mockResolvedValue(worker);
      hireRequestsRepo.create.mockImplementation(async (data) => ({ id: 'hr-1', ...data }));

      const result = await service.create(aCurrentUser(), aValidCreateDto({ workerId: worker.id }));

      expect(result.status).toBe('awaiting_visit');
      expect(events.emit).toHaveBeenCalledWith(
        'hire_request.created',
        expect.objectContaining({ hireRequestId: 'hr-1' }),
      );
    });

    it('throws WORKER_NOT_AVAILABLE when worker is unavailable', async () => {
      workersRepo.findById.mockResolvedValue(anUnavailableWorker());
      await expect(service.create(aCurrentUser(), aValidCreateDto())).rejects.toMatchObject({
        response: { code: 'WORKER_NOT_AVAILABLE' },
      });
    });

    it('throws when worker does not perform the requested role', async () => {
      const worker = anAvailableWorker({ roles: ['barista'] });
      workersRepo.findById.mockResolvedValue(worker);
      await expect(
        service.create(aCurrentUser(), aValidCreateDto({ workerId: worker.id, roleId: 'driver' })),
      ).rejects.toThrow();
    });

    it('does not create when employer is in red rating', async () => {
      // ...
    });
  });
});
```

### Test data builders

Centralize test data construction. Don't hand-roll workers/employers/etc. in every test.

```typescript
// __fixtures__/builders.ts

export const anAvailableWorker = (overrides: Partial<Worker> = {}): Worker => ({
  id: 'w-1',
  fullName: 'Test Worker',
  fayda: 'F-0000-0000-AA',
  phone: '+251911000001',
  available: true,
  tier: 'verified',
  roles: ['barista'],
  area: 'Bole',
  experienceYears: 2,
  // ... all required fields with sensible defaults
  ...overrides,
});

export const anUnavailableWorker = (overrides: Partial<Worker> = {}) =>
  anAvailableWorker({ available: false, ...overrides });

export const aValidCreateDto = (overrides: Partial<CreateHireRequestDto> = {}) => ({
  workerId: 'w-1',
  roleId: 'barista',
  proposedSalary: 600_000n,
  stationId: 's-1',
  channel: 'online' as const,
  ...overrides,
});

// ... etc
```

### Coverage targets

- Services: **90%+** statements, 85%+ branches
- Pure functions: **100%** of exported functions tested
- Strategies / Specifications / Factories: **100%**
- Repositories: **don't unit-test directly** (covered by integration)

---

## Integration tests

### What they cover

- A full module: Controller → Service → Repository → real (test) database
- HTTP-level behavior: status codes, response shape, headers
- Authorization rules
- Cross-module interactions
- Database constraints and migrations

### Tools

- **Vitest** + `supertest` for HTTP
- A real Postgres instance via Docker (separate test database, recreated per run)
- Prisma migrations applied at test setup
- Seeds loaded for known fixtures

### Example integration test

```typescript
// hire-requests.integration.test.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { setupTestDatabase, seedTestData, loginAs } from '../../test-utils';

describe('Hire Requests API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/hire-requests', () => {
    it('creates a hire request as authenticated business employer', async () => {
      const session = await loginAs('employer-business-1');

      const response = await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .set('Cookie', session.cookie)
        .set('Idempotency-Key', 'test-key-1')
        .send({
          workerId: 'w-available-1',
          roleId: 'barista',
          proposedSalary: 600000,
          stationId: 's-1',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        status: 'awaiting_visit',
        channel: 'online',
        workerId: 'w-available-1',
      });
    });

    it('returns 409 when worker is not available', async () => {
      const session = await loginAs('employer-business-1');

      const response = await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .set('Cookie', session.cookie)
        .send({
          workerId: 'w-unavailable-1',
          roleId: 'barista',
          proposedSalary: 600000,
          stationId: 's-1',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('WORKER_NOT_AVAILABLE');
    });

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .send({ /* ... */ })
        .expect(401);
    });

    it('returns 403 when worker user tries to create hire request', async () => {
      const session = await loginAs('worker-1');
      await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .set('Cookie', session.cookie)
        .send({ /* ... */ })
        .expect(403);
    });

    it('is idempotent — same key returns same response', async () => {
      const session = await loginAs('employer-business-1');
      const payload = { /* valid */ };

      const first = await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .set('Cookie', session.cookie)
        .set('Idempotency-Key', 'idem-test-1')
        .send(payload);

      const second = await request(app.getHttpServer())
        .post('/api/v1/hire-requests')
        .set('Cookie', session.cookie)
        .set('Idempotency-Key', 'idem-test-1')
        .send(payload);

      expect(second.body.data.id).toBe(first.body.data.id);
      // Database should have only one record
      const count = await prisma.hireRequest.count({ where: { /* match */ } });
      expect(count).toBe(1);
    });

    it('writes an audit event on success', async () => {
      // ...
      const auditEvents = await prisma.auditEvent.findMany({
        where: { action: 'hire_request.create' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].targetType).toBe('hire_request');
    });

    it('emits hire_request.created event', async () => {
      // assert side effect: notification was queued
      const notifications = await prisma.notification.findMany({
        where: { templateKey: 'hire_request.created.worker_sms' },
      });
      expect(notifications).toHaveLength(1);
    });
  });

  describe('Pagination & filtering', () => {
    it('returns paginated list', async () => { /* ... */ });
    it('filters by status', async () => { /* ... */ });
    it('filters by station', async () => { /* ... */ });
  });
});
```

### Coverage targets

- Each module has integration tests covering: happy path, the 3-5 most likely error cases, authorization (right role allowed, others rejected), idempotency.
- Aim for ~10-20 integration tests per module.

---

## Frontend component tests

### What they cover

- Components in isolation
- User interactions (click, type, submit)
- Conditional rendering
- Accessibility basics

### What they don't cover

- Network behavior (mock TanStack Query)
- Routing (test in E2E)
- Multi-page flows (test in E2E)

### Tools

- **Vitest** + **React Testing Library**
- **MSW** (Mock Service Worker) for API mocking
- **@axe-core/react** for a11y assertions

### Example component test

```typescript
// HireRequestRow.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HireRequestRow } from './HireRequestRow';
import { aHireRequest } from '../__fixtures__/builders';

describe('HireRequestRow', () => {
  it('renders worker name and role', () => {
    const request = aHireRequest({
      worker: { name: 'Hanna Tesfaye' },
      role: { name: 'Barista' },
    });
    render(<HireRequestRow request={request} />);
    expect(screen.getByText('Hanna Tesfaye')).toBeInTheDocument();
    expect(screen.getByText(/Barista/)).toBeInTheDocument();
  });

  it('shows salary in formatted birr', () => {
    const request = aHireRequest({ proposedSalaryCents: 6_000_00n });
    render(<HireRequestRow request={request} />);
    expect(screen.getByText(/6,000.*birr/)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const request = aHireRequest();
    render(<HireRequestRow request={request} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('listitem'));
    expect(onSelect).toHaveBeenCalledWith(request);
  });

  it('renders status badge with correct variant for awaiting_visit', () => {
    const request = aHireRequest({ status: 'awaiting_visit' });
    render(<HireRequestRow request={request} />);
    expect(screen.getByText(/awaiting/i)).toBeInTheDocument();
  });
});
```

### Component test coverage targets

- Feature components: **70%+**
- Reusable UI primitives: **80%+** (they're used everywhere; bugs are expensive)
- Page-level components (containers): **don't test**, integration covers

---

## E2E tests (Playwright)

### What they cover

- Critical user flows from start to end
- Multi-page interactions
- Real authentication
- Cross-role interactions (e.g., employer creates hire request, agent finalizes)

### What they don't cover

- Edge cases (test in unit/integration)
- Visual design (use visual regression tools separately if needed)
- Performance (use synthetic monitoring)

### Tools

- **Playwright** with TypeScript
- Run against a real running stack (Docker compose)
- Seed data loaded before each test run
- Browsers: Chromium primary, Firefox+WebKit on CI for important flows

### Critical E2E flows (Phase 1)

The 30-50 flows that must work end-to-end:

**Auth (5)**
1. Agent logs in with email + password
2. Worker logs in with phone + OTP
3. Failed login locks account after 5 attempts
4. Logged-out user redirected from protected page to login
5. Session persists across page refreshes

**Worker registration (3)**
6. Agent registers a new worker (3-step wizard)
7. Agent attempts to register worker with duplicate Fayda → blocked
8. Agent uploads worker photo

**Worker browsing (4)**
9. Agent filters workers by role + tier + area
10. Agent uses "Religion" filter and sees results
11. Agent registers walk-in employer + browses workers on their behalf
12. Empty state shown when no workers match filters

**Job browsing (3)**
13. Agent browses jobs on behalf of a walk-in worker
14. Worker matches highlighted with green border
15. Agent creates candidate referral for a job

**Hire request lifecycle (5)**
16. Employer creates hire request from worker browse (Phase 2)
17. Agent sees hire request in queue
18. Agent finalizes placement from a hire request
19. Hire request expires after 5 days → workers/employer notified
20. Employer cancels hire request

**Placement (4)**
21. Agent finalizes placement (full wizard with payment)
22. Generated agreement PDF includes both parties' info
23. Worker becomes unavailable after placement
24. Placement ends → both parties prompted to rate

**Complaints (3)**
25. Worker files complaint at any station (not original)
26. Agent submits high-severity complaint → routed externally
27. Compliance Officer sees referred complaint in their queue

**Tickets (2)**
28. Agent submits help ticket → routed to correct HQ person by category
29. HQ resolves ticket → agent sees resolution

**Training (4) — Phase 3 mostly**
30. Worker enrolls in online course (P3)
31. Worker progresses through video → reading → quiz (P3)
32. Worker reserves seat in in-person batch
33. Course completion adds certificate + bumps tier

**Admin (3)**
34. Admin views HQ team org chart
35. Admin generates ERCA monthly report
36. Admin bans an employer → their pending hire requests cancelled

### Example E2E test

```typescript
// e2e/hire-request-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Hire request lifecycle', () => {
  test('agent finalizes placement from hire request', async ({ page }) => {
    // Login as agent
    await page.goto('/login');
    await page.fill('[name="email"]', 'agent1@wez.et');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/agent/dashboard');

    // Open queue
    await page.click('text=Pending Queue');
    await expect(page.locator('h1')).toContainText('Station Queue');

    // Find pending hire request
    const requestRow = page.locator('text=Hanna Tesfaye').first();
    await expect(requestRow).toBeVisible();

    // Open finalize wizard
    await page.click('text=Make a Placement');
    await page.click('text=Quick load from hire request');
    await page.click('text=Hanna Tesfaye');

    // Wizard: confirm worker
    await page.click('text=Continue');

    // Wizard: confirm employer
    await expect(page.locator('text=Sheraton Addis')).toBeVisible();
    await page.click('text=Continue');

    // Wizard: confirm role and salary
    await expect(page.locator('input[name="salary"]')).toHaveValue('6500');
    await page.click('text=Continue');

    // Wizard: payment
    await page.selectOption('select[name="paymentMethod"]', 'telebirr');
    await page.fill('input[name="paymentRef"]', 'TLBR-12345-67890');
    await page.click('text=Continue');

    // Wizard: confirm
    await page.click('text=Finalize placement');

    // Verify success
    await expect(page.locator('text=Placement created')).toBeVisible();

    // Verify worker is now unavailable in browse
    await page.click('text=Browse Workers');
    await page.fill('input[placeholder*="search"]', 'Hanna');
    await expect(page.locator('text=Hanna Tesfaye')).not.toBeVisible();
  });
});
```

### E2E discipline

- E2E tests are slow. Don't add 200 of them. Pick the ones that catch the most regressions.
- Each E2E test gets fresh seed data. No test pollutes state for the next.
- E2E run on CI before merge. If they're flaky, fix them; don't disable.
- Local E2E run is on-demand (developer triggers). Pre-merge CI is automated.
- E2E target: under 10 minutes total runtime. Parallelize across 3-4 browser shards.

---

## Manual testing

### When manual testing is required

- Visual / design changes
- Anything involving real third-party services (Telebirr, SMS provider) in test mode
- Accessibility flow (screen reader + keyboard nav)
- Translation accuracy (Amharic-speaker reviews)

### Manual test plans

Each major feature has a checklist. Stored in `/docs/manual-test-plans/<feature>.md`.

Example:

```markdown
# Manual test plan: Hire request lifecycle

## Pre-conditions
- [ ] Test database seeded
- [ ] At least 1 available worker, 1 active employer

## Test cases
- [ ] Employer logs in and sees dashboard
- [ ] Employer browses workers, filters work
- [ ] Employer clicks "Request hire" → form opens
- [ ] Form validates required fields
- [ ] On submit, success screen shown
- [ ] Email arrives at employer's address (if configured)
- [ ] SMS arrives at worker's phone (in dev: check logs)
- [ ] Hire request appears in agent's queue
- [ ] Agent can finalize as documented
- [ ] PDF generates with both parties' info, in Amharic + English
- [ ] Both parties can sign on tablet
```

---

## Testing fixtures and seed data

### Seed data structure

```
apps/api/prisma/seed/
├── seed.ts              # main entrypoint
├── data/
│   ├── stations.ts
│   ├── roles.ts
│   ├── courses.ts
│   ├── instructors.ts
│   ├── hq-staff.ts
│   ├── agents.ts
│   ├── workers.ts        # ~20-50 test workers
│   ├── employers.ts      # ~10-15 test employers
│   ├── jobs.ts
│   ├── hire-requests.ts
│   ├── placements.ts
│   ├── complaints.ts
│   └── tickets.ts
└── helpers/
    └── deterministic-uuid.ts  # for stable IDs across runs
```

Seeds are deterministic — same UUIDs every time. Tests reference workers by ID.

```typescript
// helpers/deterministic-uuid.ts
import { v5 as uuidv5 } from 'uuid';
const NS = '00000000-0000-0000-0000-000000000000';
export const seedId = (name: string) => uuidv5(name, NS);

// usage
export const HANNA_ID = seedId('worker-hanna-tesfaye');
```

### Seed levels

- **`pnpm seed:minimal`** — bare minimum (1 station, 1 agent, 1 worker, 1 employer). Used for E2E setup.
- **`pnpm seed:standard`** — typical dev environment (~50 workers, ~15 employers, varied data).
- **`pnpm seed:demo`** — rich data for showing the system to stakeholders.

---

## CI / CD pipeline

### Pre-merge checks (every PR)

1. `pnpm install` (cached)
2. `pnpm typecheck` — fail on any TS error
3. `pnpm lint` — fail on any error
4. `pnpm test:unit` — all unit tests
5. `pnpm test:integration` — all integration tests (Postgres in Docker)
6. `pnpm build` — apps build cleanly
7. `pnpm test:e2e:smoke` — top 10 critical E2E flows only

If any step fails, merge blocked.

### Post-merge checks (every merge to main)

8. `pnpm test:e2e:full` — all E2E tests
9. Deploy to staging
10. Smoke test against staging

### Pre-production-deploy checks

11. Manual sign-off (CEO or Operations Manager) for any change touching: payments, placements, complaints, government reports
12. Backup database
13. Run migrations
14. Deploy
15. Health check
16. Smoke test against production
17. Announce in Slack

---

## Performance tests

### What we measure

- API endpoint p50, p95, p99 latency
- Database query time for top 20 queries
- Frontend bundle size, LCP, TTI

### When to run

- Performance test suite runs nightly against staging
- Critical changes (new endpoint, new migration, large refactor) trigger ad-hoc run

### Tools

- **k6** for API load tests
- **Lighthouse CI** for frontend
- **pg_stat_statements** for query analysis

### Baseline expectations (Phase 1)

- API write endpoints: p99 < 1s
- API read endpoints: p99 < 500ms
- Database queries: max 200ms
- LCP: < 2.5s on 3G
- Bundle: < 500KB gzip main chunk

---

## Security tests

### Automated

- **Dependency scanning**: Dependabot + `pnpm audit` in CI
- **SAST** (static code analysis): GitHub CodeQL or Semgrep
- **Secret scanning**: `gitleaks` pre-commit hook
- **OWASP ZAP** for API surface scan (weekly cron on staging)

### Manual

- Quarterly penetration test (third party for production-critical changes)
- Authorization audit: spreadsheet of every endpoint × role, verify expected behavior
- IDOR (Insecure Direct Object Reference) audit: try to access another user's data with their ID

### What we look for

- SQL injection (Prisma protects, but verify dynamic queries)
- XSS (React escapes, but verify any `dangerouslySetInnerHTML`)
- CSRF (Better Auth + cookie sameSite handles, verify)
- Auth bypass (every protected route should 401/403 without session)
- IDOR (worker A can't read worker B's profile)
- Rate limit bypass
- Mass assignment (Zod schemas only allow expected fields)
- Path traversal in file uploads
- File upload type confusion

---

## What "we test enough" looks like

A feature is "tested enough" when:

- A reasonable unit test exists for each branch in the service
- An integration test covers the controller → DB happy path + 1-2 error cases
- A component test covers each interactive UI element
- An E2E test exists if it's a critical user flow
- A manual test plan exists if it's a UI-heavy feature
- The PR description includes "How tested" with what was verified

Conversely, **don't over-test**:

- Don't test trivial getters/setters
- Don't test that frameworks work (TypeScript, Prisma, NestJS)
- Don't test simple component renders without interaction
- Don't write E2E tests for every variant — pick the most likely flow

---

## When tests fail in production

1. Don't bypass tests. If a test fails, investigate.
2. If the test was wrong, fix the test in the same PR. Don't merge "we'll fix the test later."
3. If the test is flaky (passes/fails inconsistently), open a ticket and fix the flakiness, don't just retry.
4. If a test catches a real bug, congratulate the test writer.

---

## Test ownership

- The PR author writes the tests for their change.
- Reviewers check that tests exist and are appropriate.
- If a regression is caught in production that should have been caught by a test, the team retros and adds the test.

---

## Final principle

**The test suite is part of the product.** A change to behavior IS a change to tests. A test we wrote three months ago is documentation of an intent we may have forgotten. Treat tests with the same care as production code — same lint rules, same code review, same standard.
