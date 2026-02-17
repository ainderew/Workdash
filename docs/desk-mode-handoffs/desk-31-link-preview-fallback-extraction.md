# Desk Mode Handoff 31: Link Preview Fallback Extraction

## Scope
- Hardened Desk message link preview rendering for URLs that are not consistently parsed by structured link parsing.

## Why
- Certain URLs (including some Facebook share links) were reported as not rendering previews reliably.

## Change
- Updated `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`:
  - Keeps existing parser-driven previews (YouTube/Twitter/GitHub/generic).
  - Adds fallback URL extraction from raw message text with `https?://...` pattern.
  - Renders generic link preview cards for fallback URLs not already covered by parser output.

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
