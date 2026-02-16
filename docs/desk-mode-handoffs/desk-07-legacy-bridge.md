# Packet Handoff: desk-07-legacy-bridge

## Packet ID
- `desk-07-legacy-bridge`

## Branch
- Frontend repo: `main`
- Media-server repo: `main`

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.constants.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`

## API / Socket Contract Changes
- Legacy inbound `sendMessage` now routes into v2 persistence path (`ChatV2Service.createMessage`) using a default room (`mainmap-lobby` ID constant).
- Legacy outbound `newMessage` now emits from broker-consumed persisted events (not from direct legacy broadcast path).
- v2 write handlers remain `chat:v2:*`; direct gateway fanout removed so broker is the fanout source of truth.

## Migration / Env Changes
- No schema/env changes in this packet.

## Validation Commands + Results
- `npm run lint` (media-server): passed
- `npm run build` (media-server): passed

## Operational Behavior Added
- Server ensures a deterministic legacy workspace/room exists (`mainmap-lobby`) via upsert.
- All connected sockets auto-join the legacy room channel.
- Broker fanout emits:
  - `chat:v2:message:new` to v2 sockets
  - `newMessage` (legacy payload shape) to protocol v1 sockets in-room

## Risks / Follow-ups
- Legacy payload currently infers `gif` vs `image` by URL heuristics for `IMAGE` messages.
- `senderSocketId` in bridged legacy payload is synthetic (`user:<id>`) rather than actual socket id.
- Room-specific legacy mapping beyond `mainmap-lobby` is not yet implemented.
