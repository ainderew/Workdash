# Desk Mode Handoff 27: Server Header Actions Dropdown

## Scope
- Removed the separate channel action row:
  - `Channels`
  - `+ Category`
  - `+ Room`
- Added a dropdown actions menu beside the server title in the top sidebar header.

## Changes
- Updated `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`:
  - Added `Actions ▾` dropdown trigger in the server header.
  - Added menu actions:
    - `Create Category`
    - `Create Room`
  - Added outside-click and `Escape` close handling for the new menu.
  - Kept existing create modals and callbacks unchanged.

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
