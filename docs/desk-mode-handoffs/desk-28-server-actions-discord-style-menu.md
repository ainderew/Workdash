# Desk Mode Handoff 28: Discord-Style Server Actions Menu

## Scope
- Restyled the server actions entry in the Desk sidebar to match Discord-like behavior and visual structure.

## Changes
- Updated `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`:
  - Server name is now the primary dropdown trigger (pill button with chevron).
  - Added larger server actions panel with grouped sections and separators.
  - Kept actionable items wired:
    - `Create Category`
    - `Create Room`
  - Added non-destructive styled rows for parity:
    - `Server Boost`
    - `Invite to Server`
    - `App Directory`
    - `Notification Settings`
    - `Privacy Settings`
    - `Server Settings`
    - `Leave Server` (visual row)
  - Added quick icon button at right of header for room creation.
  - Existing outside-click and escape-to-close behavior remains.

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
