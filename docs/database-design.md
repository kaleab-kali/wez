# Wez Platform — Database Design Guidelines

This document defines schema conventions, indexing strategy, security, and performance practices for the Postgres database.

---

## Conventions — non-negotiable

### Naming

- **Tables**: `snake_case`, plural (`workers`, `hire_requests`, `audit_events`).
- **Columns**: `snake_case` singular (`first_name`, `created_at`).
- **Enums**: `snake_case`, suffix with `_enum` if the enum name doesn't naturally describe a state (`tier_enum` ok, `status` better since "status" implies enum).
- **Foreign keys**: `<table_singular>_id` (e.g., `worker_id`, `employer_id`).
- **Junction tables**: alphabetical join (`worker_roles`, not `roles_workers`).
- **Indexes**: `idx_<table>_<columns>` (e.g., `idx_hire_requests_employer_id_status`).
- **Unique constraints**: `uq_<table>_<columns>`.
- **Check constraints**: `chk_<table>_<rule>` (e.g., `chk_workers_age_positive`).

### Column standards

Every table has these columns:

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at        TIMESTAMPTZ NULL                       -- soft delete
created_by_id     UUID NULL REFERENCES users(id)
updated_by_id     UUID NULL REFERENCES users(id)
```

`updated_at` is maintained by a trigger, never manually.

### Money

All money is stored as `BIGINT` representing cents (birr × 100). Column suffix `_cents`:

```sql
salary_cents          BIGINT NOT NULL
commission_cents      BIGINT NOT NULL
fee_cents             BIGINT NOT NULL
```

Never use `NUMERIC` or `DECIMAL` for money. Never use `FLOAT` or `DOUBLE` for money. Ever.

### Timestamps

Always `TIMESTAMPTZ`. Never `TIMESTAMP` (without timezone). Never store dates as strings.

For dates without time: `DATE` is fine (e.g., placement start_date).

### Booleans

`BOOLEAN NOT NULL DEFAULT false`. Never nullable booleans — three-state booleans are usually a bug. If you really need three states, use an enum.

### Strings

- Short identifiers, codes: `VARCHAR(N)` with explicit limit
- Free-form text (bios, descriptions, notes): `TEXT`
- Phone, fayda, email: `VARCHAR` with format check constraint or app-level validation

### JSON

Use `JSONB` (not `JSON`). Index with GIN if queried.

Use sparingly. JSON is for "this column has variable-shape data we don't query much." If you find yourself querying inside JSON often, move to columns.

### Enums

Use Postgres `CREATE TYPE x AS ENUM` for values that genuinely never grow. For values that might grow (role categories, complaint types), use a lookup table — easier to extend without migration ceremony.

```sql
CREATE TYPE worker_tier AS ENUM ('basic', 'verified', 'trained', 'trusted');
CREATE TYPE hire_request_status AS ENUM ('awaiting_visit', 'completed', 'cancelled', 'expired');
```

When adding a value to an enum: `ALTER TYPE x ADD VALUE 'new_value';`. Postgres does this without table rewrite.

---

## Core schema

This is the Phase 1 schema. Every entity is illustrated. Phase 2/3 additions are noted at the bottom.

### users (auth identity)

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20)  UNIQUE,
  password_hash   TEXT,                 -- nullable for OTP-only accounts
  role            VARCHAR(50) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  -- Better Auth handles sessions in its own tables
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
```

### workers

```sql
CREATE TABLE workers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE REFERENCES users(id),  -- null for agent-managed-only workers
  full_name         VARCHAR(200) NOT NULL,
  fayda             VARCHAR(20) NOT NULL,
  phone             VARCHAR(20) NOT NULL,
  date_of_birth     DATE,
  gender            VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F')),
  area              VARCHAR(50) NOT NULL,             -- woreda
  bio               TEXT,
  religion          VARCHAR(30),                       -- nullable, opt-in
  languages         VARCHAR(20)[] NOT NULL DEFAULT '{}',
  experience_years  INT NOT NULL DEFAULT 0,
  tier              VARCHAR(20) NOT NULL DEFAULT 'basic',
  hop_flag          VARCHAR(20) NOT NULL DEFAULT 'none',
  has_health_card   BOOLEAN NOT NULL DEFAULT false,
  has_police_clearance BOOLEAN NOT NULL DEFAULT false,
  tin               VARCHAR(20),
  available         BOOLEAN NOT NULL DEFAULT true,
  registered_by_agent_id UUID REFERENCES users(id),
  registered_at_station_id UUID REFERENCES stations(id),
  rating_average    NUMERIC(3,2),                     -- average; computed
  placements_count  INT NOT NULL DEFAULT 0,           -- denormalized counter
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_workers_fayda ON workers(fayda) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_phone ON workers(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_area ON workers(area) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_tier_available ON workers(tier, available) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_languages ON workers USING GIN (languages);
```

### roles (commission catalog)

```sql
CREATE TABLE roles (
  id              VARCHAR(50) PRIMARY KEY,            -- e.g., 'barista', 'house_maid'
  name            VARCHAR(100) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  comm_type       VARCHAR(10) NOT NULL CHECK (comm_type IN ('flat', 'percent')),
  comm_value      INT NOT NULL,                        -- birr or % * 100 if percent
  salary_min_cents BIGINT NOT NULL,
  salary_max_cents BIGINT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### worker_roles (many-to-many)

```sql
CREATE TABLE worker_roles (
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  role_id     VARCHAR(50) NOT NULL REFERENCES roles(id),
  PRIMARY KEY (worker_id, role_id)
);
CREATE INDEX idx_worker_roles_role_id ON worker_roles(role_id);
```

### employers

```sql
CREATE TABLE employers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES users(id),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('business', 'household')),
  name          VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(200),
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(255),
  area          VARCHAR(50) NOT NULL,
  -- business
  tin           VARCHAR(20),
  business_license VARCHAR(50),
  -- household
  fayda         VARCHAR(20),
  rating        VARCHAR(10) NOT NULL DEFAULT 'green' CHECK (rating IN ('green','yellow','orange','red')),
  placements_count INT NOT NULL DEFAULT 0,
  complaints_count INT NOT NULL DEFAULT 0,
  registered_by_agent_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  -- Conditional NOT NULL via check constraints
  CONSTRAINT chk_employer_business_fields CHECK (
    type != 'business' OR (tin IS NOT NULL AND business_license IS NOT NULL)
  ),
  CONSTRAINT chk_employer_household_fields CHECK (
    type != 'household' OR fayda IS NOT NULL
  )
);
CREATE UNIQUE INDEX uq_employers_tin ON employers(tin) WHERE tin IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_employers_type_rating ON employers(type, rating) WHERE deleted_at IS NULL;
```

### stations

```sql
CREATE TABLE stations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  woreda       VARCHAR(50) NOT NULL,
  address      TEXT NOT NULL,
  phone        VARCHAR(20),
  active       BOOLEAN NOT NULL DEFAULT true,
  supervisor_user_id UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### agent_assignments (which agents work at which stations)

```sql
CREATE TABLE agent_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  station_id    UUID NOT NULL REFERENCES stations(id),
  active        BOOLEAN NOT NULL DEFAULT true,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ
);
CREATE INDEX idx_agent_assignments_user_active ON agent_assignments(user_id) WHERE active = true;
```

### jobs

```sql
CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id     UUID NOT NULL REFERENCES employers(id),
  role_id         VARCHAR(50) NOT NULL REFERENCES roles(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  salary_min_cents BIGINT NOT NULL,
  salary_max_cents BIGINT NOT NULL,
  location        VARCHAR(50) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','filled')),
  posted_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_jobs_employer_status ON jobs(employer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_role_status ON jobs(role_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_location ON jobs(location) WHERE status = 'open' AND deleted_at IS NULL;
```

### hire_requests

```sql
CREATE TABLE hire_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id         UUID NOT NULL REFERENCES employers(id),
  worker_id           UUID NOT NULL REFERENCES workers(id),
  role_id             VARCHAR(50) NOT NULL REFERENCES roles(id),
  job_id              UUID REFERENCES jobs(id),         -- optional, may not be tied to a posting
  proposed_salary_cents BIGINT NOT NULL,
  station_id          UUID NOT NULL REFERENCES stations(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'awaiting_visit'
                        CHECK (status IN ('awaiting_visit','completed','cancelled','expired')),
  channel             VARCHAR(10) NOT NULL CHECK (channel IN ('online','in_person')),
  note                TEXT,
  source_referral_id  UUID REFERENCES referrals(id),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 days'),
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hire_requests_employer_status ON hire_requests(employer_id, status);
CREATE INDEX idx_hire_requests_worker_status ON hire_requests(worker_id, status);
CREATE INDEX idx_hire_requests_station_status ON hire_requests(station_id, status);
CREATE INDEX idx_hire_requests_expires_at ON hire_requests(expires_at) WHERE status = 'awaiting_visit';
```

### placements (the canonical hire record)

```sql
CREATE TABLE placements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_request_id       UUID UNIQUE REFERENCES hire_requests(id),
  worker_id             UUID NOT NULL REFERENCES workers(id),
  employer_id           UUID NOT NULL REFERENCES employers(id),
  role_id               VARCHAR(50) NOT NULL REFERENCES roles(id),
  station_id            UUID NOT NULL REFERENCES stations(id),
  finalized_by_agent_id UUID NOT NULL REFERENCES users(id),
  start_date            DATE NOT NULL,
  end_date              DATE,
  salary_cents          BIGINT NOT NULL,
  commission_cents      BIGINT NOT NULL,
  payment_method        VARCHAR(20) NOT NULL,
  payment_reference     VARCHAR(100) NOT NULL,
  payment_received_at   TIMESTAMPTZ NOT NULL,
  agreement_pdf_url     TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','ended','disputed','cancelled')),
  ended_reason          VARCHAR(50),
  rating_by_employer    NUMERIC(2,1),
  rating_by_worker      NUMERIC(2,1),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_placements_worker ON placements(worker_id, status);
CREATE INDEX idx_placements_employer ON placements(employer_id, status);
CREATE INDEX idx_placements_role ON placements(role_id);
CREATE INDEX idx_placements_start_date ON placements(start_date);
CREATE INDEX idx_placements_station ON placements(station_id);
```

### complaints

```sql
CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filed_by_type   VARCHAR(20) NOT NULL CHECK (filed_by_type IN ('worker','employer')),
  filed_by_id     UUID NOT NULL,                        -- worker_id or employer_id
  against_type    VARCHAR(20) NOT NULL CHECK (against_type IN ('worker','employer')),
  against_id      UUID NOT NULL,
  placement_id    UUID REFERENCES placements(id),
  station_id      UUID REFERENCES stations(id),         -- which station took the complaint
  taken_by_agent_id UUID REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,
  severity        VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high')),
  description     TEXT NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','mediating','closed','referred_external')),
  resolution      TEXT,
  closed_at       TIMESTAMPTZ,
  closed_by_id    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_complaints_against ON complaints(against_type, against_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_severity ON complaints(severity);
CREATE INDEX idx_complaints_filed_by ON complaints(filed_by_type, filed_by_id);
```

### tickets (internal escalation)

```sql
CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_by_id  UUID NOT NULL REFERENCES users(id),
  category      VARCHAR(30) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  priority      VARCHAR(10) NOT NULL CHECK (priority IN ('low','medium','high','urgent')),
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','resolved','closed','escalated_higher')),
  assigned_to_id UUID REFERENCES users(id),
  resolution    TEXT,
  resolved_at   TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id, status);
CREATE INDEX idx_tickets_raised_by ON tickets(raised_by_id);
```

### courses, instructors, course_batches, course_enrollments

```sql
CREATE TABLE courses (
  id                  VARCHAR(20) PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  category            VARCHAR(50) NOT NULL,
  description         TEXT NOT NULL,
  mode                VARCHAR(20) NOT NULL CHECK (mode IN ('online','in_person','hybrid')),
  duration_label      VARCHAR(50) NOT NULL,
  fee_cents           BIGINT NOT NULL,
  online_module_count INT NOT NULL DEFAULT 0,
  in_person_hours     INT NOT NULL DEFAULT 0,
  unlocks_role_ids    VARCHAR(50)[] NOT NULL DEFAULT '{}',
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instructors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES users(id),
  name          VARCHAR(200) NOT NULL,
  expertise     VARCHAR(100) NOT NULL,
  bio           TEXT,
  phone         VARCHAR(20),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     VARCHAR(20) NOT NULL REFERENCES courses(id),
  instructor_id UUID REFERENCES instructors(id),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  seats_total   INT NOT NULL,
  seats_filled  INT NOT NULL DEFAULT 0,
  location      VARCHAR(100) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_batches_status_start ON course_batches(status, start_date);

CREATE TABLE course_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID NOT NULL REFERENCES workers(id),
  course_id       VARCHAR(20) NOT NULL REFERENCES courses(id),
  batch_id        UUID REFERENCES course_batches(id),
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_received BOOLEAN NOT NULL DEFAULT false,
  payment_reference VARCHAR(100),
  online_progress_pct INT NOT NULL DEFAULT 0,
  in_person_attended_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  passed          BOOLEAN,
  certificate_issued_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, course_id)
);
CREATE INDEX idx_enrollments_worker ON course_enrollments(worker_id);
CREATE INDEX idx_enrollments_course_completed ON course_enrollments(course_id, completed_at);
```

### audit_events (immutable)

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID NOT NULL REFERENCES users(id),
  actor_role    VARCHAR(50) NOT NULL,
  action        VARCHAR(100) NOT NULL,        -- e.g., 'worker.created', 'placement.finalized'
  target_type   VARCHAR(50),
  target_id     UUID,
  station_id    UUID REFERENCES stations(id),
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,                          -- before/after for changes, extra context
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_events(target_type, target_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_events(action, created_at DESC);
-- Audit table is append-only. No UPDATE/DELETE permission for app user.
```

### notifications (outbound)

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('sms','email','in_app','push')),
  template_key    VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','failed','retry')),
  attempts        INT NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  failed_reason   TEXT,
  read_at         TIMESTAMPTZ,                  -- for in_app
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE channel = 'in_app';
CREATE INDEX idx_notifications_status ON notifications(status, created_at) WHERE status IN ('pending','retry');
```

### idempotency_keys

```sql
CREATE TABLE idempotency_keys (
  key             VARCHAR(100) NOT NULL,
  user_id         UUID NOT NULL REFERENCES users(id),
  endpoint        VARCHAR(255) NOT NULL,
  request_hash    VARCHAR(64) NOT NULL,
  response_status INT NOT NULL,
  response_body   JSONB NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, user_id, endpoint)
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

---

## Indexing strategy

**Add an index when:**
- A column is in `WHERE` of a frequent query
- A column is in `ORDER BY` of a frequent query
- A foreign key is queried (yes, FK indexes are not auto-created in Postgres)
- A unique constraint is needed

**Don't add an index when:**
- The table is small (< 1000 rows expected) and won't grow
- The column has very low cardinality (e.g., a boolean) UNLESS it's a partial index
- The query runs once a day in a job

**Partial indexes** (extremely useful):
- `WHERE deleted_at IS NULL` — every "active" lookup
- `WHERE status = 'awaiting_visit'` — for the agent queue
- `WHERE active = true` — for stations, courses, etc.

**Composite indexes**: leftmost-prefix matters. `(employer_id, status)` works for filtering by `employer_id` alone OR by both. It does NOT help filtering by `status` alone.

**Index maintenance**: review with `pg_stat_user_indexes` quarterly. Drop indexes with `idx_scan = 0` after 90 days.

---

## Constraints — defense in depth

Database constraints are the last line of defense. Even if app code is buggy, the DB shouldn't accept inconsistent data.

- **NOT NULL** liberally. Question every nullable column.
- **CHECK constraints** for value bounds: `age >= 14 AND age <= 100`.
- **UNIQUE constraints** for natural keys: phone, email, fayda.
- **FOREIGN KEY** with explicit `ON DELETE` action. Default: `NO ACTION` (i.e., refuse delete). Use `CASCADE` only for tightly-coupled child tables (e.g., `worker_roles`).
- **Multi-column CHECK** for cross-field rules: `chk_employer_business_fields`, `chk_dates_logical (start_date <= end_date)`.
- **Exclusion constraints** for time ranges if needed (e.g., a worker can't have two active placements simultaneously).

```sql
ALTER TABLE placements ADD CONSTRAINT chk_placement_dates
  CHECK (end_date IS NULL OR start_date <= end_date);
```

---

## Soft delete pattern

```sql
-- Every "active" query
SELECT * FROM workers WHERE id = ? AND deleted_at IS NULL;

-- Soft delete
UPDATE workers SET deleted_at = now(), updated_at = now() WHERE id = ?;

-- Restore
UPDATE workers SET deleted_at = NULL, updated_at = now() WHERE id = ?;
```

The repository layer applies the `deleted_at IS NULL` filter automatically. To opt out (e.g., for an admin "show deleted" view), use a separate method like `findIncludingDeleted`.

**Indexes** must include the partial filter to avoid bloat: `WHERE deleted_at IS NULL`.

---

## Migrations

- Forward-only. To "rollback," write a new migration that undoes.
- Run automatically on deploy in non-production. In production, run manually after review.
- Migration files are sequential, named `YYYYMMDDHHMMSS_description.sql` (Prisma generates this format).
- Every migration must be **safely re-runnable** if at all possible. Use `IF NOT EXISTS` / `IF EXISTS` guards.
- Avoid long-running migrations on large tables. Use `CREATE INDEX CONCURRENTLY`.
- For data migrations: write idempotent scripts that can be safely re-run.

**Pattern for adding a NOT NULL column to a large table**:

1. Migration A: `ADD COLUMN x VARCHAR(50);` (nullable initially)
2. Backfill data in batches (separate script, not migration)
3. Migration B: `ALTER COLUMN x SET NOT NULL;` after backfill is done
4. Migration C: `ALTER COLUMN x SET DEFAULT 'value';` if needed

Don't combine these in one migration. A single failure means a long, locked recovery.

---

## Performance — query patterns to avoid

### N+1 queries

```typescript
// BAD
const placements = await prisma.placement.findMany();
for (const p of placements) {
  const worker = await prisma.worker.findUnique({ where: { id: p.workerId } });
  // ...
}

// GOOD
const placements = await prisma.placement.findMany({
  include: { worker: true, employer: true, role: true },
});
```

Use Prisma's `include` or a join. Add a unit test that asserts query count for complex relations.

### SELECT * everything

Avoid `findMany()` without `select`. Specify only the columns you need. Especially important for tables with TEXT columns (bio, description).

### Unbounded queries

Every list query has pagination:

```typescript
async listForAgent(filter: WorkerFilter, page = 1, limit = 20): Promise<Paginated<Worker>> {
  const [items, total] = await Promise.all([
    prisma.worker.findMany({ where, take: limit, skip: (page - 1) * limit, orderBy: { createdAt: 'desc' } }),
    prisma.worker.count({ where }),
  ]);
  return { items, total, page, limit };
}
```

### Counter columns vs `count()`

For frequently-displayed counters (e.g., `placements_count` on workers), maintain a denormalized counter updated by triggers or in the service layer. Don't `COUNT(*)` on every page load.

---

## Triggers

Use sparingly. They're invisible to application logs.

Acceptable triggers:
- `updated_at` auto-update
- Counter maintenance (e.g., `placements_count` on workers)
- Audit log insertion (debatable; service-level is more visible)

Forbidden triggers:
- Business logic (validation, calculations)
- External service calls
- Anything that could fail silently

---

## Security at the database layer

### User permissions

Three Postgres roles:
- `wez_app` — DML only (SELECT, INSERT, UPDATE). No DDL. No TRUNCATE. Cannot modify `audit_events` after insert.
- `wez_migrate` — DDL + DML. Used only by migration runner.
- `wez_readonly` — SELECT only. For read replicas, analytics dashboards, BI tools.

### Row-level security (RLS)

In Phase 1, RLS is not strictly required (the app enforces auth). But enable RLS on sensitive tables now to prevent accidental leaks:

```sql
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY worker_self_read ON workers FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY agent_read_all ON workers FOR SELECT
  USING (current_setting('app.current_user_role', true) IN ('agent', 'station_supervisor', 'admin'));
```

Set the session variables on every request via middleware.

### PII columns — encryption at rest

The whole database disk is encrypted at rest (AWS RDS / DigitalOcean managed disk). Additionally, for high-sensitivity columns (`fayda`, `tin`, `religion`), consider application-level encryption using `pgcrypto` for an extra layer.

For Phase 1, disk encryption is sufficient. Application-level encryption is Phase 2+ if a compliance audit requires it.

### Backups

- Daily full backup, 30-day retention.
- Point-in-time recovery (WAL archiving) with 7-day window.
- Quarterly drill: restore latest backup to staging, verify integrity.
- Backups encrypted in transit and at rest.

---

## Money math — concrete rules

Money calculations happen in the application layer, but the database stores integer cents.

```typescript
// Calculating commission
const salaryCents = 5500_00n;     // birr 5,500.00
const commissionPercentage = 75;   // 75 % * 100? No - the comm_value is "75" meaning 75 percent

// For percentage commissions, comm_value is the percentage (1-100)
const commissionCents = (salaryCents * BigInt(role.commValue)) / 100n;

// For flat commissions, comm_value is birr (NOT cents — historical, simple)
// Convert when storing: const commissionCents = BigInt(role.commValue) * 100n;
```

**Storage rule for `roles.comm_value`**:
- If `comm_type = 'flat'`: `comm_value` = whole birr (e.g., 4000)
- If `comm_type = 'percent'`: `comm_value` = whole percent (e.g., 75)

Service layer converts to cents on calculation. UI displays user-friendly numbers.

---

## Phase 2 / 3 additions (don't build in Phase 1)

**Phase 2**:
- `referrals` table (agent-suggests-worker-to-employer flow)
- `interests` table (worker expresses job interest)
- `employer_subscriptions` table (recurring employers, optional)

**Phase 3**:
- `worker_app_devices` for push notification tokens
- `payment_transactions` table for Telebirr API integration
- `pension_contributions` for POESSA reporting
- Materialized views for analytics

---

## When in doubt

- Add the column nullable. Make it NOT NULL later.
- Keep tables under 30 columns. Split into related tables if growing.
- Normalize until it hurts; denormalize when it heals.
- Test migrations on a copy of production data before deploying.
- Read the Postgres docs on the specific feature you're using. Postgres has surprising features.

---

## Final principle

The database is the source of truth and the slowest thing to recover. Treat schema design with paranoia. **It's easier to add a constraint than to remove invalid data later.**
