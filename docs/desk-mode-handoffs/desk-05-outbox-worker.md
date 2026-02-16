# Packet Handoff: desk-05-outbox-worker

## Packet ID
- `desk-05-outbox-worker`

## Branch
- Frontend repo: `main`
- Media-server repo: `main`

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/outbox.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/outbox.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/workers/outbox.worker.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`

## API / Socket Contract Changes
- No external API contract changes in this packet.
- Added backend outbox processing loop that claims pending outbox rows and processes them asynchronously.

## Migration / Env Changes
- None in this packet.

## Validation Commands + Results
- `npm run lint` (media-server): passed
- `npm run build` (media-server): passed

## Operational Behavior Added
- Outbox claim strategy uses SQL `FOR UPDATE SKIP LOCKED` with lease-based `availableAt` update to reduce duplicate processing.
- Retry policy:
  - exponential backoff + jitter
  - `PENDING` retry scheduling until `maxAttempts`
  - terminal transition to `FAILED` after max attempts
- Worker logs batch processing summaries and periodic idle heartbeats with backlog stats.
- Worker starts with server boot and stops during `SIGTERM`/`SIGINT` graceful shutdown.

## Risks / Follow-ups
- Publisher is currently a no-op implementation to keep outbox plumbing isolated; `desk-06-broker` must replace it with NATS JetStream publish implementation.
- No dead-letter payload storage yet beyond `FAILED` status; consider adding last-error metadata if needed for ops triage.
