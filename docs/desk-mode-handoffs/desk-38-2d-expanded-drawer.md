# Packet Handoff: desk-38-2d-expanded-drawer

## Packet ID
- `desk-38-2d-expanded-drawer`

## Scope
Replace legacy 2D chat window with a shared chat-v2 drawer using expanded responsive width while preserving side-window behavior.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatDrawer.tsx` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/components/SidebarMenu/SidebarMenu.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`

## Implementation Notes
- Added `DeskChatDrawer` to mount `DeskChatShell` inside `SidebarMenu`.
- Extended `SidebarMenu` with `variant` support:
  - `default` (legacy narrow sidebar behavior)
  - `desk-chat` (expanded responsive width: mobile full width, desktop up to ~90vw, max 1400px)
- Replaced `ChatWindow` mount in `UiControls` with `DeskChatDrawer`.
- Chat button now opens chat-v2 drawer in 2D mode.

## Validation
- `npm run lint` passed.

## Exit Criteria Status
- [x] 2D chat side window now mounts room/search-capable chat-v2 shell.
- [x] Drawer sizing supports full parity layout.
- [x] Shared selected room state is reused via `chatV2Store.currentRoomId`.
