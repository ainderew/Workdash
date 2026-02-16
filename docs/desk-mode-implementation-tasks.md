# Desk Mode Implementation Task Packets

Purpose:
- Break the Desk Mode + production chat initiative into isolated tasks that can be executed in separate sessions/PRs with minimal context pollution.

Execution rules:
- One task packet per branch/PR.
- Do not expand scope beyond the packet.
- Each packet must produce a short handoff note in `docs/desk-mode-handoffs/<task-id>.md`.
- For code packets: run `npm run lint` after each feature step; run `npm run lint && npm run build` before packet completion.

---

## Packet 00: Contracts and Naming Lock

ID: `desk-00-contracts`

Goal:
- Lock product terms and protocol naming to prevent churn.

Scope:
- Confirm and freeze:
  - Mode names: `2D Mode`, `Desk Mode`
  - Protocol namespace: `chat:v2:*`
  - Legacy bridge policy: `sendMessage/newMessage` adapter only

Files:
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-architecture-plan.md`

Done when:
- Naming and protocol terms are finalized in plan doc.
- No conflicting labels remain.

---

## Packet 01: Prisma Chat Schema

ID: `desk-01-prisma-schema`

Goal:
- Add durable chat schema to media server DB.

Scope:
- Add models:
  - `ChatWorkspace`, `ChatRoom`, `ChatRoomMembership`, `ChatMessage`, `ChatAttachment`, `ChatReadCursor`, `ChatInvite`, `OutboxEvent`
- Add indexes and uniqueness constraints for idempotency and ordering.
- Create migration and ensure migration applies cleanly.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/*`

Done when:
- Migration runs successfully against local Postgres.
- Prisma client generation passes.
- Model constraints reflect architecture plan.

---

## Packet 02: Chat Repositories and Domain Service Skeleton

ID: `desk-02-chat-repos`

Goal:
- Introduce repository/service layer for v2 chat domain.

Scope:
- Add repositories for rooms/messages/memberships/read-cursors/outbox.
- Add `ChatV2Service` methods (no socket wiring yet):
  - list rooms
  - list messages
  - create message (persist + outbox record in one transaction)
- Include permission checks by role.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/*`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`

Done when:
- Service methods callable from unit-like integration script or temporary route.
- Transactional outbox write verified for `createMessage`.

---

## Packet 03: Socket Gateway v2 (Read Path)

ID: `desk-03-socket-read`

Goal:
- Ship room-aware read/list socket APIs for Desk Mode.

Scope:
- Add handlers:
  - `chat:v2:room:list`
  - `chat:v2:room:join`
  - `chat:v2:message:list`
- Join sockets to room channels for fanout.
- Add protocol negotiation metadata on connect (`chatProtocolVersion`).

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`

Done when:
- Client can list rooms/messages and join room socket channel.
- Unauthorized room access is denied server-side.

---

## Packet 04: Socket Gateway v2 (Write Path + Idempotency)

ID: `desk-04-socket-write`

Goal:
- Ship durable message send/edit/delete mutations with idempotency.

Scope:
- Add handlers:
  - `chat:v2:message:create`
  - `chat:v2:message:edit`
  - `chat:v2:message:delete`
  - `chat:v2:read:update`
- Enforce `clientMessageId` uniqueness logic.
- Return canonical message payload with DB IDs and timestamps.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`

Done when:
- Duplicate sends with same `clientMessageId` return existing message.
- Messages are persisted before any emits.

---

## Packet 05: Outbox Worker

ID: `desk-05-outbox-worker`

Goal:
- Publish outbox events reliably with retries and status tracking.

Scope:
- Add background worker loop to process `OutboxEvent` rows.
- Exponential backoff and dead-letter/failure marking policy.
- Metrics counters and structured logging.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/workers/outbox.worker.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/outbox.service.ts`

Done when:
- Pending events are published and marked `PUBLISHED`.
- Failed publishes are retried and observable.

---

## Packet 06: Broker Integration (NATS JetStream)

ID: `desk-06-broker`

Goal:
- Wire outbox publisher and realtime fanout through broker.

Scope:
- Add NATS JetStream client integration.
- Define subjects (e.g., `chat.message.created`).
- Add consumer that emits `chat:v2:message:new` to room sockets.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/*`
- `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/.env` docs and bootstrap notes

Done when:
- Persisted message -> outbox -> broker -> websocket fanout path works end-to-end.
- Broker downtime does not lose persisted messages.

---

## Packet 07: Legacy Bridge (2D + Desk Parallel Interop)

ID: `desk-07-legacy-bridge`

Goal:
- Ensure 2D chat clients and Desk mode clients communicate in the same room.

Scope:
- Map legacy inbound `sendMessage` to v2 create path.
- Emit both event formats from same persisted source:
  - `chat:v2:message:new` for v2
  - `newMessage` for v1
- No separate legacy write path.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/_enums.ts`

Done when:
- Player in 2D mode and player in Desk mode can chat bi-directionally in same room.
- Only one persisted `ChatMessage` row per send.

---

## Packet 08: Desk Mode Toggle and Route State

ID: `desk-08-mode-toggle`

Goal:
- Add mode switch and persistent mode state.

Scope:
- Add `interactionMode` in UI store (`world|desk`).
- Add mode switch button in controls.
- Persist in URL query and local storage.
- Pause/unmount Phaser when in Desk mode.

Files:
- `/Users/AndrewPinon/projects/workdash/src/common/store/uiStore.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`

Done when:
- Mode can switch without page reload.
- World rendering/input is paused in Desk mode.

---

## Packet 09: Desk Mode UI Shell

ID: `desk-09-desk-shell`

Goal:
- Build Desk mode frame with room list and message panel.

Scope:
- Add components:
  - `DeskLayout`, `GuildRail`, `ChannelSidebar`, `RoomHeader`, `MessageList`, `Composer`, `MemberPanel`
- Integrate with v2 read/list handlers.

Files:
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/*`
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`

Done when:
- User can select room and read/send messages in Desk mode shell.

---

## Packet 10: Room Management and Access UI

ID: `desk-10-room-management`

Goal:
- Add room creation and membership controls.

Scope:
- Create room modal.
- Join/leave actions.
- Role-based controls visibility.
- Invite flow (if included in this packet).

Files:
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/*`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`

Done when:
- Room creation and access restrictions work end-to-end.

---

## Packet 11: File Upload Durability

ID: `desk-11-files`

Goal:
- Replace base64 socket image path with object-storage attachment flow.

Scope:
- Add upload-init API and signed upload URL generation.
- Client direct-upload then message-create with attachment keys.
- Persist `ChatAttachment` metadata.
- Render signed download URLs in clients.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/src/routes/chat.route.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/controllers/chat.controller.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`
- `/Users/AndrewPinon/projects/workdash/src/communication/textChat/*` (legacy bridge updates)

Done when:
- Attachments survive reconnect and server restarts.
- No base64 payloads used in message transport.

---

## Packet 12: Reliability and Observability Hardening

ID: `desk-12-reliability`

Goal:
- Make operation production-safe on single VM.

Scope:
- Add metrics/logging for:
  - outbox backlog
  - publish failures
  - duplicate dedupe rate
  - send latency p95
- Add dashboard and basic alerts.
- Add runbook docs for broker/db outages.

Files:
- `/Users/AndrewPinon/projects/workdash-media-server/docs/*`
- `/Users/AndrewPinon/projects/workdash-media-server/src/_utils/*`
- deployment config (`docker-compose`, systemd, or equivalent)

Done when:
- Oncall can detect and diagnose delivery issues quickly.

---

## Packet 13: Migration and Decommission

ID: `desk-13-migration`

Goal:
- Transition safely from v1 chat to v2 while preserving interop.

Scope:
- Add telemetry report for v1/v2 client mix.
- Run staged rollout with feature flags.
- Remove legacy code only after adoption threshold is met.

Done when:
- v2 is default and stable.
- Legacy adapter can be turned off without user-visible regression.

---

## Suggested session order
1. `desk-00-contracts`
2. `desk-01-prisma-schema`
3. `desk-02-chat-repos`
4. `desk-03-socket-read`
5. `desk-04-socket-write`
6. `desk-05-outbox-worker`
7. `desk-06-broker`
8. `desk-07-legacy-bridge`
9. `desk-08-mode-toggle`
10. `desk-09-desk-shell`
11. `desk-10-room-management`
12. `desk-11-files`
13. `desk-12-reliability`
14. `desk-13-migration`

## Session template to avoid context pollution
- Input to each session:
  - Task packet ID
  - exact files in scope
  - done criteria
- Output from each session:
  - changed files
  - decisions made
  - unresolved risks
  - handoff note path
