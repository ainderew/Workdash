# Phase 2: Integration — Wire Highlighting into the Search Panel

> **Feature:** Search-Term Highlighting
> **Phase:** 2 of 3
> **Depends on:** `01-phase-foundation.md`
> **Estimated scope:** Small (single session, ~30 min)

## Context from Previous Phase

Phase 1 created two self-contained pieces and a style, none of which are imported anywhere yet (the app behaves exactly as before):

**Files created in previous phases:**
- `src/common/utils/highlightText.ts` — pure functions: `escapeRegExp(s)`, `buildHighlightMatcher(query): RegExp | null`, `splitOnMatches(text, query): HighlightSegment[]`, and the `HighlightSegment` type. Tokenizes the query on whitespace, escapes each token, returns ordered `{ text, isMatch }` segments. Empty/whitespace query → a single non-match segment (or `[]` for empty text).
- `src/common/components/DeskMode/HighlightedText.tsx` — presentational component, props `{ text: string; query: string; className?: string }`. Wraps matched runs in `<mark className="wd-search-hl">`; renders plain text when `query` is empty.
- `src/styles/globals.css` — added `.wd-search-hl` (low-alpha `--wd-accent-soft` background, `color: inherit`, small radius).

## Existing Codebase Context

- `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` — the **only** component we modify here. Renders grouped results. Today, `renderMessageCard` prints the body as a plain string at the `<p>` around line 104 (`{message.content || (hasImageAttachment ? "Image attachment" : "File attachment")}`); the sender name is a `<span>` near line 96; the room/group heading is an `<h4>` near line 176. Props interface is at the top (`DeskSearchResultsPanelProps`, ~line 13). It does **not** currently receive the query.
- `src/common/components/DeskMode/ChatPaneContainer.tsx` — owns search state. `debouncedSearchQuery` (string) is the debounced text query. The panel is rendered around line 634 inside the `isSearchPanelVisible` branch. This is where we pass the new `query` prop.

## Objective

Make the searched terms visible in results by rendering the message body, sender name, and room heading through `HighlightedText`. This is the user-facing payoff of the feature; it only adds one prop and three small JSX swaps, with no new logic.

## Architecture Decisions

### Decision: Pass the query down as a plain prop (no store, no context)
- **Choice:** Add `query: string` to `DeskSearchResultsPanelProps`; `ChatPaneContainer` passes `debouncedSearchQuery.trim()`.
- **Alternatives considered:** Reading search state from a Zustand store inside the panel; React context.
- **Rationale:** The query already lives one component up and the panel is rendered directly there — prop passing is one level, well under the "avoid prop drilling > 2 levels" boundary (`CLAUDE.md`). No shared/global state is warranted (overview Decision #4; anti-pattern "Global State for Everything").
- **Tradeoff:** None at this depth.

## Implementation Steps

### Step 1: Accept a `query` prop in the search panel

**What:** Extend the panel's props with the trimmed query string.

**File(s):** `src/common/components/DeskMode/DeskSearchResultsPanel.tsx`

**Details:**
- Add `query: string;` to `DeskSearchResultsPanelProps`.
- Destructure `query` in the component signature.
- Import the component: `import HighlightedText from "./HighlightedText";` (match the actual export style chosen in Phase 1 — default vs named).

> **ANTI-PATTERN: Re-deriving the query inside the panel**
> ❌ Don't: read `searchQuery`/debounce again or recompute trimming in the panel.
> ✅ Instead: accept the already-trimmed `query` string as a prop; the parent owns it.
> 💡 Why: two sources of the same value drift apart (anti-pattern "State Synchronization"). One owner, passed down.

### Step 2: Highlight the message body

**What:** Replace the plain body string with `HighlightedText`, preserving the attachment fallback.

**File(s):** `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` (the `<p>` in `renderMessageCard`, ~line 104)

**Details:** Keep the `<p>` and all its classes (`line-clamp-4`, `whitespace-pre-wrap`, `break-words`). Inside it:
- If `message.content` is non-empty → `<HighlightedText text={message.content} query={query} />`.
- Else → keep the existing literal `"Image attachment"` / `"File attachment"` fallback **un-highlighted** (the query never matches those synthetic labels and highlighting them would be misleading).

> **ANTI-PATTERN: Highlighting synthetic fallback text**
> ❌ Don't: wrap `"Image attachment"` in `HighlightedText`.
> ✅ Instead: only highlight real `message.content`; render the fallback as-is.
> 💡 Why: those strings aren't what matched; highlighting a coincidental word ("image") misleads the user about why the result appeared.

### Step 3: Highlight the sender name

**What:** Wrap the author name span's text in `HighlightedText`.

**File(s):** `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` (sender `<span>`, ~line 96)

**Details:** Replace `{senderName}` with `<HighlightedText text={senderName} query={query} />`. Leave the `<span>` and its classes (`font-semibold wd-text-accent truncate`) intact — `HighlightedText` returns a fragment, so the span keeps owning color/weight/truncation. `<mark>` inside a `truncate` span is fine (inline).

### Step 4: Highlight the room/group heading

**What:** Wrap the channel name in the group header.

**File(s):** `src/common/components/DeskMode/DeskSearchResultsPanel.tsx` (`<h4>`, ~line 176)

**Details:** The heading is `<ChannelHashIcon …/>{group.roomName}`. Replace `{group.roomName}` with `<HighlightedText text={group.roomName} query={query} />`. Keep the `#` icon and heading classes.

### Step 5: Pass the query from the container

**What:** Supply `query` where the panel is rendered.

**File(s):** `src/common/components/DeskMode/ChatPaneContainer.tsx` (panel render, ~line 634)

**Details:** Add `query={debouncedSearchQuery.trim()}` to the `<DeskSearchResultsPanel … />` props. Use the **debounced** value so highlighting matches the results actually fetched (not keystrokes ahead of the request).

> **ANTI-PATTERN: Highlighting from the live (un-debounced) query**
> ❌ Don't: pass `searchQuery` (the raw input state).
> ✅ Instead: pass `debouncedSearchQuery.trim()`.
> 💡 Why: the live value runs ahead of the fetched results, so you'd highlight terms that don't match the currently-shown cards until the next request lands — a visible flicker.

---

## State Management for This Phase

| State | Category | Location | Source of Truth | Persistence |
|-------|----------|----------|----------------|-------------|
| `query` (prop) | server-derived/UI | `ChatPaneContainer` → panel prop | `debouncedSearchQuery` in `ChatPaneContainer` (already exists) | Not persisted (search is transient) |

No new state is introduced — only a prop pass-through of existing state.

## Error Handling

| Operation | Failure Mode | User-Facing Behavior | Recovery Strategy |
|-----------|-------------|---------------------|-------------------|
| Render with empty query (filter-only search) | `query === ''` | Cards render with **no** highlights | `HighlightedText` fast-paths empty query (Phase 1) |
| Result matched on something not in the visible text (stem/filename) | No `<mark>` appears on that card | Card shows normally, just unhighlighted | Acceptable/known limitation (overview Open Questions) |
| `message.content` empty | — | Attachment fallback shown, unhighlighted | Step 2 guard |

## Testing Requirements for This Phase

- [ ] Searching a term renders that term inside `<mark>` in the body of matching cards.
- [ ] A multi-word query highlights each word independently within a card.
- [ ] A filter-only search (no text query) renders cards with no `<mark>` elements.
- [ ] Sender name and room heading highlight when they contain the query.
- [ ] Attachment-only results (empty content) show the fallback label with no highlight.

**Test type guidance:** Best covered by an integration-style RTL test of `DeskSearchResultsPanel` with a small `messages` fixture and a `query` prop (Phase 3). No need to test `ChatPaneContainer` wiring beyond "panel receives query".

## Acceptance Criteria

- [ ] `DeskSearchResultsPanel` accepts `query: string` and uses `HighlightedText` for body, sender name, and room heading.
- [ ] `ChatPaneContainer` passes `debouncedSearchQuery.trim()` to the panel.
- [ ] Empty/filter-only query produces zero `<mark>` elements in the panel.
- [ ] No regression: clicking a result still jumps to the message (existing `onSelectResult` untouched); sort menu, grouping, loading/empty/error states unchanged.

**Verification commands:**
- `nvm use 20 && npm run build` — builds successfully.
- `npm run lint` — passes.
- `npx tsc --noEmit` — no type errors.

**Smoke test:** In the running app (`npm run dev`), open a channel with history, search a word you know appears (e.g. a teammate's name or a common word). The results panel should show that word highlighted with an amber tint in the message body, and the sender/channel name highlighted where they match. Clear the text query but keep a `from:` filter (if available) → results show with no highlights. Click a result → it still scrolls to and flashes the message in the main timeline.

## Handoff to Next Phase

Highlighting is now live in the search panel across body, sender, and room heading, driven by the debounced query. Phase 3 hardens edge cases (regex-special queries, very long messages with `line-clamp`, unicode/emoji, single-char tokens), confirms accessibility/contrast and reduced-motion, and writes the first colocated Vitest suite covering `highlightText.ts`, `HighlightedText.tsx`, and `DeskSearchResultsPanel` rendering.

**Open questions for next phase:**
- Decide whether to keep 1-char tokens highlighting or raise the floor to 2 (overview Open Question 🟢) — validate against real usage in the smoke test and lock it in Phase 3.
