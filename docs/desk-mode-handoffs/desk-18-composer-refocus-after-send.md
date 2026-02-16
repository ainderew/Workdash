# Desk Mode Handoff 18: Composer Refocus After Send

## Issue
- Desk mode message composer lost focus after sending a message.

## Root Cause
- Composer textarea is disabled while `isSending` is true, which blurs focus.
- Clicking the Send button also shifts focus to the button.

## Fix
- Added a stable textarea id (`desk-chat-input`) and a `focusInput()` helper.
- Re-focuses the textarea in `submit()` `finally` block via `requestAnimationFrame`.
- Prevented the Send button from stealing focus using `onMouseDown(event.preventDefault())`.

## File Updated
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- Local startup check passed with `npx next dev -p 8091` (Ready).
