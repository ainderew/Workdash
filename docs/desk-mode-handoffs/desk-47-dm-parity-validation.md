# Packet Handoff: desk-47-dm-parity-validation

## Packet ID
- `desk-47-dm-parity-validation`

## Scope
Capture implementation-level parity validation for DM/friends and unread behavior across Desk and 2D.

## Automated Validation Results
- Frontend `npm run lint` ✅
- Frontend `npm run build` ✅
- Backend `npm run lint` ✅
- Backend `npm run build` ✅
- Frontend `npm run lint && npm run build` (post 2D drawer scroll-lock hardening) ✅
- Backend `npm run lint && npm run build` (final gate re-run) ✅
- Backend `npx prisma migrate deploy` ✅ (applied `20260218001000_dm_friends_core` and `20260218003000_match_history_scores`)
- Backend `npx prisma migrate status` ✅ (`Database schema is up to date!`)

## Validation Matrix Status
1. DM lifecycle API available (`friend:*`, `dm:*`) ✅
2. Shared room selection state across modes (`currentRoomId`) ✅
3. DM rail selection swaps second sidebar to DM list ✅
4. DM button tooltip and icon UX ✅
5. Left rail hover/active indicator behavior implemented ✅
6. Aggregate unread badges implemented (workspace + DM) ✅
7. 2D compact room selector row + search/filter row layout ✅
8. 2D sidebar scrolling and list selection behavior implemented ✅
9. Read cursor update path wired from frontend (`chat:v2:read:update`) ✅

## Manual QA Pending
- Two-client live parity run (Desk client + 2D client) for real-time send/receive and unread transitions.
- Reconnect/drop-network behavior under active DM conversation.

## Rollout Notes
- DM/friends implementation is now v2-native and does not introduce legacy runtime.
- Migration SQL exists but local dev `migrate dev` reported unrelated DB drift; apply migration in controlled DB pipeline.
