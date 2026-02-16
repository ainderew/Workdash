# Packet Handoff: desk-08-mode-toggle

## Packet ID
- `desk-08-mode-toggle`

## Branch
- Frontend repo: `main`
- Media-server repo: `main`

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/store/uiStore.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`

## API / Socket Contract Changes
- No backend contract changes in this packet.
- Added frontend interaction mode state for `world|desk`.

## Migration / Env Changes
- None in this packet.

## Validation Commands + Results
- `npm run lint` (frontend): passed (eslint warning about React version setting is pre-existing)
- `npm run build` (frontend): passed

## Operational Behavior Added
- Added mode toggle button in UI controls:
  - `Desk Mode` when in `world`
  - `2D Mode` when in `desk`
- Mode persistence:
  - reads from URL query `?mode=world|desk`
  - falls back to `localStorage` key `workdash:interactionMode`
  - writes mode back to URL and localStorage on change
- Phaser runtime handling:
  - `desk` mode calls `game.loop.sleep()`
  - `world` mode calls `game.loop.wake()`
- Added desk-mode overlay to indicate world scene is paused.

## Risks / Follow-ups
- Packet `desk-09-desk-shell` is still needed to replace placeholder overlay with full Desk UI.
- Game loop sleep/wake is global; if a scene needs extra pause/resume hooks, add them in scene lifecycle events.
