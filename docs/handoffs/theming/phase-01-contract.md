# Phase 01 Handoff: Theme Contract and Registry

## Scope Completed
- Added canonical frontend theme contract for 5 themes:
  - `classic`
  - `cyber`
  - `eco`
  - `a11y`
  - `discord`
- Added shared theme constants:
  - `workdash:theme` storage key
  - `data-theme` root attribute
  - default theme `classic`
- Added theme registry metadata for labels, descriptions, and swatch preview RGB channels.
- Added validation helpers for parsing and asserting `ThemeId` values.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/common/theme/_types.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/theme/themeRegistry.ts` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/theme/themeValidation.ts` (new)
- `/Users/AndrewPinon/projects/workdash/docs/handoffs/theming/phase-01-contract.md` (new)

## API / Schema / Event Contract Changes
- Frontend-only contract additions:
  - `ThemeId` union type
  - `ThemeDefinition` and swatch shape
  - shared constants for storage + attribute
- No backend/API route changes in this phase.

## Validation Results
- Command: `npm run lint`
- Result: pass (eslint warning only: React version not specified in eslint-plugin-react settings).

## Open Risks / Follow-ups
- Backend persistence is not implemented yet; theme state is not synced server-side.
- Root hydration and store wiring are not implemented yet.
- User settings theme selector UI is not implemented yet.

## Exact Next-Phase Checklist
1. Re-read `/Users/AndrewPinon/projects/workdash-media-server/AGENTS.md`.
2. Check backend `git status` and review this handoff.
3. Implement backend theme persistence via `/api/settings`:
   - Add nullable `theme` to `UserSettings` Prisma model.
   - Create/apply migration and regenerate Prisma client.
   - Validate and persist `theme` in settings controller/repository.
4. Run backend `npm run lint`.
5. Run backend `npm run build`.
6. Write backend handoff:
   - `/Users/AndrewPinon/projects/workdash-media-server/docs/handoffs/theming/phase-02-backend-settings.md`.
