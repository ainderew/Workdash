# Handoff: desk-01-prisma-schema

## Packet
- ID: `desk-01-prisma-schema`
- Scope: Add Desk Mode chat persistence schema and migration scaffold.

## Changes made
- Updated Prisma schema in media server with new enums and models for chat domain:
  - `ChatWorkspace`
  - `ChatRoom`
  - `ChatRoomMembership`
  - `ChatMessage`
  - `ChatAttachment`
  - `ChatReadCursor`
  - `ChatInvite`
  - `OutboxEvent`
- Added user relation fields required by chat models.
- Added migration SQL:
  - `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260217013000_desk_chat_core/migration.sql`

## Files changed
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260217013000_desk_chat_core/migration.sql`

## Validation
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npm run lint` (media-server) ✅
- `npm run build` (media-server) ✅
- `npm run lint` (workdash) ✅
- `npm run build` (workdash) ✅

## Notes
- `prisma migrate dev` was blocked by existing DB drift in local dev DB (`MatchHistory` columns present in DB but not in historical migrations).
- Migration SQL was generated from schema diff (`HEAD schema` -> `new schema`) to keep packet moving without resetting local DB.

## Next packet
- `desk-02-chat-repos`
  - build repository layer and transactional outbox write path.
