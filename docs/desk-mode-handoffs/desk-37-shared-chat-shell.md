# Packet Handoff: desk-37-shared-chat-shell

## Packet ID
- `desk-37-shared-chat-shell`

## Scope
Extract a shared room-aware chat shell from Desk mode so the same stateful surface can be mounted in both Desk overlay and 2D drawer containers.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatShell.tsx` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`

## Implementation Notes
- Added `DeskChatShell` as the reusable chat-v2 controller/view shell.
- Moved initialization, room/category/message wiring, search, and search-result navigation to `DeskChatShell`.
- Refactored `DeskLayout` into a thin wrapper rendering `DeskChatShell` in `desk` mode.
- Added presentation hooks:
  - `ChannelSidebar` supports `presentation` (`desk|drawer`) and optional close callback.
  - `RoomHeader` supports optional close button for drawer contexts.

## Validation
- `npm run lint` passed.

## Exit Criteria Status
- [x] Desk mode behavior preserved.
- [x] Shared shell embeddable with presentation-specific container controls.
