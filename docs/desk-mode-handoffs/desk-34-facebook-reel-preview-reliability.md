# Desk 34 - Facebook Reel Preview Reliability

## User-Reported Symptom
Desk mode message cards for Facebook reel URLs (example: `https://www.facebook.com/reel/1791015131569443`) rendered only plain link cards with no preview image/title.

## Fixes Applied

### 1) Link metadata retry robustness
- File: `src/pages/api/link-preview.ts`
- Added social retry variants that handle Facebook anti-bot/login detours:
  - convert `m.facebook.com` to `www.facebook.com`
  - extract `next` target URL from Facebook login redirects and retry it on `www`
  - existing retries retained (tracking-param stripping and trailing slash toggle)
- Kept metadata scoring so best candidate result is selected.

### 2) Removed stateful regex edge case
- File: `src/pages/api/link-preview.ts`
- Stopped reusing global `<meta>`/`<link>` regex instances across calls by using per-call regex literals in extraction helpers.

### 3) Client retries now cover failed preview fetches
- File: `src/common/components/DeskMode/MessageList.tsx`
- Preview fetch retry logic now retries both:
  - weak metadata responses (domain/url only)
  - failed fetch state (`null`), up to a bounded retry count.

### 4) Removed broken preview image proxy path
- File: `src/common/components/DeskMode/MessageList.tsx`
- Desk cards now use metadata image URL directly.
- Deleted unused/broken route: `src/pages/api/link-preview-image.ts`.

## Validation
- `npm run lint` passed.
- `npm run build` passed.
- `npx next dev -p 8091` readiness check passed.
- Endpoint verification for exact reported link:
  - `/api/link-preview?url=https://www.facebook.com/reel/1791015131569443`
  - returns `title` + `image` consistently in local checks.
