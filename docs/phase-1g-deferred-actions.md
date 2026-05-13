# Phase 1G Deferred Actions

This file tracks Phase 1G items that are intentionally deferred because they need paid provider accounts, production infrastructure, or a later deployment target.

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

