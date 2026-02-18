# Packet Handoff: desk-44-chat-v2-client-dm-data

## Packet ID
- `desk-44-chat-v2-client-dm-data`

## Scope
Extend frontend chat-v2 types/service/store for DM/friend lifecycle and unread aggregation selectors.

## Problem Snapshot
Frontend store previously modeled room chat only and could not power DM rail state, DM list state, or aggregate unread badge semantics.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/_types.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`

## API/Type Changes
- Added frontend DM/friend types:
  - `ChatV2Friend`
  - `ChatV2DirectRoom`
  - `ChatV2FriendshipStatus`
- Added chat-v2 service methods:
  - `listFriends`
  - `requestFriend`
  - `respondToFriendRequest`
  - `removeFriend`
  - `listDirectRooms`
  - `openDirectMessage`
  - `updateReadCursor`
- Added store state/actions:
  - rail state (`railView`)
  - selected workspace
  - unread map (`unreadByRoomId`)
  - direct room state (`directRoomsById`, `directRoomOrder`)
  - friend list state (`friends`)
  - aggregated unread selectors (`getWorkspaceUnreadTotal`, `getDirectUnreadTotal`)
  - DM/friend actions and read-cursor update path

## Validation Commands + Results
- `npm run lint` (frontend) ✅

## Risks/Open Items
- Realtime unread increments are client-derived for new inbound events and should be validated with reconnect/resync scenarios.

## Next Packet Start Conditions
- [x] Store selectors/actions available for rail UI.
- [x] Frontend lint is green.
