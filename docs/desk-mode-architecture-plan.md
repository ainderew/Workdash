# Desk Mode Architecture Plan (Workdash)

## 1) Objective and Constraints

Goal:
- Add a new "Desk mode" UI that focuses on chat collaboration (rooms/channels, membership, file sharing) while preserving current 2D mode.
- Make chat durable and reliable with persistence and broker-backed delivery.

Current constraints:
- Deployment: single DigitalOcean VM.
- Database: PostgreSQL.
- Backend: Socket.IO + Express + Prisma.
- Current chat implementation is realtime broadcast only (`sendMessage` -> `newMessage`) and does not persist messages/files.

Important product note:
- "Exactly like Discord" should be interpreted as "Discord-like interaction model".
- Pixel-perfect cloning carries legal/brand risk. Implement equivalent UX behavior and IA, not copied proprietary branding/assets.

## 2) Current-State Findings (from code)

Frontend (`/Users/AndrewPinon/projects/workdash`):
- Chat is single global stream in `TextChatService` and `messagingStore`.
- No room/channel model in state.
- Image uploads are encoded as base64 data URLs sent over socket.
- `UiControls` currently opens a sidebar chat window.

Backend (`/Users/AndrewPinon/projects/workdash-media-server`):
- `ChatService` listens for `sendMessage`, broadcasts `newMessage` to all sockets.
- No DB tables/repositories for chat messages, rooms, membership, or attachments.
- No message broker integration.

## 3) Target Product Scope

### 3.1 Mode switch
- Add an explicit mode toggle: `2D Mode` <-> `Desk Mode`.
- Default behavior:
  - `2D Mode`: current Phaser office experience.
  - `Desk Mode`: full chat workspace layout.

Recommended UX:
- Keep mode in URL and persisted preference:
  - `/app?mode=world` and `/app?mode=discord`
  - local storage fallback for last mode
- While in Desk mode, pause Phaser update/render loop (or unmount game scene) to reduce CPU/GPU and prevent accidental movement/input.

### 3.2 Desk-mode IA
MVP layout:
- Left rail: workspace/server icon(s).
- Channel/category rail.
- Main message panel.
- Right member panel.
- Header with channel details and room actions.

MVP interactions:
- Create text channel/room.
- Join/leave room.
- Send/edit/delete messages.
- Upload files/images and render attachments.
- Unread badges and read cursors.

## 4) Data Model (PostgreSQL)

Add Prisma models (new migration set):

1. `ChatWorkspace`
- `id (uuid)`
- `name`
- `ownerUserId`
- `createdAt`, `updatedAt`

2. `ChatRoom`
- `id (uuid)`
- `workspaceId`
- `name`
- `slug`
- `type` (`TEXT`, later `VOICE`, `ANNOUNCEMENT`)
- `visibility` (`PUBLIC`, `PRIVATE`, `INVITE_ONLY`)
- `topic` nullable
- `isArchived` bool
- `createdByUserId`
- `createdAt`, `updatedAt`

3. `ChatRoomMembership`
- `roomId`
- `userId`
- `role` (`OWNER`, `ADMIN`, `MODERATOR`, `MEMBER`, `READ_ONLY`)
- `status` (`ACTIVE`, `INVITED`, `REMOVED`)
- `joinedAt`
- Unique `(roomId, userId)`

4. `ChatMessage`
- `id (uuid)`
- `roomId`
- `senderUserId`
- `clientMessageId` (idempotency key from client)
- `content` text
- `messageType` (`TEXT`, `IMAGE`, `FILE`, `SYSTEM`)
- `replyToMessageId` nullable
- `editedAt` nullable
- `deletedAt` nullable (soft delete)
- `createdAt`
- Unique `(roomId, senderUserId, clientMessageId)`
- Index `(roomId, createdAt DESC)`

5. `ChatAttachment`
- `id (uuid)`
- `messageId`
- `storageProvider` (`DO_SPACES`, `S3`, `LOCAL`)
- `objectKey`
- `originalFileName`
- `mimeType`
- `sizeBytes`
- `sha256`
- `isImage` bool
- `createdAt`

6. `ChatReadCursor`
- `roomId`
- `userId`
- `lastReadMessageId`
- `lastReadAt`
- Unique `(roomId, userId)`

7. `ChatInvite` (if invite-only required)
- `id (uuid)`
- `roomId`
- `createdByUserId`
- `code`
- `maxUses`, `uses`
- `expiresAt` nullable

8. `OutboxEvent`
- `id (uuid)`
- `aggregateType` (`CHAT_MESSAGE`, `CHAT_ROOM`, etc.)
- `aggregateId`
- `eventType`
- `payload` JSONB
- `status` (`PENDING`, `PUBLISHED`, `FAILED`)
- `attempts`
- `availableAt`
- `createdAt`, `updatedAt`

## 5) Realtime and Broker Architecture

### 5.1 Why broker if single VM
- Socket emission alone is transient and tied to process health.
- Broker + outbox gives durable event delivery, retries, and decoupling for notifications/search/audit consumers.

### 5.2 Recommended broker
Primary recommendation:
- NATS JetStream (single binary, low ops overhead, durable streams).

Alternative:
- RabbitMQ (also valid, slightly heavier operationally).

Given single VM and current stack, NATS JetStream is pragmatic for MVP durability.

### 5.3 Delivery pattern (required)
Use transactional outbox pattern:
1. Client sends `chat:message:create` with `clientMessageId`.
2. Server transaction:
- validate membership and permissions
- insert `ChatMessage`
- insert `ChatAttachment` metadata (if any)
- insert `OutboxEvent (PENDING)`
3. Commit transaction.
4. Outbox publisher loop publishes to broker and marks event `PUBLISHED`.
5. WebSocket fanout consumer emits to room subscribers.

This avoids "message persisted but not emitted" and "emitted but not persisted" split-brain issues.

### 5.4 Ordering and idempotency
- Ordering:
  - sort by `(createdAt, id)` per room for deterministic ordering.
  - optional later: per-room monotonic sequence if strict contiguous ordering is required.
- Idempotency:
  - enforce unique `(roomId, senderUserId, clientMessageId)`.
  - duplicate client retries return existing message object.

### 5.5 Production-quality messaging rules (non-negotiable)
1. Persist-first:
- No realtime fanout before durable write succeeds.
- `ChatMessage` insert must happen before any websocket emit.
2. Transactional outbox:
- Message write and outbox event write must be in one DB transaction.
- Outbox events are the only source for broker publish attempts.
3. Idempotent send API:
- Every client send includes `clientMessageId`.
- Server must upsert-or-return-existing on duplicate `clientMessageId`.
4. At-least-once delivery with dedupe:
- Broker and websocket consumers can redeliver.
- Client reducers must dedupe by `messageId` and `clientMessageId`.
5. Room-scoped ordering:
- Order by `(roomId, createdAt, id)` for reads and fanout.
- Never rely on socket arrival order for canonical ordering.
6. Reliable reconnect/backfill:
- On reconnect, fetch missing messages from DB using cursor (`before` or `after`).
- Socket stream is delta delivery only, not source of truth.
7. Attachment durability:
- No base64 image payloads in message events.
- Attachments are object-store keys + metadata persisted in DB.
8. Permissions on every mutation:
- Verify membership and role for create/edit/delete/join/invite.
- Reject unauthorized actions server-side even if UI hides controls.
9. Observability and SLO:
- Track publish lag, outbox backlog, failed sends, duplicate-rate, p95 send latency.
- Alert on outbox backlog growth and broker publish failure spikes.
10. Compatibility bridge discipline:
- Legacy `sendMessage/newMessage` is adapter-only.
- Legacy path must call v2 write path; no separate legacy persistence path.

## 6) File Persistence Strategy

Current issue:
- base64 images in socket payload are not durable, expensive, and hard to moderate.

Target:
- Direct upload flow with object storage.

Recommended provider:
- DigitalOcean Spaces (S3-compatible), not local disk.

Flow:
1. Client requests upload intent: `POST /api/chat/uploads/init` with metadata.
2. Server validates membership + quotas, returns pre-signed PUT URL + `objectKey`.
3. Client uploads directly to Spaces.
4. Client sends `chat:message:create` referencing uploaded `objectKey`.
5. Server stores attachment metadata and emits message event.

Security controls:
- Allowed mime types and size limits by room policy.
- Content sniffing and extension normalization.
- Optional async malware scan queue before exposing file.
- Signed read URLs with short TTL for private rooms.

## 7) Room and Access Management

Permission matrix (server-enforced):
- `OWNER/ADMIN`: manage room, membership, invite links, delete room.
- `MODERATOR`: manage messages and member moderation actions.
- `MEMBER`: read/write messages.
- `READ_ONLY`: read only.

Membership model:
- Public room: any workspace member can join.
- Private room: explicit membership only.
- Invite-only: join via tokenized invite code.

APIs/socket commands:
- `chat:room:create`
- `chat:room:update`
- `chat:room:archive`
- `chat:room:join`
- `chat:room:leave`
- `chat:room:invite:create`
- `chat:room:invite:redeem`
- `chat:room:member:setRole`

## 8) Frontend Architecture Changes

### 8.1 Mode state
- Add `interactionMode` to `uiStore`:
  - `"world" | "desk"`
- Add mode switch button in `UiControls` and in Desk mode header.
- Persist mode in URL + local storage.

### 8.2 Chat state v2
Replace global flat message store with room-scoped store:
- `roomsById`
- `roomOrder`
- `currentRoomId`
- `messagesByRoomId`
- `readCursorByRoomId`
- `typingByRoomId`

### 8.3 New UI modules
- `DeskLayout`
- `GuildRail`
- `ChannelSidebar`
- `RoomHeader`
- `MessageList`
- `Composer` (attachments + mentions)
- `MemberPanel`

### 8.4 Compatibility strategy
- Keep old `ChatWindow` operational in 2D mode initially.
- New socket namespace/event family for Desk mode (e.g., `chat:v2:*`).
- Feature flag to gate rollout.

### 8.5 Parallel-mode interoperability (required)
- 2D mode and Desk mode must share the same underlying chat domain model.
- Do not split chats by UI mode. Split only by `roomId`.
- Example: if Player 1 is in 2D mode and Player 2 is in Desk mode, both in `roomId=mainmap-lobby`, they must see each other's messages in real time.

Interop approach:
- Introduce a server-side compatibility adapter:
  - Legacy inbound `sendMessage` -> internally mapped to `chat:v2:message:create` targeting a default room for the player context.
  - `chat:v2:message:new` -> fanout as both:
    - v2 event to Desk-mode clients
    - legacy `newMessage` payload to 2D-mode clients
- Track socket capabilities at connect time:
  - `chatProtocolVersion = 1 | 2`
  - v1 sockets receive legacy payload shape
  - v2 sockets receive room-aware payloads
- During migration, source of truth is v2 persistence path only. Legacy path becomes an adapter, not a separate write path.

## 9) API and Event Contracts (v2)

Socket commands:
- `chat:v2:room:list`
- `chat:v2:room:join`
- `chat:v2:message:list` `{ roomId, before?, limit }`
- `chat:v2:message:create` `{ roomId, clientMessageId, content, attachments[] }`
- `chat:v2:message:edit`
- `chat:v2:message:delete`
- `chat:v2:read:update` `{ roomId, lastReadMessageId }`

Server push events:
- `chat:v2:room:upsert`
- `chat:v2:message:new`
- `chat:v2:message:update`
- `chat:v2:message:delete`
- `chat:v2:presence:update`
- `chat:v2:typing`

Legacy bridge events (temporary):
- Inbound `sendMessage` accepted during migration window.
- Outbound `newMessage` emitted for v1 clients from v2 persisted messages.
- Add mapping metadata server-side only (`roomId`, `messageId`) and strip for legacy client compatibility if needed.

REST endpoints:
- `POST /api/chat/uploads/init`
- `POST /api/chat/uploads/complete` (optional finalize)
- `GET /api/chat/rooms`
- `GET /api/chat/rooms/:id/messages`

## 10) Desk-mode Feature Backlog (Discord-inspired)

MVP (ship first):
- Mode switch
- Rooms/channels + room creation
- Membership and permissions
- Durable messages
- File uploads + attachment rendering
- Read/unread

Phase 2:
- Typing indicators
- Replies/threads
- Pin/unpin messages
- Reactions on messages
- Message search
- Role mentions (`@here`, `@role`)

Phase 3:
- Voice channels binding to existing media primitives
- Moderation queue and audit log
- Retention policies and legal hold exports

## 11) Rollout Plan (phased)

Phase 0: Foundation
- Add DB models + migrations.
- Add repositories/services.
- Add feature flags (`DESK_MODE_ENABLED`, `CHAT_V2_ENABLED`).

Phase 1: Durable messaging core
- Implement `chat:v2:message:create/list`.
- Transactional outbox + broker publisher + websocket consumer.
- Idempotency and retries.

Phase 1.5: v1/v2 bridge
- Implement legacy adapter (`sendMessage` -> v2 create).
- Dual fanout (`chat:v2:message:new` and `newMessage`) from the same persisted event.
- Add protocol negotiation and telemetry to measure active v1 vs v2 clients.

Phase 2: Rooms and access
- Create/list/join rooms.
- Permission checks and invite flow.
- Room-scoped unread/read cursor.

Phase 3: Files
- Spaces integration + pre-signed upload.
- Attachment metadata persistence.
- Signed download URL path.

Phase 4: Desk-mode UI
- Add mode toggle.
- Build Desk layout tied to v2 APIs.
- Keep world mode intact.

Phase 5: Migration and cleanup
- Route old chat into default room or leave as legacy.
- Deprecate old `sendMessage/newMessage` once adoption reaches target.

## 12) Ops and Reliability on Single VM

Runtime topology on single VM:
- Node app (existing)
- PostgreSQL (existing)
- NATS JetStream (new)
- Optional worker process for outbox publisher and async tasks

Recommended deployment approach:
- docker-compose with explicit volumes:
  - Postgres volume
  - NATS JetStream storage volume
- Object storage externalized to DO Spaces.

Observability:
- Metrics:
  - message create latency p50/p95
  - outbox pending count
  - broker publish failures
  - consumer lag
  - websocket emit failures
- Structured logs with correlation IDs (`clientMessageId`, `messageId`).

Backups:
- PostgreSQL daily backups + WAL retention.
- Spaces object lifecycle/versioning policy.
- Broker stream persistence is not your source of truth; DB is.

## 13) Security and Abuse Controls

- Server-side permission checks for every room/message action.
- Rate limits per user and per room (`message:create`, upload init).
- Content sanitation for markdown/link rendering to prevent XSS.
- Attachment size/type caps and signed URL expiry.
- Soft-delete for messages plus audit log for moderator actions.

## 14) Execution Checklist

1. Add Prisma models and migrations.
2. Implement chat repositories (rooms/messages/membership/read-cursor/outbox).
3. Implement `ChatGatewayV2` socket handlers.
4. Add NATS JetStream publisher/consumer and outbox worker.
5. Add upload init endpoint and Spaces integration.
6. Add `interactionMode` and mode toggle UI.
7. Implement Desk-mode React layout and room-scoped store.
8. Implement room creation and join management UI.
9. Add observability dashboards and basic alerts.
10. Run shadow traffic and gradual rollout with feature flags.

## 15) Delivery Order Recommendation

Given your current deployment and risk profile, ship in this order:
1. Durable messaging core (DB + outbox + broker) first.
2. Rooms/permissions second.
3. Desk-mode UI third.
4. Files fourth (or parallel if team capacity allows).

Reason:
- This sequence de-risks data integrity first, then UX expansion.
- It avoids building a large UI on top of non-durable transport.
