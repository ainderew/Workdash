# CLAUDE.md

> Known bugs, UX debt, and deferred work for BOTH repos live in `BACKLOG.md`
> (repo root) — check it before starting bugfix/improvement work.

The app has two mutually exclusive modes toggled via `uiStore.interactionMode`:

- **"world"** — Phaser game canvas is active; 2D avatar movement, proximity audio, spatial interactions
- **"desk"** — Phaser loop is paused (`game.loop.sleep()`); full-screen Discord-like chat UI renders via `DeskLayout`

Mode is persisted to localStorage and URL query param (`?mode=desk|world`).

## Architecture

- This is a **Pages Router** project (`pages/`, `_app.tsx`, `_document.tsx`) — not App Router. There are no Server Components, no `layout.tsx`, and no `"use client"` directives.
- `App.tsx` is the client-side shell loaded via `next/dynamic({ ssr: false })` — all game/chat logic lives here.
- Service initialization happens in `App.tsx` `useEffect` after auth — this is the correct pattern for Pages Router singleton setup.

## Project Structure

```
src/
├── pages/              # Next.js routes — thin wrappers, delegate to feature components
├── App.tsx             # Client shell — service init, mode switching, auth gate
├── components/ui/      # shadcn/ui primitives (button, input, avatar, etc.)
├── common/
│   ├── components/     # Feature UI organized by domain (DeskMode/, Poll/, UiControls/)
│   ├── hooks/          # Shared hooks used across features
│   ├── store/          # Zustand stores — one file per domain
│   ├── utils/          # Pure helper functions
│   ├── config/         # App-wide constants
│   └── keyboard/       # Keyboard shortcut utilities
├── communication/      # Socket.io + WebRTC services organized by protocol
│   ├── chatV2/         # Chat service + types
│   ├── mediaTransportService/
│   ├── videoChat/, audioChat/, screenShare/, callSignaling/
│   └── reaction/, poll/, music/, status/
├── game/               # Phaser game logic (world mode only)
│   ├── scenes/, character/, managers/, multiplayer/, audio/
│   └── EventBus.ts     # Phaser ↔ React bridge
├── types/              # Shared global type definitions
└── styles/globals.css  # Design tokens + utility classes
```

**Where to put new code:**
- **New UI feature** → `common/components/{FeatureName}/` — PascalCase folder, colocate components + hooks + types
- **New shared hook** → `common/hooks/use{Name}.ts`
- **New store** → `common/store/{name}Store.ts` (only for app-wide domain state, not transient UI)
- **New service** → `communication/{featureName}/{featureName}Service.ts` with singleton pattern
- **New game logic** → `game/{feature}/` — never import React components here
- **New page** → `pages/{route}.tsx` — keep thin, import feature component from `common/components/`

**Feature folder structure** scales with complexity:
- **Small** (< 5 files): flat folder with components + `_types.ts`
- **Large** (like DeskMode): nested subdirs for `modals/`, `hooks/`, sub-features, with barrel `index.ts` in organized subfolders

## File & Naming Conventions

- **Component files**: PascalCase (`DeskLayout.tsx`, `CallBanner.tsx`)
- **Folders**: PascalCase for feature folders (`DeskMode/`, `Poll/`, `UiControls/`)
- **Hooks**: camelCase with `use` prefix (`useUiControls.ts`, `useChatNotificationSound.ts`)
- **Services**: camelCase (`chatV2Service.ts`, `mediaTransportService.ts`)
- **Types**: `_types.ts` for feature-internal types, inline `Props` interface for component-local
- **Enums**: `_enums.ts`
- **Constants**: `constants.ts`
- **Tests**: colocated alongside source (`chatV2Service.test.ts`, `buildTileData.test.ts`)
- **Barrel exports**: `index.ts` in organized subfolders only — not at feature root level

## Key Patterns

- **Singleton services**: `MediaTransportService`, `ChatV2Service`, `Multiplayer` — use `getInstance()`. Initialized in `App.tsx` after auth.
- **Two socket connections**: `Multiplayer` socket (game state, movement) and `MediaTransportService` socket (SFU, audio/video, chat). Both connect to `SFU_SERVER_URL`.
- **Chat protocol**: `ChatV2Service` wraps socket.io emit/ack patterns with typed `AckResponse<T>` wrappers. Realtime events are wired into `chatV2Store` via handler callbacks.
- **Phaser ↔ React bridge**: `EventBus` (Phaser `Events.EventEmitter`) sends events like `"current-scene-ready"`. React reads game state; game reads Zustand stores directly via `useStore.getState()`.

## Design Patterns

- **Singleton** — All communication services use private `instance` + `getInstance()`. Never instantiate directly.
- **Observer/EventEmitter** — `EventBus` decouples Phaser scenes from React. Prefer emitting events over direct imports between game and UI code.
- **Facade** — `ChatV2Service` wraps raw socket.io `emitWithAck` into typed domain methods. New chat features should add methods here, not emit directly.
- **Store (Flux-like)** — Zustand stores are the single source of truth. Game code reads via `.getState()`, React via hooks. Never duplicate state across stores.

## Styling

- Custom design tokens defined as CSS variables prefixed `--wd-*` in `globals.css`
- Utility classes prefixed `wd-*` (e.g., `wd-bg-panel`, `wd-text-muted`, `wd-btn-primary`)
- shadcn/ui variables also present (standard `--background`, `--primary`, etc.)
- Path alias: `@/*` maps to `./src/*`

## Component Standards

- Function components only. One per file. File named after the component.
- Keep under ~150 lines. Extract when complexity demands it, not preemptively.
- Props interfaces in the same file, exported only if shared. Max ~8 props — more means decompose.
- Prefer composition (children, render props, slots) over boolean flags.
- next/image for all images. No raw <img>.
- next/font for fonts.
- next/dynamic with { ssr: false } for heavy client-only components.
- React.memo / useMemo / useCallback only when profiling shows a measurable problem.

## React Best Practices

- Colocate state with the component that owns it — lift only when a sibling needs it.
- Derive computed values inline or in selectors — don't sync state with useEffect.
- Custom hooks encapsulate reusable behavior (see `src/common/hooks/`). Name them `use*`, return cleanup from effects.
- Keep effects minimal: one effect per concern, always return cleanup.
- Avoid prop drilling > 2 levels — use Zustand store or composition instead.

## Boundaries

- Don't create new Zustand stores for transient UI state — use local component state.
- Don't access services outside React tree or Phaser scenes (they depend on auth context).
- Don't bypass `ChatV2Service` to emit raw socket events — the typed wrapper prevents protocol drift.
- Don't import React components from `src/game/` or Phaser code from `src/common/` — the EventBus is the boundary.

## General Testing Rules

- Query by role and accessible name (getByRole, getByLabelText). Never by test ID unless no semantic alternative exists.
- Test the contract, not the implementation. Refactoring internals must not break tests.
- Mock at module boundaries (vi.mock), not inside components.
- API client is the mockable seam for all Next.js tests. Services are the mockable seam for Express controller tests. Repositories are the seam for service tests.

## Build & Test

- **Build requires Node 20** (`nvm use 20 && npm run build`). Node 23 causes webpack "Unexpected end of JSON input" errors.
- **Tests require Node 23** (`nvm use 23 && npm test`). Vitest/Vite ESM imports fail on Node 20.
- When verifying changes, run tests on Node 23 and build on Node 20.

## Lessons Learned

- **NEVER use `git stash` to test whether a build failure is pre-existing.** Stashing wipes all in-progress edits, and if the stash is auto-dropped (e.g. by hooks or lint fixers modifying files), the work is permanently lost. Instead, use `git diff > /tmp/patch.bak` to save changes, or run the comparison in an isolated worktree/subagent.
