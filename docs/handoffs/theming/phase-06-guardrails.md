# Phase 06 Handoff: Theming Guardrails (Phased Strictness)

## Scope Completed
- Added app-scope theme guardrail script:
  - `/Users/AndrewPinon/projects/workdash/scripts/theme-guardrails.cjs`
- Wired guardrails into frontend lint command:
  - `npm run lint` now runs ESLint and then theme guardrail checks.
- Enforced guardrail checks in scoped game/app paths:
  - `src/App.tsx`
  - `src/pages/app.tsx`
  - `src/common/**`
  - `src/components/ui/**`
- Guardrails currently enforce:
  1. No `dark:` variant usage in scoped app paths.
  2. No hardcoded hex colors in scoped app `.ts/.tsx`, except explicit legacy allowlist files.
  3. Semantic color utility enforcement in strict subpaths:
     - `src/App.tsx`
     - `src/pages/app.tsx`
     - `src/components/ui/**`
     - `src/common/components/DeskMode/modals/**`
- Removed `dark:` usages from:
  - `/Users/AndrewPinon/projects/workdash/src/components/ui/button.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/components/ui/input.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/components/ui/textarea.tsx`

## Files Changed
- `/Users/AndrewPinon/projects/workdash/scripts/theme-guardrails.cjs` (new)
- `/Users/AndrewPinon/projects/workdash/package.json`
- `/Users/AndrewPinon/projects/workdash/src/components/ui/button.tsx`
- `/Users/AndrewPinon/projects/workdash/src/components/ui/input.tsx`
- `/Users/AndrewPinon/projects/workdash/src/components/ui/textarea.tsx`
- `/Users/AndrewPinon/projects/workdash/docs/handoffs/theming/phase-06-guardrails.md` (new)

## PR Review Checklist (Team Guardrail Reference)
1. Do not add `dark:` utilities in app/game scope files.
2. Do not add hex color literals in app/game `.tsx`/`.ts` files.
3. Prefer semantic utilities and theme tokens (`bg-background`, `text-foreground`, `ring-primary`, `wd-*` compatibility tokens) over palette literals.
4. If a legacy file needs temporary exceptions, update guardrail allowlists intentionally in the same PR with rationale.

## Validation Results
- Command: `npm run lint`
- Result: pass
  - ESLint pass (existing warning remains: React version not specified).
  - Guardrail script pass (`Theme guardrails passed.`).

## Open Risks / Follow-ups
- Hex allowlist still contains deferred legacy files (soccer/character/Google icon/sidebar) and should shrink over time.
- Guardrails currently enforce semantic utility strictness only in core theming paths; broader adoption remains a follow-up migration.

## Exact Next-Phase Checklist
1. Re-read `/Users/AndrewPinon/projects/workdash/AGENTS.md` and backend AGENTS.
2. Check frontend and backend `git status`.
3. Run full validation:
   - frontend: `npm run lint`, `npm run build`
   - backend: `npm run lint`, `npm run build`
4. Perform manual acceptance checks for theme selection/apply/persistence/fallback.
5. Write final handoff docs:
   - `/Users/AndrewPinon/projects/workdash/docs/handoffs/theming/phase-07-validation.md`
   - `/Users/AndrewPinon/projects/workdash-media-server/docs/handoffs/theming/phase-07-validation.md`.
