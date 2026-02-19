# Packet Handoff: desk-56-reactions-realtime-contract

## Problem Snapshot
Schema existed, but no backend runtime contract existed for toggling reactions, listing reactors for tooltip, listing frequent emojis, or publishing realtime reaction updates.

## Scope
Implemented backend chat-v2 runtime contract and fanout behavior for reactions:
- reaction toggle command
- reactors list command (for tooltip)
- frequent emoji list command
- dedicated realtime event for reaction deltas

## Files Changed
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.constants.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.types.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.service.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/services/chat-v2.gateway.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/infrastructure/broker/chat-fanout.consumer.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message-reaction.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-user-emoji-usage.repository.ts`
- `/Users/AndrewPinon/projects/workdash-media-server/src/repositories/chat/chat-message.repository.ts`

## API / Type / Schema Changes
1. Added reaction constants and validation helpers:
- curated emoji catalog
- quick emojis
- max frequent/tooltip limits
- `isSupportedChatReactionEmoji`

2. Added gateway socket APIs:
- `chat:v2:message:reaction:toggle` payload `{ roomId, messageId, emoji }`
- `chat:v2:message:reaction:reactors:list` payload `{ roomId, messageId, emoji, limit? }`
- `chat:v2:emoji:frequent:list` payload `{ limit? }`

3. Added service methods:
- `toggleMessageReaction`
- `listMessageReactionReactors`
- `listFrequentEmojis`

4. Added realtime outbox + fanout event:
- outbox event type: `chat.message.reaction.updated`
- socket realtime event: `chat:v2:message:reaction:update`
- payload shape: `{ roomId, messageId, emoji, action, reactorUserId, count, firstReactedAt }`

5. Timeline/thread service mapping now includes normalized `reactions` arrays (in addition to existing message fields).

## Validation Commands + Results
In `/Users/AndrewPinon/projects/workdash-media-server`:
1. `npm run lint` ✅
2. `npm run build` ✅

## Risks / Open Items
1. Frontend store is not yet subscribed to `chat:v2:message:reaction:update`.
2. Frontend message contracts are not yet typed for `reactions`/reactor tooltip responses.
3. UI reaction chips and tooltip rendering are still pending.

## Next Packet Start Conditions
1. Read `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-54-message-reactions-context-reset.md`.
2. Read this handoff.
3. Implement packet `desk-57-reactions-client-store-sync`:
- frontend chat-v2 types/service method additions
- realtime reaction delta handling in `chatV2Store`
- frequent emoji local+server merge/cache logic
