# Packet Handoff: desk-42-dm-friends-schema

## Packet ID
- `desk-42-dm-friends-schema`

## Scope
Add scalable schema for friendship relationships and canonical 1:1 DM room identity.

## Problem Snapshot
DM and friends require durable relationship data and strict pair-to-room mapping that did not exist in the chat-v2 schema.

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260218001000_dm_friends_core/migration.sql`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260218003000_match_history_scores/migration.sql`

## API/Type Changes
- `ChatRoomType` now includes `DIRECT`.
- Added `FriendshipStatus` enum.
- Added `Friendship` model with canonical pair unique key (`userLowId`, `userHighId`).
- Added `ChatDirectRoom` model with unique pair mapping and `roomId` primary key.
- Added user/chat relation fields for friendship and direct-room joins.

## Validation Commands + Results
- `npx prisma generate` ✅
- `npm run lint` (backend) ✅
- `npx prisma migrate deploy` ✅
- `npx prisma migrate status` ✅ (`Database schema is up to date!`)

## Risks/Open Items
- Prior local DB drift (`MatchHistory.ourScore` / `MatchHistory.opponentScore`) is reconciled via `20260218003000_match_history_scores`.

## Next Packet Start Conditions
- [x] Prisma schema compiles.
- [x] Migration SQL exists for DM/friends schema delta.
