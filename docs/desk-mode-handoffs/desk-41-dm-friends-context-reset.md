# Packet Handoff: desk-41-dm-friends-context-reset

## Packet ID
- `desk-41-dm-friends-context-reset`

## Scope
Freeze DM/friends requirements and packet boundaries before implementation so each packet can be executed independently with minimal context pollution.

## Problem Snapshot
The existing chat-v2 runtime supports room chat, but lacks:
- 1:1 direct message room lifecycle
- friendship relationship model
- DM-aware rail navigation
- aggregated unread badges by server and DM
- compact 2D DM surface parity with Desk

## Decisions Frozen
1. DM threads are private and strictly 2-user only.
2. DM data and server room data both run through `chat:v2:*` runtime.
3. Friendships use a normalized relation table (not arrays on `User`) for scalability and integrity.
4. Left rail contains an explicit DM button with tooltip `Direct Messages`.
5. Left rail badges show aggregated unread totals per server and DM.
6. 2D keeps compact UI with core features, not full Desk admin controls.

## Packet Boundaries
- `desk-42`: backend schema only
- `desk-43`: backend gateway/service APIs only
- `desk-44`: frontend chat-v2 service/store integration only
- `desk-45`: rail UX + indicator + button/tooltip/badge behavior
- `desk-46`: compact 2D DM layout + scroll/overflow hardening
- `desk-47`: parity validation and rollout notes

## Do-Not-Expand Rules
1. No ad-hoc feature additions outside packet objective.
2. No protocol divergence between Desk and 2D.
3. No legacy runtime reintroduction.
4. No unresolved UX decisions carried between packets.

## Required Handoff Template for Packets 42-47
1. Problem Snapshot
2. Scope
3. Files Changed
4. API/Type Changes
5. Validation Commands + Results
6. Risks/Open Items
7. Next Packet Start Conditions

## Exit Criteria
- [x] Decisions are frozen.
- [x] Packet boundaries are explicit.
- [x] Handoff structure is defined.
