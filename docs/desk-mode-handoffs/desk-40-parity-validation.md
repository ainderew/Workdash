# Packet Handoff: desk-40-parity-validation

## Packet ID
- `desk-40-parity-validation`

## Scope
Validate 2D/Desk chat-v2 parity after shared-shell extraction, expanded drawer integration, and frontend hard cut.

## Automated Validation Results
- `npm run lint` passed.
- `npm run build` passed.

## Behavioral Validation Matrix
1. 2D room access
- Status: Implemented by architecture.
- Evidence: 2D drawer mounts shared `DeskChatShell`, which uses `chatV2Store.selectRoom(...)` and room-aware message loading.

2. 2D search parity
- Status: Implemented by architecture.
- Evidence: 2D drawer mounts same `RoomHeader` + `DeskSearchResultsPanel` search flow used by Desk mode.

3. Cross-mode same-user sync
- Status: Implemented by architecture.
- Evidence: both modes use `chatV2Store.currentRoomId` as shared selected-room source.

4. Cross-client bi-directional parity
- Status: Expected from shared chat-v2 socket/event path.
- Evidence: both modes now consume/send via `chat:v2:*` from same shell.

5. Correct room routing
- Status: Implemented by architecture.
- Evidence: sends call `chatV2Store.sendMessage` scoped to current room; reads scoped by room selection.

6. Sender identity correctness
- Status: Existing behavior preserved.
- Evidence: message rendering still keyed by `senderUserId` and backend user context in `MessageList`.

7. Reconnect behavior
- Status: Existing behavior preserved.
- Evidence: shared store initialization guard remains (`initialized`), preventing duplicate realtime handler setup.

8. Responsive drawer behavior
- Status: Implemented.
- Evidence: `SidebarMenu` `desk-chat` variant supports full width mobile and desktop expanded width.

9. Non-chat UI regression
- Status: Build/lint clean.
- Evidence: no compile/lint regressions in control surface modules.

## Manual QA
- Not executed in this session (no interactive multi-client runtime validation was run here).

## Exit Criteria Status
- [x] No mode-specific drift in chat shell implementation.
- [x] No mixed legacy/v2 runtime paths remain on frontend.
- [ ] Manual two-client parity runbook execution pending post-merge QA.
