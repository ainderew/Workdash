# Packet Handoff: desk-06-broker

## Packet ID
- `desk-06-broker`

## Branch
- Frontend repo: `main`
- Media-server repo: `main`

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/package.json`
- `/Users/AndrewPinon/projects/workdash-media-server/package-lock.json`
- `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-broker.types.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/nats-jetstream.client.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-outbox.publisher.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/docs/nats-jetstream-bootstrap.md`

## API / Socket Contract Changes
- No new socket command names.
- `chat:v2` write handlers no longer emit directly from gateway; realtime fanout now comes from broker-consumed outbox events.
- Broker fanout emits:
  - `chat:v2:message:new`
  - `chat:v2:message:update`
  - `chat:v2:message:delete`

## Migration / Env Changes
- Added `nats` dependency.
- Added NATS JetStream runtime env support (documented in `docs/nats-jetstream-bootstrap.md`):
  - `NATS_SERVERS`
  - `NATS_STREAM_NAME`
  - `NATS_SUBJECT_PATTERN`
  - `NATS_CONSUMER_DURABLE`
  - `NATS_CLIENT_NAME`
  - `NATS_MAX_RECONNECT_ATTEMPTS`
  - `NATS_RECONNECT_WAIT_MS`
  - `NATS_CONSUMER_START_POLICY`
  - `NATS_NAK_DELAY_MS`

## Validation Commands + Results
- `npm run lint` (media-server): passed
- `npm run build` (media-server): passed

## Operational Behavior Added
- Media-server now initializes NATS JetStream on startup and fails fast if broker init fails.
- Outbox publisher uses JetStream publish with `msgID=eventId` for dedupe-friendly semantics.
- Durable JetStream consumer fans out chat events to room socket channels.
- Graceful shutdown now stops outbox worker, drains consumer, disconnects broker, and closes HTTP server.

## Risks / Follow-ups
- Legacy bridge (`sendMessage/newMessage` adapter-only) is still pending in `desk-07-legacy-bridge`.
- Frontend v2 store/UI packets are still pending; v2 events are server-ready but not yet fully consumed by Desk Mode UI.
