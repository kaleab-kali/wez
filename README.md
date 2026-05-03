# wez

Multi-tenant SaaS for property management + CRM with RBAC.

## Stack

- **Backend:** NestJS 11 + PostgreSQL 16 + Prisma + Better Auth + BullMQ + Redis
- **Frontend:** React 19 + Vite + TanStack Router + TanStack Query + shadcn/ui
- **Monorepo:** pnpm workspaces + Turborepo
- **Deployment:** PM2 + Caddy (no Docker)

## Structure

```
apps/
  api/          # NestJS backend (Clean Architecture)
  web/          # React frontend
docs/           # Architecture, conventions, guides
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis 7+

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Set up database
pnpm db:push
pnpm db:generate

# Start development
pnpm dev
```

### Commands

```bash
pnpm dev              # Both API + Web (Turborepo)
pnpm dev:api          # API only (port 3000)
pnpm dev:web          # Web only (port 5173)
pnpm build            # Build all
pnpm lint             # Lint all

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema (dev)
pnpm db:studio        # Prisma Studio GUI
```

## Modules

| Module | Description |
|--------|-------------|
| Auth | Better Auth + RBAC + multi-tenancy |
| Property | Buildings, floors, units |
| Lease | Residential + commercial lease lifecycle |
| CRM | Unified contacts, activity tracking, automation |
| Maintenance | Work orders, preventive maintenance, inspections |
| Procurement | Purchase requests, approvals, POs |
| Sales | Listings, pipeline, deals, commissions |
| Finance | Invoicing, payments, reporting |
| Notifications | In-app + email notifications |
| Reporting | Dashboards + custom reports |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Full feature map, flows, domain model
- [Coding Standards](docs/CODING_STANDARDS.md) - Naming, patterns, function signatures
- [Module Guide](docs/MODULE_GUIDE.md) - How to create a new backend module
- [API Conventions](docs/API_CONVENTIONS.md) - Endpoint patterns, response format
- [Frontend Conventions](docs/FRONTEND_CONVENTIONS.md) - React, TanStack patterns
- [Database Guide](docs/DATABASE_GUIDE.md) - Prisma schema rules, multi-tenancy
- [Permissions Guide](docs/PERMISSIONS_GUIDE.md) - RBAC system, roles, adding permissions

## License

Proprietary - NOVEK ICT Solutions
