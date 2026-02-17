# Desk 33 - Social Link Preview Image Render Fix

## Issue
Desk mode link previews for Facebook/Instagram sometimes rendered only a plain URL card with no rich metadata image.

## Root Cause
`/api/link-preview` could return minimal fallback data (`url`, `domain`) for some social share URL variants (especially trailing slash/tracking variants), even when an alternate normalized URL would resolve full OpenGraph metadata.

## Changes Implemented

### 1) Hardened metadata extraction
- File: `src/pages/api/link-preview.ts`
- Added attribute-order-agnostic tag parsing for `<meta>` and `<link>` tags.
- Added richer image key fallback extraction:
  - `og:image`
  - `og:image:url`
  - `og:image:secure_url`
  - `twitter:image`
  - `twitter:image:src`
  - `<link rel="image_src">`, `<link rel="thumbnail">`
- Improved HTML entity decoding to include numeric/hex entities.

### 2) Added social URL retry normalization
- File: `src/pages/api/link-preview.ts`
- When metadata score is empty for social hosts (`facebook.com`, `instagram.com`, `fb.watch`), retry extraction using normalized candidates:
  - toggle trailing slash
  - remove tracking query params (`utm_*`, `fbclid`, `igshid`, `mibextid`, etc.)
- Keeps best-scored metadata result.

### 3) Added image proxy endpoint
- File: `src/pages/api/link-preview-image.ts`
- Proxies remote preview images through server with SSRF host checks and timeout.
- Used to improve reliability when direct third-party image URLs are flaky in browser context.

### 4) Desk renderer fallback behavior
- File: `src/common/components/DeskMode/MessageList.tsx`
- Rich preview image now loads via `/api/link-preview-image?url=...`.
- If proxy image fails, falls back to direct image URL automatically.

## Persistence
- No DB/schema changes.
- Message persistence remains unchanged (URL/text in existing message payload).

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- Local endpoint checks:
  - Facebook trailing slash share URL now returns `title` + `image`.
  - Instagram reel URL with tracking params returns `title` + `image`.
  - `/api/link-preview-image` returns `200` with `image/jpeg` for extracted social image URL.

## Remaining Notes
- Social platforms can still change anti-bot behavior; this implementation now retries normalized variants and proxies images to reduce blank-card outcomes in Desk mode.
