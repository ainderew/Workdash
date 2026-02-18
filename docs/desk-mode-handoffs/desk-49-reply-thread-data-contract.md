# Packet Handoff: desk-49-reply-thread-data-contract

## Packet ID
- `desk-49-reply-thread-data-contract`

## Problem Snapshot
`replyToMessageId` existed in schema and create payload, but there was no stable contract for:
- root-only timeline retrieval,
- per-root reply summaries for collapsed indicators,
- thread fetch by root message,
- server-side nested-reply prevention.

## Scope
Implemented backend + frontend contract primitives for reply/thread data without switching active UI to thread mode yet.

<thinking>
I kept this packet contract-first and avoided timeline UI behavior changes so existing chat rendering remains stable while we ship enforceable thread semantics at the API boundary.
</thinking>

## Files Changed
Backend:
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260218061000_chat_reply_thread_indexes/migration.sql`

Frontend contract wiring:
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/_types.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`

## API / Type / Schema Changes
1. Message list contract extension (`chat:v2:message:list`)
- New optional request flags:
  - `rootOnly?: boolean`
  - `includeReplySummary?: boolean`
- Timeline message response now supports reply summary fields:
  - `replyCount`
  - `lastReplyAt`
  - `replyPreviewUsers[]`

2. New thread fetch endpoint
- Added `chat:v2:thread:get` with payload:
  - `roomId`
  - `rootMessageId`
  - `before?`
  - `limit?`
- Response:
  - `rootMessage`
  - `replies[]` (oldest to newest)
  - `totalReplyCount`

3. Nested reply prevention (server-side)
- `chat:v2:message:create` now enforces:
  - reply target must exist in same room,
  - reply target must not be deleted,
  - reply target must be a root message (`replyToMessageId == null`).
- Explicit rejection error for nested replies: `Nested replies are not allowed`.

4. Data access primitives
- Added repository methods for:
  - reply listing by root,
  - reply counts per root,
  - per-root reply summary + preview users.

5. Schema/index hardening
- Added index on `ChatMessage`:
  - `@@index([roomId, replyToMessageId, createdAt, id])`
- Migration applied:
  - `20260218061000_chat_reply_thread_indexes`

## Validation Commands + Results
Backend:
- `npm run lint` ✅
- `npm run build` ✅
- `npx prisma generate` ✅
- `npx prisma migrate deploy` ✅ (applied `20260218061000_chat_reply_thread_indexes`)
- `npx prisma migrate status` ✅ (`Database schema is up to date!`)

Frontend:
- `npm run lint` ✅
- `npm run build` ✅

## Risks / Open Items
- Reply preview users currently use per-root lookup queries; if rooms have very high thread cardinality, this may need a batched/window-query optimization.
- Timeline UI/store is not yet switched to `rootOnly + includeReplySummary`; this is expected for next packet.
- Thread pagination currently supports simple `before` cursor semantics; advanced pagination can be refined later if needed.

## Next Packet Start Conditions
- [x] Root-capable list contract available (`rootOnly`, `includeReplySummary`).
- [x] Thread fetch contract available (`chat:v2:thread:get`).
- [x] Nested reply guard enforced server-side.
- [x] Frontend chat-v2 types/service updated for thread contracts.

## New-Context Start Prompt For Packet 50
1. Open `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-48-reply-thread-context-reset.md`.
2. Open this file (`desk-49-reply-thread-data-contract.md`).
3. Implement only packet `desk-50-reply-hover-actions-and-collapsed-indicator`.
