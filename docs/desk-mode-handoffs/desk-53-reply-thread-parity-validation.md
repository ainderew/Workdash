# Packet Handoff: desk-53-reply-thread-parity-validation

## Packet ID
- `desk-53-reply-thread-parity-validation`

## Scope
Finalize Reply to Message rollout by validating Desk/2D parity, correctness, and notification behavior.

## Problem Snapshot
Reply/thread behavior spans backend contracts, timeline rendering, panel composition, and personal notifications. Final regression checks are required before release.

<thinking>
Reply features are interaction-heavy and easy to partially break across modes. A dedicated validation packet reduces release risk and avoids hidden mode-specific drift.
</thinking>

## Validation Matrix
1. Reply eligibility
- Reply action appears on root messages only.
- Reply action does not appear on reply messages.

2. Hover action rail
- Placement is correct (top-right, half-outside visual).
- Placeholder actions render without layout overlap.

3. Collapsed indicator
- Root messages show correct `N replies`.
- Replier avatars appear and update after new reply.

4. Thread panel behavior
- Opens from reply action and collapsed indicator.
- Root message pinned at top.
- Replies sorted oldest-first.
- Thread composer appends replies to same root.

5. Cross-mode parity
- Same thread state when switching Desk <-> 2D.
- Same message routing/visibility per room and thread.

6. Notification behavior
- Root message author receives personal notification when another user replies.
- Replier does not self-notify on own reply.
- Header red dot appears on unread.
- Opening/reading notifications clears dot when no unread remain.

7. Reconnect and resilience
- No duplicate replies or duplicate notifications after reconnect.
- Thread panel recovers state after reconnect.

## Validation Commands
- Frontend: `npm run lint && npm run build`
- Backend: `npm run lint && npm run build`
- Backend DB: `npx prisma migrate deploy && npx prisma migrate status`

## Release Gate
- All matrix items pass.
- No legacy runtime path reintroduced.
- No unresolved P1 regressions in room message flow.

## New-Context Start Prompt For Packet 53
1. Open `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-48-reply-thread-context-reset.md`.
2. Open completed `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-52-reply-notifications.md`.
3. Execute only validation + rollout checks for `desk-53`.

## Validation Result
- Status: completed
- Frontend checks passed:
  - `npm run lint`
  - `npm run build`
  - `npm run lint && npm run build`
- Media-server checks passed:
  - `npm run lint`
  - `npm run build`
  - `npm run lint && npm run build`
- Prisma checks passed:
  - `npx prisma generate`
  - `npx prisma migrate dev --name chat_reply_notifications`
  - `npx prisma migrate deploy`
  - `npx prisma migrate status` (database up to date)
- Runtime socket checks passed:
  - Two-user reply flow: root create, reply create, thread fetch, notification realtime/list/read.
  - Nested reply rejection verified (`Nested replies are not allowed`).
  - Self-reply does not create extra personal notification.
  - `markAll` notification read path clears unread count to `0`.
