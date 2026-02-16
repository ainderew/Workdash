# Desk Mode Handoff 21: Top Server Strip + Unified Rail Color

## Scope
- Added a Discord-like top strip above the channel sidebar and room header area.
- Top strip shows the current server/workspace name.
- Left segment of the top strip uses the same surface color as the guild rail (`W/D` column) to visually connect both sections.

## Changes
- Updated Desk layout to a two-row structure:
  - Row 1: top app strip (`h-9`) with centered server name.
  - Row 2: main chat body (`GuildRail`, `ChannelSidebar`, main pane, `MemberPanel`).
- Top strip left section width matches guild rail width (`w-18`) and uses `wd-bg-app`.

## File Updated
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
