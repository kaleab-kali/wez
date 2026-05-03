# Wez Frontend Conventions

React 19 + Vite + TanStack Router (file-based) + TanStack Query + shadcn/ui + Tailwind 4. Better Auth client for sessions.

## Route files (TanStack Router)

Route files are thin — just the route definition and a component handle.

```typescript
// src/routes/_authenticated/workers/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { WorkerList } from '#features/workers/components/WorkerList';

export const Route = createFileRoute('/_authenticated/workers/')({
	component: () => <WorkerList />,
});
```

Route segments enforce auth: `_authenticated/*` for any logged-in user, `admin/*` for HQ console (separate Better Auth instance), `_role/*` if role-specific.

## Feature folder structure

Each feature lives under `src/features/<feature>/`:

```
src/features/workers/
├── api/
│   ├── worker-queries.ts        # query keys factory + useQuery wrappers
│   └── worker-mutations.ts      # useMutation wrappers
├── components/
│   ├── WorkerList.tsx
│   ├── WorkerProfileCard.tsx
│   └── RegisterWorkerWizard/
│       ├── index.tsx
│       ├── StepIdentity.tsx
│       ├── StepSkills.tsx
│       └── StepVerification.tsx
└── types/
    └── worker.ts
```

No `index.ts` barrels. Import each file directly: `import { WorkerList } from '#features/workers/components/WorkerList'`.

## Query keys factory

Mandatory pattern. Cache invalidation depends on it.

```typescript
export const workerKeys = {
	all: ['workers'] as const,
	lists: () => [...workerKeys.all, 'list'] as const,
	list: (filter: WorkerFilter) => [...workerKeys.lists(), filter] as const,
	details: () => [...workerKeys.all, 'detail'] as const,
	detail: (id: string) => [...workerKeys.details(), id] as const,
};
```

## Mutations always invalidate

```typescript
onSuccess: () => qc.invalidateQueries({ queryKey: workerKeys.lists() }),
```

When invalidating a single detail page, invalidate `workerKeys.detail(id)` too.

## API client

All HTTP via `#shared/lib/api-client.ts`. Never `fetch` directly. Adds:
- Base URL from `VITE_API_URL`
- Auth cookie passthrough
- `Idempotency-Key` injection on POST/PATCH/DELETE
- `x-correlation-id` header
- Error normalization to `{ code, message, details, traceId }`

## Auth client

`#shared/lib/auth-client.ts` wraps Better Auth React hooks: `useSession`, `signIn`, `signUp`, `signOut`. Admin console uses `#shared/lib/admin-auth-client.ts` (separate Better Auth instance, prefix `wez_admin`).

## Forms

shadcn `Form` + `react-hook-form` + zod schemas.

```typescript
const schema = z.object({
	fullName: z.string().min(2).max(200),
	fayda: z.string().regex(/^F-\d{4}-\d{4}-[A-Z]{2}$/, 'Invalid Fayda format'),
	phone: z.string().regex(/^\+251\d{9}$/),
});
type Values = z.infer<typeof schema>;
```

## DataTable

`#shared/components/DataTable` wraps TanStack Table + TanStack Virtual for sortable, filterable, virtualized lists. Use it for every multi-row view (worker browse, complaint queue, audit log).

## i18n

`react-i18next`. Translation JSON in `src/i18n/{en,am}/<feature>.json`. Never hardcode user-visible strings.

```typescript
const { t } = useTranslation();
return <h1>{t('workers.list.title')}</h1>;
```

Locale switcher in `Topbar`. Stored in `localStorage` and synced to user `locale_pref` on next save.

## Loading states

shadcn `Skeleton` matched to final layout (table rows, card grid). Never spinner overlays for primary content.

## Error states

- TanStack Query errors → sonner toast via `onError`.
- Whole-route failure → `react-error-boundary` `ErrorBoundary` at route layout, with retry CTA.
- Field validation → inline beneath input via `<FormMessage />`.

## Real-time (notifications)

`#features/notifications/api/socket.ts` connects via socket.io to `${VITE_API_URL}/notifications`. Handler updates `notificationKeys.list` cache directly + toasts new items.

## Component rules

- Wrap with `React.memo` and set `displayName`.
- Pass stable callbacks via `useCallback`.
- Memoize derived values via `useMemo`.
- Components ≤ 300 lines. Extract subcomponents if longer.
- No state setting inside scroll/resize/keypress handlers.
- Make every component responsive (mobile, tablet, desktop). Worker app is mobile-first; admin/agent console is desktop-first.

## Import rules

- Feature: `import { X } from '#features/workers/components/WorkerList'`
- Shared: `import { api } from '#shared/lib/api-client'`
- Routes: `import { Route } from '#routes/...'`
- shadcn UI: `import { Button } from '@/components/ui/button'` (preserve `@` alias)
- Never relative `../../` across feature boundaries.

## Bilingual content

Wherever a user-facing string exists, render via `t(key)`. PDFs (placement agreement, certificates) generated server-side render Amharic + English side-by-side — frontend only triggers download.

## Worker app vs Agent console vs Admin console

Same Vite app, different route trees:
- `/login`, `/dashboard`, `/jobs`, `/training` — worker + employer app
- `/agent/*` — agent station console (desktop)
- `/admin/*` — HQ admin console (separate auth)

Layouts differ per route segment. Sidebar contents per role come from `getNavForRole(user.role)`.
