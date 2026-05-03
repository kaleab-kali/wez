# Wez API Conventions

Wez backend exposes one REST + WebSocket API consumed by the agent web app, employer/worker portals (Phase 2+), and the Admin/HQ console.

## URL pattern

- Base: `/api/v1/{resource}` (plural, kebab-case)
- Examples: `/api/v1/workers`, `/api/v1/hire-requests`, `/api/v1/placements`, `/api/v1/audit-events`
- Better Auth mounts at `/api/auth/*` (tenant) and `/api/admin-auth/*` (HQ)
- Health: `GET /health` (un-prefixed, used by PM2 / load balancer)

## HTTP methods

| Method | Purpose |
|---|---|
| `GET /resources` | list (paginated) |
| `GET /resources/:id` | single |
| `POST /resources` | create (Idempotency-Key required) |
| `PATCH /resources/:id` | partial update (Idempotency-Key required) |
| `DELETE /resources/:id` | soft delete |

`PUT` is rare — prefer `PATCH`.

## Pagination

Query params: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`. Default `limit=20`, max `100`.

## Filtering

Query params: structured filters per resource. Worker example: `?roleId=barista&minTier=2&hasHealthCard=true&woreda=bole`.

Free-text search: `?q=hanna`.

## Response format

Single item:
```json
{ "data": { "id": "abc123", "fullName": "Hanna T." } }
```

List:
```json
{
  "data": [{ "id": "abc123" }],
  "meta": { "total": 142, "page": 1, "limit": 20, "totalPages": 8 }
}
```

Error:
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

Frontend switches on `code`, never on `message`. Codes are stable; messages are localized.

## Status codes

- `200` success / `201` created / `204` no content
- `400` validation error
- `401` no session / `403` session but not authorized
- `404` not found
- `409` business rule conflict (e.g., worker not available)
- `429` rate-limited
- `500` unexpected — generic message, traceId logged

## Idempotency

Every state-changing endpoint accepts an `Idempotency-Key` header (UUID). Key + `user_id` + endpoint hash is stored, response cached 24h. Replay returns cached response without re-executing. Frontend generates one per submit action.

## Rate limiting

- Global: 60 req/min per IP (`@nestjs/throttler`)
- Auth endpoints: 5 attempts / 15 min per IP+email (per modules.md 1.1.1.3)
- OTP request: 3 / 15 min per phone
- Override per route: `@Throttle({ default: { ttl: 1000, limit: 3 } })`

## Correlation IDs

Every request gets `x-correlation-id` (auto-generated UUID if not provided). Same ID appears in response headers + every log line for that request.

## Versioning

URL versioning: `/api/v1/...`. Add `/api/v2/...` only on breaking change. `v1` retained ≥90 days after `v2` ships.

## Validation

`class-validator` decorators on DTOs. `ValidationPipe` configured globally with `whitelist: true, forbidNonWhitelisted: true, transform: true`. Unknown properties stripped.

## Compression

`compression` middleware enabled globally. All responses gzipped.

## Swagger

Every endpoint MUST have:
- `@ApiTags('ResourceName')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: xxx, description: '...' })`
- `@ApiBody({ type: DtoClass })` for POST/PATCH

Access dev docs: `http://localhost:3005/api/docs`.

## Localization

Backend returns `code` + raw English `message`. Frontend translates `code` → Amharic/English. Email/SMS templates have per-locale rows; user's `locale_pref` chooses which to send.

## File uploads

- Frontend requests pre-signed S3 PUT URL from API (`POST /api/v1/files/sign-put`)
- Direct upload to S3 from browser
- Frontend posts back to API to "finalize"; API verifies + virus-scans + persists `attachment` row
- Downloads: API returns short-lived signed URL (15 min) after permission check

## WebSocket

Socket.io namespace `notifications` at `ws://api/socket.io/`. Auth via `userId` in handshake. Client joins `user:<id>` room. Server emits `notification` and `badge` events.
