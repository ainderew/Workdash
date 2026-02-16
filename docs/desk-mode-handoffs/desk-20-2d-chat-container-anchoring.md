# Desk Mode Handoff 20: 2D Chat Container Anchoring

## Issue
- In 2D mode, the chat sidebar behaved as if it was trapped inside the UI controls hub.
- Root cause: `UiControls` uses transform classes (`translate-y-*`), and fixed-position descendants were inheriting that transformed containing block behavior.

## Changes
- Refactored `UiControls` to render the controls bar and side panels/modals as siblings:
  - Controls hub remains in the transformed container.
  - `ChatWindow`, `CalendarMenu`, `MembersUi`, and soccer modals now render outside that transformed container.
- Updated `SidebarMenu` from `fixed` to `absolute` so sidebars anchor to the app container (`#app` is `relative`).

## Files Updated
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/SidebarMenu/SidebarMenu.tsx`

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- Local startup check passed: `npx next dev -p 8091` reached `Ready`.
