# Desk Mode Handoff 16: Input Focus and Key Capture

## Problem
- In Desk mode, typing `W`, `A`, `S`, or `D` in the message composer was blocked.
- Root cause: Phaser key bindings were created with capture enabled, which called `preventDefault()` globally for these keys.

## Changes Implemented
- Disabled Phaser keyboard capture for player movement and kart keys:
  - `W`, `A`, `S`, `D`, `K` now use `addKey(..., false)`.
- Disabled Phaser keyboard capture for Soccer letter hotkeys:
  - `H`, `Q`, `E`, `R`, `T`, `F`, `G` now use `addKey(..., false)`.
- Added a movement guard in player input sampling:
  - If a text-entry element is focused (`input`, `textarea`, `select`, `contenteditable`), movement input is forced idle.
  - If interaction mode is `desk`, movement input is forced idle.
- Added `event.stopPropagation()` in Desk composer `Textarea` `onKeyDown`.

## Files Updated
- `/Users/AndrewPinon/projects/workdash/src/game/player/player.ts`
- `/Users/AndrewPinon/projects/workdash/src/game/scenes/SoccerMap.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- Local startup check passed via `npx next dev -p 8091` (`Ready` state reached).

## Follow-up Risk
- Arrow keys are still captured through Phaser cursor keys in world mode by default.
- If arrow-key text navigation conflicts appear in future inputs, we should disable capture for cursor keys too and rely on explicit movement guards only.
