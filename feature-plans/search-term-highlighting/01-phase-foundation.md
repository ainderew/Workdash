# Phase 1: Foundation — Highlight Utility + Component

> **Feature:** Search-Term Highlighting
> **Phase:** 1 of 3
> **Depends on:** None
> **Estimated scope:** Small (single session, ~45 min)

## Context from Previous Phase

This is the first phase. No prior context.

## Existing Codebase Context

Read these before starting — they define the idiom and tokens you must match:

- `src/common/components/DeskMode/MentionHighlightedContent.tsx` — the canonical "split a string with a regex, wrap matches in React nodes, return a flat node list" pattern (`wrapInlineEmojis`). **Your `HighlightedText` follows this exact shape.** It does NOT use `dangerouslySetInnerHTML`, and neither do you.
- `src/styles/globals.css` — design tokens. Confirmed available: `--wd-accent-soft` (line ~228, a low-alpha accent tint), `--wd-text-primary`. Lint (`scripts/theme-guardrails.cjs`) **forbids raw hex** in app CSS — use tokens only.
- `src/common/utils/` — where pure helpers live (e.g. `linkParser.ts`, `inlineMarkdownParser.ts`). Your utility goes here. No React imports in this folder.

## Objective

Build the two reusable, self-contained pieces this feature stands on: a **pure** tokenize-escape-split utility (`highlightText.ts`) and a **dumb** presentational component (`HighlightedText.tsx`) that renders matched runs inside `<mark>`. Sequenced first because Phase 2 only wires these into the panel — all logic and all risk (regex escaping, empty-query handling) is contained and tested here.

## Architecture Decisions

### Decision: Split logic (util) from rendering (component)
- **Choice:** A pure `src/common/utils/highlightText.ts` returns `HighlightSegment[]`; `HighlightedText.tsx` only maps segments to nodes.
- **Alternatives considered:** Putting the regex logic inside the component with `useMemo`.
- **Rationale:** SRP + testing trophy (`plan-principles.md`). The risky part (regex escaping, tokenization, edge cases) is a pure function testable without `jsdom` or RTL. The component becomes trivially correct.
- **Tradeoff:** One extra file. Worth it.

### Decision: Escape every token before building the matcher
- **Choice:** `escapeRegExp` each whitespace-split token, then join with `|` into one case-insensitive global `RegExp`.
- **Alternatives considered:** `new RegExp(query, 'gi')` directly.
- **Rationale:** A query of `.*`, `(`, `[a-z`, or `c++` would throw or match everything. Escaping is mandatory for correctness and safety (Decision #6 in overview).
- **Tradeoff:** None.

### Decision: Empty/whitespace query → identity
- **Choice:** `buildHighlightMatcher('')` returns `null`; `splitOnMatches(text, '')` returns `[{ text, isMatch: false }]`; the component renders the raw string.
- **Rationale:** Search runs on filters alone (no text query) — Decision in overview. Highlighting must be a no-op then, with zero `<mark>` wrappers.
- **Tradeoff:** None.

## Implementation Steps

### Step 1: Create the pure highlight utility

**What:** A no-React module that tokenizes the query, builds an escaped matcher, and splits text into match/non-match segments.

**File(s):** `src/common/utils/highlightText.ts` (Domain layer)

**Details:** Export exactly these:

```ts
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

/** Escape regex-special characters so user input is matched literally. */
export function escapeRegExp(input: string): string;

/**
 * Build a case-insensitive, global matcher from a free-text query.
 * Tokenizes on whitespace, drops empties, dedupes, escapes each token,
 * and joins with `|`. Returns null when there is nothing to match.
 */
export function buildHighlightMatcher(query: string): RegExp | null;

/**
 * Split `text` into ordered segments, marking the runs that match `query`.
 * Pure and allocation-light. Returns a single non-match segment when the
 * query is empty or there are no matches.
 */
export function splitOnMatches(text: string, query: string): HighlightSegment[];
```

Implementation notes:
- `escapeRegExp`: replace `[.*+?^${}()|[\]\\]` with `\\$&`.
- `buildHighlightMatcher`: `query.trim().split(/\s+/).filter(Boolean)`; if empty → `null`. Dedupe tokens (`[...new Set(tokens)]`). Map through `escapeRegExp`, `join('|')`, return `new RegExp(`(${pattern})`, 'gi')`.
- `splitOnMatches`: if matcher is `null` or `text` empty → `[{ text, isMatch: false }]` (when `text` is `''`, return `[]` so nothing renders). Iterate with `matcher.exec` in a loop (reset `lastIndex` to 0 first); push the gap before each match as a non-match segment and the match as `isMatch: true`; push the trailing remainder. Do not emit empty `{ text: '' }` segments.

> **ANTI-PATTERN: Raw RegExp from user input**
> ❌ Don't: `new RegExp(query, 'gi')` or interpolate the query into a pattern unescaped.
> ✅ Instead: escape every token via `escapeRegExp` before constructing the matcher.
> 💡 Why: queries like `.*`, `(`, or `c++` throw `SyntaxError` or match the entire string — a crash or a fully-highlighted card.

> **ANTI-PATTERN: Stateful regex reuse bug**
> ❌ Don't: build the matcher once at module scope and reuse it across `splitOnMatches` calls.
> ✅ Instead: build a fresh matcher per `buildHighlightMatcher` call (or reset `lastIndex = 0` before each scan).
> 💡 Why: a global (`/g`) RegExp carries `lastIndex` between `.exec` loops; a shared instance produces missed/[]-shifted matches on the next string.

> **ANTI-PATTERN: dangerouslySetInnerHTML for highlights**
> ❌ Don't: build an HTML string with `<mark>` tags and inject it.
> ✅ Instead: return data (`HighlightSegment[]`) and let React render `<mark>` elements (Step 2).
> 💡 Why: injecting HTML from message content is an XSS vector and bypasses React's escaping.

### Step 2: Create the HighlightedText component

**What:** A presentational component that renders a string with matched runs wrapped in `<mark className="wd-search-hl">`.

**File(s):** `src/common/components/DeskMode/HighlightedText.tsx` (UI layer)

**Details:**

```tsx
interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;          // forwarded to a wrapping <span> if provided
}
```

- Compute `const segments = useMemo(() => splitOnMatches(text, query), [text, query]);`
- If `query.trim() === ''` you may early-return `<>{text}</>` (or `<span className={className}>{text}</span>` when `className` is set) — the fast path; no marks.
- Otherwise map segments: non-match → the raw string; match → `<mark key={i} className="wd-search-hl">{seg.text}</mark>`.
- Wrap in `<span className={className}>` only when `className` is passed; otherwise return a fragment so it drops into existing `<p>`/heading text without extra boxes.
- Keep it under ~40 lines. One component per file, named export not required (default export is fine to match neighbors — check `MentionHighlightedContent.tsx`’s export style and match it).

> **ANTI-PATTERN: Array index keys that remount on every keystroke**
> ❌ Don't: worry about index keys here.
> ✅ Instead: index keys are correct for this static, regenerated list — segments are positional and the whole list rebuilds when `text`/`query` change.
> 💡 Why: there is no reorder or identity to preserve; positional keys are the right call.

### Step 3: Add the highlight style token

**What:** Define `.wd-search-hl` so `<mark>` uses the den palette, not the browser's default yellow.

**File(s):** `src/styles/globals.css` (add near the other `wd-*` utility classes / `--wd-*` usages)

**Details:**

```css
/* Search-term highlight — low-alpha accent tint, text stays legible. */
.wd-search-hl {
    background-color: var(--wd-accent-soft);
    color: inherit;
    border-radius: 3px;
    padding: 0 1px;
    /* override the UA mark default */
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
}
```

> **ANTI-PATTERN: Raw hex in app CSS**
> ❌ Don't: `background-color: #f0a35e;` or any literal hex.
> ✅ Instead: reference `var(--wd-accent-soft)` (and `color: inherit`).
> 💡 Why: `npm run lint` runs `scripts/theme-guardrails.cjs`, which fails the build on raw hex in app scope.

---

## State Management for This Phase

| State | Category | Location | Source of Truth | Persistence |
|-------|----------|----------|----------------|-------------|
| (none) | — | — | — | — |

This phase introduces **no state**. `HighlightedText` is pure-render from props; the utility is stateless.

## Error Handling

| Operation | Failure Mode | User-Facing Behavior | Recovery Strategy |
|-----------|-------------|---------------------|-------------------|
| `buildHighlightMatcher(query)` | query has regex-special chars | Matched literally (escaped) | Escaping prevents the failure entirely — no throw |
| `splitOnMatches(text, query)` | empty/whitespace query, or no match | Returns the text as one non-match segment | Component renders plain text, zero `<mark>` |
| `HighlightedText` render | `text` is `''` | Renders nothing | `splitOnMatches('' , …)` returns `[]` |

## Testing Requirements for This Phase

(Full suite is written in Phase 3 — here, just define coverage.)

- [ ] `escapeRegExp` neutralizes `. * + ? ^ $ { } ( ) | [ ] \`.
- [ ] `buildHighlightMatcher('')` and whitespace-only → `null`.
- [ ] `splitOnMatches` single term, multiple terms any order, no match, adjacent matches, regex-special query, case-insensitive match.
- [ ] `HighlightedText` wraps matches in `<mark>` and renders plain text for empty query.

**Test type guidance:** Utility = pure unit tests (no jsdom needed). Component = one light RTL render test. No integration/E2E in this phase.

## Acceptance Criteria

- [ ] `src/common/utils/highlightText.ts` exports `escapeRegExp`, `buildHighlightMatcher`, `splitOnMatches`, `HighlightSegment`.
- [ ] `src/common/components/DeskMode/HighlightedText.tsx` renders matched runs in `<mark className="wd-search-hl">` and plain text when `query` is empty.
- [ ] `.wd-search-hl` exists in `globals.css` using only `--wd-*` tokens (no raw hex).
- [ ] Nothing else imports these yet (Phase 2 wires them) — no behavior change in the running app.

**Verification commands:**
- `nvm use 20 && npm run build` — builds successfully (also runs through the theme guardrail in lint; run `npm run lint` too).
- `npm run lint` — passes (no raw-hex failure).
- `npx tsc --noEmit` — no type errors in the two new files.

**Smoke test:** Add a throwaway `<HighlightedText text="the deploy is green" query="deploy green" />` somewhere temporary (or a scratch unit assertion) and confirm "deploy" and "green" render inside `<mark>` with an amber tint; remove it before committing. No user-facing surface changes in this phase.

## Handoff to Next Phase

Phase 1 delivers a tested-ready pure utility (`highlightText.ts`) and a dumb `HighlightedText` component, plus the `.wd-search-hl` style. Nothing is wired into the app yet, so behavior is unchanged. Phase 2 imports `HighlightedText` into `DeskSearchResultsPanel.tsx` and threads the query down from `ChatPaneContainer.tsx`, applying it to the message body, sender name, and room heading.

**Open questions for next phase:**
- Confirm `DeskSearchResultsPanel` should receive the **trimmed** query string (yes — `debouncedSearchQuery.trim()`); the component handles empty internally.
