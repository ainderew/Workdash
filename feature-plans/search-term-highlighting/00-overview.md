# Feature Plan: Search-Term Highlighting

> **Created:** 2026-06-17
> **Phases:** 3 (plus this overview)
> **Stack:** Next.js 15 (Pages Router), React 19, TypeScript (strict), Zustand, Tailwind v4 (`--wd-*` tokens), Vitest + Testing Library
> **Status:** Planning

## Codebase Context

- **Project structure:** Feature UI lives under `src/common/components/DeskMode/`. Pure helpers live in `src/common/utils/`. Path alias `@/*` → `./src/*`.
- **Existing patterns:**
  - **Content rendering pipeline:** `MessageContentRenderer.tsx` → `TextSegmentRenderer` → `renderTextLine` → `MentionHighlightedContent.tsx`. The leaf components split a string with a regex and wrap matches in React elements (see `MentionHighlightedContent.tsx` `wrapInlineEmojis` for the exact split-and-wrap idiom). **Our highlight utility mirrors this idiom.**
  - **Search flow:** Query state is owned by `ChatPaneContainer.tsx` (`searchQuery` → debounced `debouncedSearchQuery`, min 2 chars). `chatV2Service.searchMessages(...)` returns `ChatV2Message[]` into `searchResults`, rendered by `DeskSearchResultsPanel.tsx`. Search can also run on `fromUser`/`room` filters with **no text query**.
  - **Jump-to-result:** Clicking a card → `onSelectSearchResult` → `selectRoom()` + `setFocusedMessageId()`. The main timeline already flashes the whole jumped-to row (`MessageRow.tsx:244` → `bg-[var(--wd-accent-soft)]`). We do **not** touch this.
- **Related code:** `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` (the only render surface we modify), `src/common/components/DeskMode/ChatPaneContainer.tsx` (owns the query, passes it down).
- **Testing setup:** Vitest (`vitest.config.ts`, `globals: true`, `jsdom`, `setupFiles: ./src/tests/setup.ts` with `@testing-library/jest-dom`). Colocated `*.test.ts(x)` is an established pattern — the repo has 100+ existing tests. Closest analogs to follow: `src/common/utils/linkParser.test.ts` (pure util) and `src/common/components/TextChat/UnifiedLinkPreview.test.tsx` (component render). Tests run on Node 23 (`nvm use 23 && npm test`); build on Node 20.
- **Styling approach:** `--wd-*` CSS variables + `wd-*` utility classes. Lint (`npm run lint`) runs `scripts/theme-guardrails.cjs` which **forbids raw hex** in app scope. Existing token `--wd-accent-soft` (a low-alpha accent tint) is the highlight background.

## Feature Summary

When a user searches messages, the words they searched for are currently shown un-highlighted in the results list — they have to re-scan each result to see why it matched. This feature wraps the matched query terms in a highlight (`<mark>`) inside each search-result card: in the **message body**, the **sender name**, and the **channel/group heading**. Highlighting is best-effort and presentation-only; it changes nothing about how search matches are computed, and the main chat timeline is untouched.

## Architecture Overview

Pure logic (domain) → dumb presentational component (UI) → wired into one existing panel (integration). No store, no service, no network, no new state.

```
ChatPaneContainer (owns debouncedSearchQuery)
        │  query: string (trimmed)
        ▼
DeskSearchResultsPanel  ──uses──►  <HighlightedText text=… query=… />   (UI leaf)
        (message body,                          │
         sender name,                           ▼
         room heading)                splitOnMatches(text, query)        (pure, tested)
                                                 │
                                       buildHighlightMatcher(query)       (pure, escaped regex)
```

- **Domain layer:** `src/common/utils/highlightText.ts` — pure functions, no React. Tokenizes the query, escapes regex-special chars, returns text split into `{ text, isMatch }` segments. This is the unit-tested core.
- **UI layer:** `src/common/components/DeskMode/HighlightedText.tsx` — maps segments to text/`<mark>`. Empty query → returns plain text (fast path). Knows nothing about search.
- **Integration:** `DeskSearchResultsPanel.tsx` gains a `query` prop and uses `<HighlightedText>` in three spots. `ChatPaneContainer.tsx` passes `debouncedSearchQuery.trim()`.

## Decisions Log

| # | Decision | Choice | Rationale | Date |
|---|----------|--------|-----------|------|
| 1 | Highlight scope | Search results panel only (not the main timeline) | Self-contained string render; threading the query through the 5-layer message pipeline (code blocks/links/mentions/emoji/markdown) is high-risk for marginal value. Confirmed with user. | 2026-06-17 |
| 2 | Match logic | Per-word, any order (tokenize on whitespace) | Closest to how full-text search tokenizes; "deploy green" highlights both words wherever they appear. Confirmed with user. | 2026-06-17 |
| 3 | Match fields | Message body + sender name + room heading | All three are plain strings in the same card component; cheap to cover with one utility. Confirmed with user. | 2026-06-17 |
| 4 | Logic location | Pure util + dumb component (split responsibilities) | SRP + testing trophy: regex/tokenizing logic is unit-tested without React; component stays presentational. Mirrors `MentionHighlightedContent` idiom. | 2026-06-17 |
| 5 | Highlight style | `<mark>` with `--wd-accent-soft` bg, inherited text color | Semantic + announced by AT; low-alpha tint keeps underlying text legible (same treatment as row-flash); satisfies no-raw-hex guardrail. | 2026-06-17 |
| 6 | Regex safety | Escape every token before building the matcher | A query like `.*` or `(` would crash or mis-highlight a naive `new RegExp(query)`. Non-negotiable. | 2026-06-17 |

## API Surface

None. No routes, actions, services, or store changes. This is a pure client-presentation feature.

## Data Model

No new entities, types persisted, or schema. One internal type:

```ts
// src/common/utils/highlightText.ts
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}
```

## Phase Index

| Phase | File | Focus | Key Deliverables |
|-------|------|-------|-----------------|
| 0 | `00-overview.md` | This document | Architecture, decisions, scope |
| 1 | `01-phase-foundation.md` | Foundation | `highlightText.ts` pure util + `HighlightedText.tsx` component + `.wd-search-hl` style |
| 2 | `02-phase-integration.md` | Integration | Wire `query` from `ChatPaneContainer` → `DeskSearchResultsPanel`; highlight body + sender + room |
| 3 | `03-phase-polish-testing.md` | Polish & Testing | Edge cases, a11y, reduced-motion, and colocated Vitest suites (util + component + panel) |

## Out of Scope

- Highlighting the matched term inside the **main chat timeline** message (only the whole-row flash on jump remains). Deferred — would require threading the query through `MessageContentRenderer` and its sub-renderers.
- Highlighting inside **code blocks**, **link previews**, or **attachment filenames**.
- Changing **search matching** itself (ranking, stemming, fuzzy, filters). Highlight is best-effort over what the backend already returned.
- A "jump to next match within a message" / in-message match navigation.
- Highlighting in any other surface (pinned panel, notifications, thread panel).

## Open Questions

- 🟢 **Backend tokenization may differ from client highlighting.** If the backend stems ("deploying" matches "deploy") or matches on attachment filenames, the client highlight won't cover those — a result can legitimately show with nothing highlighted. This is acceptable and noted as a known limitation (Phase 3 surfaces it in copy/tests, not a blocker).
- 🟢 **Single-character tokens** (e.g. query `a deploy`): plan keeps tokens ≥ 1 char but dedupes and ignores pure-whitespace. If 1-char highlights feel noisy in practice, raise the floor to 2 in `buildHighlightMatcher` — isolated one-line change.
