# Packet Handoff: desk-46-2d-compact-dm-layout

## Packet ID
- `desk-46-2d-compact-dm-layout`

## Scope
Redesign 2D chat popup as compact rail + list + chat composition with DM support and robust scrolling.

## Problem Snapshot
2D side popup needed compact UX with full core chat functionality, including DM navigation and stable scroll behavior.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/SidebarMenu/SidebarMenu.tsx`

## UX/Behavior Changes
- 2D chat now uses compact three-region layout:
  - left rail (workspace + DM)
  - second sidebar (rooms or DM list)
  - main message panel
- Room selector is on its own row.
- Search bar + scope filter are side-by-side on the next row.
- DM mode shows friend-search input above DM list to start/open DMs.
- Sidebar list areas are independently scrollable (`min-h-0` + `overflow-y-auto`) with clickable list items.
- Drawer sizing adjusted for compact multi-column usability while preserving viewport constraints.
- Drawer host now hard-locks body scroll while mounted and uses full-height inset positioning to prevent bottom-gap page scroll.

## Validation Commands + Results
- `npm run lint` (frontend) ✅
- `npm run build` (frontend) ✅
- `npm run lint && npm run build` after viewport lock patch ✅

## Risks/Open Items
- Mobile on-screen keyboard viewport behavior should be checked on physical devices.

## Next Packet Start Conditions
- [x] 2D compact layout is DM-capable.
- [x] Scroll and selection behavior are stabilized.
