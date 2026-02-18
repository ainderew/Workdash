# Packet Handoff: desk-43-dm-friends-gateway

## Packet ID
- `desk-43-dm-friends-gateway`

## Scope
Implement backend repositories, chat-v2 service methods, and socket gateway events for friendship + DM lifecycle with unread metadata.

## Problem Snapshot
Frontend could not render DM/friends rail states or unread badge totals without new socket contracts and room metadata.

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/friendship.repository.ts` (new)
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-direct-room.repository.ts` (new)
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-read-cursor.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-room.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.constants.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`

## API/Type Changes
- New socket events:
  - `chat:v2:friend:list`
  - `chat:v2:friend:request`
  - `chat:v2:friend:respond`
  - `chat:v2:friend:remove`
  - `chat:v2:dm:list`
  - `chat:v2:dm:open`
- `chat:v2:room:list` now returns room-level `unreadCount`.
- DM open flow enforces accepted friendship and canonical pair room reuse.
- `chat:v2:room:create` explicitly blocks `DIRECT` type creation; DM creation must go through `chat:v2:dm:open`.

## Validation Commands + Results
- `npm run lint` (backend) ✅
- `npm run build` (backend) ✅

## Risks/Open Items
- Room unread counts are computed per accessible room; monitor scale/perf if workspace room count grows significantly.

## Next Packet Start Conditions
- [x] Socket contracts stable for frontend integration.
- [x] Backend build is green.
