# Packet Handoff: desk-48-reply-thread-context-reset

## Packet ID
- `desk-48-reply-thread-context-reset`

## Scope
Freeze requirements, sequencing, and handoff discipline for Reply to Message across Desk mode and 2D mode.

## Problem Snapshot
Current chat-v2 supports `replyToMessageId` at data level, but product-level thread UX and constraints are not implemented:
- No hover action menu anchored above message bubble.
- No collapsed thread indicator (`N replies` + replier avatars).
- No dedicated thread side panel with main message + ordered replies + shared composer reuse.
- No guardrail preventing nested replies (reply-to-reply).
- No personal notification when your main/root message receives a reply.

## Decisions Frozen
1. Reply is only allowed on root/main messages (`replyToMessageId == null`).
2. Replies never show a reply action (future actions can stay visible as placeholders).
3. Thread timeline order is ascending by `createdAt` (oldest reply nearest root message).
4. Thread entrypoint in main timeline is a collapsed, clickable indicator with accent styling and avatar previews.
5. Thread conversation opens in right-side panel in both Desk and 2D chat surfaces.
6. Composer at thread bottom reuses existing chat composer behavior; sends are always appended to thread root.
7. Main/root message author receives personal notification when another user replies.
8. Notifications must support realtime indicator + clear-on-open behavior when no unread remain.

<thinking>
We are freezing rules early because reply UX touches backend query shape, realtime, message rendering, and notification semantics. Without these fixed decisions, implementation drift is likely between Desk and 2D.
</thinking>

## New-Context Execution Contract (Mandatory)
For every packet (`desk-49` to `desk-53`):
1. Start a fresh execution context/chat session.
2. Read `desk-48-reply-thread-context-reset.md` first.
3. Read the immediate previous packet handoff doc second.
4. Implement only the current packet scope; no opportunistic extras.
5. Write current packet handoff with validation evidence before closing.
6. Next packet must not rely on unstated memory; it must rely on handoff docs only.

## Packet Boundaries
- `desk-49-reply-thread-data-contract`
- `desk-50-reply-hover-actions-and-collapsed-indicator`
- `desk-51-thread-side-panel-and-reply-composer`
- `desk-52-reply-notifications`
- `desk-53-reply-thread-parity-validation`

## Required Handoff Template For Packets 49-53
1. Problem Snapshot
2. Scope
3. Files Changed
4. API / Type / Schema Changes
5. Validation Commands + Results
6. Risks / Open Items
7. Next Packet Start Conditions

## Exit Criteria
- [x] Product rules are frozen for reply/thread behavior.
- [x] New-context execution protocol is explicit.
- [x] Packet sequence is bounded and handoff-driven.
