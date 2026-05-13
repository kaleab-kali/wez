# Deferred Actions

This file tracks items that are intentionally deferred because they need paid provider accounts, production infrastructure, a later deployment target, or a separately approved module scope.

## Phase 1H Training

- Training is deferred from the current Phase 1H implementation.
- Later scope: course catalog, instructors, in-person batches, enrollment, payment capture at HQ, completion records, certificate generation, and tier-upgrade events.
- Do not count training completion numbers in MoLS reports as operationally complete until the training module is implemented and wired to real course enrollment records.
- Worker certificate search is deferred until certificates exist as real training completion records.

## Phase 1H Government Report Queueing

- Current state: government report generation is functionally complete but synchronous.
- Later: move government report generation into a BullMQ queue backed by Redis.
- Keep the existing government_reports row as the durable status record: pending, ready, filed, error.
- Keep generated report files attached through the existing file/storage contract with 90-day report retention.
- Add UI polling or background refresh for queued report status once asynchronous generation is introduced.

## Phase 1H Search Performance

- Current state: worker, job, and employer search use Postgres full-text search in repository queries.
- Later: add committed GIN indexes for the exact FTS expressions once schema churn slows enough for migration files.
- Add a 10k-row search fixture and benchmark worker/job/employer search against the Phase 1H target of relevant results in under 200ms.
- If Postgres FTS cannot meet the target after indexing, revisit the documented Phase 3 option for Meilisearch or Elasticsearch.

## External Providers

- SMS delivery: add an Afromessage adapter once the account, sender identity, and API credentials are available.
- Email delivery: add a Resend adapter once the sending domain, DNS records, and API credentials are available.
- Keep the current disabled/dev providers for local development so business workflows can still enqueue and inspect notifications without spending money.

## Queueing And Retry

- Replace the current scheduled database polling dispatcher with a BullMQ queue backed by Redis.
- Keep the notification table as the durable outbox record.
- Ensure provider delivery jobs are idempotent so retries do not send duplicate SMS or email messages.

## Storage

- Render deployment now: use the local disk storage driver with `STORAGE_ROOT` pointed at a Render Persistent Disk mount.
- VPS deployment later: add an S3-compatible storage driver for MinIO or another S3-compatible object store.
- Keep the file API contract stable: upload slot, upload bytes, finalize, download URL/content.

## Idempotency

- Current state: idempotency is enforced in the API with database-backed keys and 24-hour expiry.
- Later: move hot idempotency reads/writes to Redis while preserving the same key + user + endpoint hash contract.
- Add integration tests for replay, in-progress duplicate requests, and key reuse against a different payload.

## Security Tests

- Add tests proving notification sockets cannot join another user's room.
- Add tests proving unauthenticated file content requests return 401.
- Add tests proving station agents cannot read files outside their station scope.
- Add tests proving global staff roles can read only through explicit role-based access rules.
