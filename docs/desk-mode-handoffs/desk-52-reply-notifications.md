# Packet Handoff: desk-52-reply-notifications

## Packet ID
- `desk-52-reply-notifications`

## Scope
Add personal notification flow for reply-to-your-root-message events, including realtime unread indicator and read-state clearing.

## Problem Snapshot
Users currently do not get personal notification when another user replies to their main message.

<thinking>
Reply notifications should be persistent, not purely ephemeral socket events, so users who were offline still see unread items later.
</thinking>

## Implementation Plan
1. Backend notification model
- Add notification storage (or equivalent durable model) for user-targeted events:
  - type: `REPLY_TO_MESSAGE`
  - target user id (root message author)
  - actor user id (replier)
  - room id
  - root message id
  - reply message id
  - read state + timestamps
- Create records only when:
  - reply is created,
  - replier is not the same as root message author.

2. Notification APIs + realtime
- Add socket endpoints:
  - list notifications (with unread state)
  - mark read (single or bulk-on-open)
- Emit realtime event to target user channel on new reply notification.

3. Frontend integration
- Extend notification store/service state with reply notifications.
- Notification bell (header) behavior:
  - red dot appears when unread exists.
  - opening/viewing notifications marks visible unread as read (or marks all as read per chosen contract).
  - dot clears when unread count reaches zero and no new notifications remain.
- Show reply notifications in User Notifications panel under `Other Notifications` (or dedicated section).

## Files Expected
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/<timestamp>_chat_reply_notifications/migration.sql`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/*notification*.ts` (new/updated)
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/_types.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/UserNotificationsPanel.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`

## Validation Commands
- Backend: `npm run lint && npm run build`
- Backend DB: `npx prisma generate && npx prisma migrate deploy && npx prisma migrate status`
- Frontend: `npm run lint && npm run build`
- Manual: two-client reply notification realtime test + read-state clearing

## Risks / Open Items
- Notification fanout channel naming (`chat:user:<userId>` or equivalent) must be normalized.
- Mark-read semantics (single/bulk) must be fixed before UI implementation.

## Next Packet Start Conditions
- [ ] Reply notifications persist and survive reconnect/offline gaps.
- [ ] Header dot reflects unread state in realtime.
- [ ] Opening notifications clears dot when unread is zero.

## New-Context Start Prompt For Packet 52
1. Open `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-48-reply-thread-context-reset.md`.
2. Open completed `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-51-thread-side-panel-and-reply-composer.md`.
3. Implement only packet `desk-52`.

## Implementation Result
- Status: completed
- Added durable reply notification model + enum:
  - `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
  - `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260217224110_chat_reply_notifications/migration.sql`
- Notification repository and service methods:
  - `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-user-notification.repository.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- Socket APIs and realtime fanout:
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.constants.ts`
  - `/Users/AndrewPinon/projects/workdash-media-server/src/index.ts`
- Frontend notification client/store/UI:
  - `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/_types.ts`
  - `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
  - `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/UserNotificationsPanel.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`
