# Phase 3: Polish & Testing

> **Feature:** Search-Term Highlighting
> **Phase:** 3 of 3
> **Depends on:** `01-phase-foundation.md`, `02-phase-integration.md`
> **Estimated scope:** Medium (single session, ~60 min — most of it is the first test suite in the repo)

## Context from Previous Phase

The feature is functionally complete after Phase 2:

**Files created/modified in previous phases:**
- `src/common/utils/highlightText.ts` — pure: `escapeRegExp`, `buildHighlightMatcher(query): RegExp | null`, `splitOnMatches(text, query): HighlightSegment[]`, `HighlightSegment`.
- `src/common/components/DeskMode/HighlightedText.tsx` — renders matched runs in `<mark className="wd-search-hl">`; empty query → plain text.
- `src/styles/globals.css` — `.wd-search-hl` (low-alpha `--wd-accent-soft` tint).
- `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` — now takes `query: string`; highlights body, sender name, room heading.
- `src/common/components/DeskMode/ChatPaneContainer.tsx` — passes `query={debouncedSearchQuery.trim()}`.

Highlighting works end-to-end in the search panel. What remains: prove the edge cases hold, confirm a11y/contrast, and lock it with tests (the repo has **zero** colocated tests today, though the Vitest harness is fully configured).

## Existing Codebase Context

- `vitest.config.ts` — `globals: true`, `environment: "jsdom"`, `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`, `setupFiles: ["./src/tests/setup.ts"]`, alias `@ → ./src`. **Tests run on Node 23** (`nvm use 23 && npm test`); the app **builds on Node 20** (`CLAUDE.md` "Build & Test").
- `src/tests/setup.ts` — already imports `@testing-library/jest-dom` and stubs canvas. No extra setup needed.
- `CLAUDE.md` "General Testing Rules" — query by role/accessible name; test the contract not the implementation; mock at module boundaries. `@testing-library/react` is installed.
- `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` — for the render test you'll pass a small `messages: ChatV2Message[]` fixture, `roomsById`, and `query`. Check the imported types in that file's header for the exact shapes (`ChatV2Message`, `ChatV2Room`, `ChatV2MessageSearchSort`).

## Objective

Turn a working feature into a robust, regression-protected one: handle the nasty inputs (regex-special queries, unicode, very long clamped content), verify the highlight is accessible and theme-correct, and establish the colocated test pattern the repo has been missing.

## Architecture Decisions

### Decision: Establish colocated `*.test.ts(x)` as the repo's test pattern
- **Choice:** Put `highlightText.test.ts` and `HighlightedText.test.tsx` next to their sources; `DeskSearchResultsPanel.test.tsx` next to the panel.
- **Alternatives considered:** A separate `__tests__/` tree.
- **Rationale:** `vitest.config.ts` already globs `src/**/*.test.ts(x)`; colocation matches `CLAUDE.md` ("Tests: colocated alongside source").
- **Tradeoff:** None.

### Decision: Unit-test the logic heavily, render-test the UI lightly
- **Choice:** Exhaustive cases on the pure util; a handful of behavior assertions on the component and panel.
- **Rationale:** Testing trophy (`anti-patterns.md` "No Integration Tests" / "Testing Implementation Details"). The regex logic is where bugs live; the components are thin.
- **Tradeoff:** None.

## Implementation Steps

### Step 1: Lock edge-case behavior in the utility

**What:** Confirm (and fix if needed) the Phase-1 util against adversarial inputs.

**File(s):** `src/common/utils/highlightText.ts` (only if a case fails)

**Details:** Walk these by hand or via the tests in Step 4, and ensure each holds:
- Regex-special query (`.*`, `(`, `c++`, `[a-z]`) → matched **literally**, no throw, no over-match.
- Whitespace-only / empty query → `null` matcher, identity split.
- Duplicate tokens (`deploy deploy`) → deduped, each occurrence still highlighted once per position.
- Adjacent/overlapping tokens → non-overlapping left-to-right segmentation, no dropped characters (concatenating all `segment.text` must reconstruct the input exactly — make this an explicit assertion).
- Case-insensitivity (`Deploy` query highlights `deploy`).
- Unicode/emoji content → no crash; ASCII case-folding only (documented limitation, not a bug).

> **ANTI-PATTERN: Lossy segmentation**
> ❌ Don't: let `splitOnMatches` drop or duplicate characters around matches.
> ✅ Instead: assert `segments.map(s => s.text).join('') === input` in tests; fix the loop if it fails.
> 💡 Why: a highlighter that silently alters the displayed text is worse than no highlighter.

### Step 2: Decide the single-char-token policy

**What:** From the Phase-2 smoke test, decide whether 1-char tokens highlight or the floor rises to 2.

**File(s):** `src/common/utils/highlightText.ts` (one-line filter change if raising the floor)

**Details:** If 1-char highlights are noisy, change the token filter to `.filter(t => t.length >= 2)` in `buildHighlightMatcher`. Either way, codify the choice with a test so it can't silently regress. Default: keep ≥ 1 unless the smoke test showed noise.

### Step 3: Verify accessibility, contrast, and reduced motion

**What:** Confirm the highlight is legible and announced, and respects motion preferences.

**File(s):** `src/styles/globals.css` (only if contrast needs a nudge)

**Details:**
- **Contrast:** Inspect `<mark className="wd-search-hl">` text over the result card (`wd-bg-elevated`) in both themes. Body text must keep ≥ 4.5:1. `--wd-accent-soft` is a low-alpha tint over the card, so the underlying text color is preserved — verify in DevTools. If a theme's tint washes the text out, increase the alpha via the token or switch the mark to `--wd-accent-soft-solid` and verify again. **No raw hex** (`scripts/theme-guardrails.cjs`).
- **Semantics:** `<mark>` is the correct element (conveys "relevance/highlight" to AT). Don't add `aria-*`; don't replace it with a styled `<span>`.
- **Motion:** The highlight is static (no animation), so no `prefers-reduced-motion` work is required. Confirm you didn't add a transition/pulse to `.wd-search-hl`. (The main-timeline row flash is a separate, pre-existing surface — leave it.)

> **ANTI-PATTERN: Gray-on-tint washout**
> ❌ Don't: assume the tint is fine because it looks OK in one theme.
> ✅ Instead: check both themes; bump ink toward primary if the muted text dips under 4.5:1 (PRODUCT.md accessibility note: "bump ink toward cream-white when in doubt").
> 💡 Why: low-alpha tints can drop contrast just enough to fail AA on the lighter theme.

### Step 4: Write the utility unit tests

**What:** Exhaustive pure-function tests — the first test file in `src`.

**File(s):** `src/common/utils/highlightText.test.ts`

**Details:** Use Vitest globals (`describe`/`it`/`expect` — no imports needed; `globals: true`). Cover:
- `escapeRegExp` escapes each special char.
- `buildHighlightMatcher`: `''`/whitespace → `null`; single & multi token → a `RegExp` that matches expected substrings; dedupes.
- `splitOnMatches`: empty query identity; `''` text → `[]`; single match; multi-term any-order; no match; adjacent matches; regex-special query; case-insensitive; **reconstruction invariant** (`join('') === input`).

> **ANTI-PATTERN: Testing the regex source string**
> ❌ Don't: assert `matcher.source === '(deploy|green)'`.
> ✅ Instead: assert behavior — what `splitOnMatches` returns for given inputs.
> 💡 Why: the source is an implementation detail; behavior is the contract (`anti-patterns.md` "Testing Implementation Details").

### Step 5: Write the component test

**What:** Confirm `HighlightedText` renders marks for matches and plain text otherwise.

**File(s):** `src/common/components/DeskMode/HighlightedText.test.tsx`

**Details:** With `@testing-library/react`:
- `render(<HighlightedText text="the deploy is green" query="deploy green" />)` → `screen.getByText('deploy').tagName` is `MARK`; `getByText('green')` is `MARK`; the words between are not marked.
- Empty query → no `<mark>` in the container (`container.querySelectorAll('mark')` length 0) and the full text is present.
- Regex-special query (e.g. `(`) → no throw, renders.

### Step 6: Write the panel render test

**What:** One integration-style test that the panel highlights body/sender/room and no-ops on empty query.

**File(s):** `src/common/components/DeskMode/DeskSearchResultsPanel.test.tsx`

**Details:** Build a minimal `ChatV2Message[]` fixture (two messages in one room; one with content containing the query, one attachment-only with empty content) and a `roomsById` map whose room name contains the query. Render the panel with required props (`sort="LATEST"`, `isLoading={false}`, `error={null}`, no-op handlers).
- With `query="deploy"` and a message body "ship the deploy" → that card contains a `<mark>` with "deploy".
- Room name containing "deploy" → heading contains a `<mark>`.
- Attachment-only message → its card shows the fallback label and contains no `<mark>`.
- With `query=""` → the whole panel contains zero `<mark>`.

> **ANTI-PATTERN: Asserting on CSS classes**
> ❌ Don't: assert the card has class `wd-search-hl`.
> ✅ Instead: assert the matched text is inside a `<mark>` element and the right words are/aren't highlighted.
> 💡 Why: classes are implementation detail; the observable contract is "the searched word is highlighted."

---

## State Management for This Phase

| State | Category | Location | Source of Truth | Persistence |
|-------|----------|----------|----------------|-------------|
| (none) | — | — | — | — |

No new state. Polish and tests only.

## Error Handling

| Operation | Failure Mode | User-Facing Behavior | Recovery Strategy |
|-----------|-------------|---------------------|-------------------|
| Adversarial query (regex chars) | would throw with naive regex | Matched literally, no crash | `escapeRegExp` (verified by test) |
| Very long content under `line-clamp-4` | marks could affect layout | Clamp still applies; inline marks wrap normally | `box-decoration-break: clone` on `.wd-search-hl` |
| Theme contrast dip | washed-out highlighted text | — | Step 3 contrast check; bump token if needed |

## Testing Requirements for This Phase

- [ ] Utility unit tests pass (all Step 4 cases, incl. reconstruction invariant).
- [ ] Component test: marks for matches, none for empty query, no throw on regex-special input.
- [ ] Panel test: body/sender/room highlight; attachment fallback unhighlighted; empty query → zero marks.
- [ ] Manual: AA contrast holds in both themes; long clamped messages render cleanly.

**Test type guidance:** Unit (util) carries the bulk; one component render test; one panel integration test. No E2E.

## Acceptance Criteria

- [ ] `highlightText.test.ts`, `HighlightedText.test.tsx`, `DeskSearchResultsPanel.test.tsx` exist and pass.
- [ ] Reconstruction invariant asserted (`segments.join('') === input`).
- [ ] Highlight is legible (≥ 4.5:1) in both themes; uses only `--wd-*` tokens.
- [ ] Single-char-token policy is decided and codified in a test.
- [ ] No regression in search behavior, jump-to-result, or unrelated rendering.

**Verification commands:**
- `nvm use 23 && npm test` — all tests pass (Node 23 for Vitest).
- `nvm use 20 && npm run build` — builds (Node 20).
- `npm run lint` — passes (no raw hex; theme guardrail green).
- `npx tsc --noEmit` — no type errors.

**Smoke test:** Search a regex-special string (e.g. `c++` or `.`) in a channel — no crash, literal terms highlighted. Search a teammate's name — name + matching message bodies highlight. Toggle theme — highlighted text stays readable. Run `npm test` — the three new suites pass.

## Handoff to Next Phase

This is the final phase. On completion, search-term highlighting ships: matched words are highlighted in the search results panel (body, sender, room), edge cases are covered, accessibility is verified, and the repo has its first colocated Vitest suites establishing the pattern for future tests. The main timeline remains unchanged (whole-row flash on jump). Deferred items (in-timeline term highlighting, attachment-filename/stemmed-match coverage) are recorded in `00-overview.md` → Out of Scope / Open Questions.

**Open questions for next phase:** None — feature complete. Future enhancement candidates live in the overview's Out of Scope list.
