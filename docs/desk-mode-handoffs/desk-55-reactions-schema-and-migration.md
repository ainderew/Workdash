# Packet Handoff: desk-55-reactions-schema-and-migration

## Problem Snapshot
Chat-v2 had no persisted message reaction schema, no reaction aggregate read model for message timelines, and no persistent frequent-emoji usage table.

## Scope
Implemented backend schema and migration foundation for reactions:
- reaction event source table per user/message/emoji
- reaction aggregate table per message/emoji
- user emoji usage table for frequent-emoji persistence
- message repository include wiring for reaction aggregate read shape

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/schema.prisma`
- `/Users/AndrewPinon/projects/workdash-media-server/prisma/migrations/20260218141605_chat_message_reactions/migration.sql`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message-reaction.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-user-emoji-usage.repository.ts`

## API / Type / Schema Changes
1. Added `ChatMessageReaction`:
- composite primary key `(messageId, userId, emoji)`
- indexed for tooltip/reactor queries and user reaction lookup
2. Added `ChatMessageReactionAggregate`:
- composite primary key `(messageId, emoji)`
- `count`, `firstReactedAt`, `lastReactedAt`
- indexed for per-message chip rendering order
3. Added `ChatUserEmojiUsage`:
- composite primary key `(userId, emoji)`
- `usageCount`, `lastUsedAt` for frequent ranking
4. Added relations on existing models:
- `User.chatMessageReactions`, `User.chatEmojiUsage`
- `ChatMessage.reactions`, `ChatMessage.reactionAggregates`
5. Updated `chat-message.repository` include to return ordered `reactionAggregates` with message payloads.

## Validation Commands + Results
In `/Users/AndrewPinon/projects/workdash-media-server`:
1. `npx prisma migrate dev --name chat_message_reactions` ✅
2. `npm run lint` ✅
3. `npm run build` ✅

## Risks / Open Items
1. Toggle behavior, realtime fanout, and frequent-emoji APIs are not wired yet (next packet).
2. Frontend message type contracts are not yet updated to consume `reactionAggregates` (next packets).

## Next Packet Start Conditions
1. Read `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-54-message-reactions-context-reset.md`.
2. Read this handoff.
3. Implement packet `desk-56-reactions-realtime-contract` only:
- gateway commands (`toggle`, `reactors:list`, `frequent:list`)
- service logic for toggle/validation
- outbox + realtime fanout event for reaction updates
