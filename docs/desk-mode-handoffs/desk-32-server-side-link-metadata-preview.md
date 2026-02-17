# Desk Mode Handoff 32: Server-Side Link Metadata Preview

## Scope
- Added server-side metadata extraction for Desk chat link previews.
- Upgraded generic link cards to render rich metadata (title/description/image) when available.

## Why
- Some links (including Facebook share links) require server-side fetch to reliably read OpenGraph metadata.

## Changes
- Added API route:
  - `/Users/AndrewPinon/projects/workdash/src/pages/api/link-preview.ts`
  - Fetches target URL server-side with timeout + basic host safety checks.
  - Extracts `og:title`, `og:description`, `og:image`, `og:site_name` (with fallbacks).
- Updated Desk message rendering:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
  - Fetches metadata for generic links through `/api/link-preview`.
  - Renders rich preview card when metadata exists.
  - Falls back to compact URL card when metadata is unavailable.

## Validation
- `npm run lint`
- `npm run build`
- `npx next dev -p 8091` readiness check
