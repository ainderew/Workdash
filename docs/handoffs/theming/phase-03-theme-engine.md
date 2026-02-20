# Phase 03 Handoff: Frontend Theme Engine and Hydration

## Scope Completed
- Added frontend `/api/user/settings` proxy route with session-auth forwarding to backend settings API.
- Added shared settings route helpers and input validation for theme patch payloads.
- Added theme runtime service for:
  - root `data-theme` mutation
  - local storage read/write
  - GET/PATCH theme sync via `/api/user/settings`
- Added Zustand `themeStore` with:
  - optimistic local application
  - backend-canonical startup sync
  - sync error tracking
- Added early hydration script in `_document.tsx` to set `data-theme` from `workdash:theme` before paint.
- Added app bootstrap effect in `/app` runtime (`src/App.tsx`) to run backend-canonical theme sync once authenticated.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/pages/api/user/settings.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/pages/api/user/settingsShared.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/store/themeStore.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/store/themeStore_types.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/theme/themeSettingsService.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/pages/_document.tsx`
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`
- `/Users/AndrewPinon/projects/workdash/docs/handoffs/theming/phase-03-theme-engine.md` (new)

## API / Schema / Event Contract Changes
- New frontend route:
  - `GET /api/user/settings` => `{ theme: ThemeId | null }`
  - `PATCH /api/user/settings` expects `{ theme: ThemeId | null }`
- Backend-canonical startup behavior:
  - local storage theme is applied immediately for UX continuity
  - backend result overwrites local as canonical when available
  - if backend fetch fails, local/default remains active

## Validation Results
- Command: `npm run lint`
- Result: pass (eslint warning only: React version not specified in eslint-plugin-react settings).

## Open Risks / Follow-ups
- Global token registry still needs multi-theme CSS variable blocks.
- User settings modal still lacks theme selection controls.
- Guardrails for `dark:` and hex usage are not yet in place.

## Exact Next-Phase Checklist
1. Re-read `/Users/AndrewPinon/projects/workdash/AGENTS.md`.
2. Review this handoff and check `git status`.
3. Implement Phase 4 tokenized design system in `/Users/AndrewPinon/projects/workdash/src/styles/globals.css`:
   - add `[data-theme='classic'|'cyber'|'eco'|'a11y'|'discord']` token blocks
   - preserve `--wd-*` compatibility aliases
   - keep `dark:` behavior intact for out-of-scope marketing/auth flows.
4. Run `npm run lint`.
5. Write `/Users/AndrewPinon/projects/workdash/docs/handoffs/theming/phase-04-token-system.md`.
