# Desk Mode Handoff 22: Borderless Inner Window Layout

## Scope
- Removed border seams between the left guild rail and top server strip so they appear visually connected.
- Added an inner rounded content wrapper for the channel sidebar + main chat pane + member pane.
- Added spacing between that inner wrapper and the left rail/top strip to create an in-app window feel.

## Changes
- Guild rail:
  - removed right border from the left-most rail.
  - file: `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/GuildRail.tsx`
- Top server strip:
  - removed bottom border from the top strip row.
  - file: `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`
- Inner app window:
  - wrapped `ChannelSidebar`, main center pane, and `MemberPanel` in:
    - padded container (`p-2`) to separate from rail/top strip
    - rounded clip container (`rounded-lg overflow-hidden`) for borderless app-window look
  - file: `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- `npx next dev -p 8091` reached `Ready`.
