# Packet Handoff: desk-54-message-reactions-context-reset

## Packet ID
- `desk-54-message-reactions-context-reset`

## Scope
Freeze requirements, data-contract decisions, and execution discipline for message reactions across Desk mode and 2D mode chat-v2 surfaces.

## Problem Snapshot
Current chat-v2 message UI has reaction placeholders in hover action menus, but there is no persisted message reaction model, no realtime reaction event, no reaction chips rendering, and no reactors tooltip UX.

## Decisions Frozen
1. Reactions are available for both root messages and reply messages.
2. Reactions use toggle semantics per `(messageId, userId, emoji)`:
- add when missing
- remove when existing
3. Same emoji stacks into one chip with a counter.
4. Message reaction chips are rendered at the bottom-left of the message content block.
5. Reaction chip order is by first reaction timestamp for each emoji on that message.
6. Hover action bar includes universal quick reactions to the left of the react button: `😂`, `❤️`, `👍`.
7. React button opens a 2-row picker:
- row 1: frequent emojis
- row 2: curated emoji catalog
8. Frequent emojis follow hybrid strategy:
- local client cache is hot path
- server mirror persists usage for resilience and cross-device continuity
9. Reactions must fan out in realtime using a dedicated event:
- `chat:v2:message:reaction:update`
10. Hovering a reaction chip opens tooltip/popover with:
- larger emoji at top
- first 20 reactors (recent first)
- `+N others` when total reactors exceed 20

## New-Context Execution Contract (Mandatory)
For every packet (`desk-55` to `desk-60`):
1. Start a fresh execution context/session.
2. Read `desk-54-message-reactions-context-reset.md` first.
3. Read the immediate previous packet handoff doc second.
4. Implement only the current packet scope.
5. Run listed validation commands.
6. Write current packet handoff doc before closing packet.
7. Depend only on handoff docs and repository state; do not depend on unstated memory.

## Packet Boundaries
- `desk-55-reactions-schema-and-migration`
- `desk-56-reactions-realtime-contract`
- `desk-57-reactions-client-store-sync`
- `desk-58-reactions-ui-chips-and-picker`
- `desk-59-reaction-tooltip-reactors`
- `desk-60-reactions-validation`

## Required Handoff Template (desk-55 to desk-60)
1. Problem Snapshot
2. Scope
3. Files Changed
4. API / Type / Schema Changes
5. Validation Commands + Results
6. Risks / Open Items
7. Next Packet Start Conditions

## Exit Criteria
- [x] Product behavior is frozen for message reactions.
- [x] Realtime and tooltip requirements are explicit.
- [x] Packet sequencing and context-reset protocol are explicit.
