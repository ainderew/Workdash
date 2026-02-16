# Desk Mode Handoff 23: Inner Window Outline and Glow

## Scope
- Added a subtle outline and light glow shadow to the borderless inner Desk chat container.

## Change
- Updated inner container classes to include:
  - `outline outline-1 outline-[color:var(--wd-border-subtle)]`
  - `shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_14px_rgba(88,101,242,0.08)]`
- File:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
