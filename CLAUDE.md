# CLAUDE.md

The app has two mutually exclusive modes toggled via `uiStore.interactionMode`:

- **"world"** — Phaser game canvas is active; 2D avatar movement, proximity audio, spatial interactions
- **"desk"** — Phaser loop is paused (`game.loop.sleep()`); full-screen Discord-like chat UI renders via `DeskLayout`

Mode is persisted to localStorage and URL query param (`?mode=desk|world`).

## Key Patterns

- **Singleton services**: `MediaTransportService`, `ChatV2Service`, `Multiplayer` — use `getInstance()`. Initialized in `App.tsx` after auth.
- **Two socket connections**: `Multiplayer` socket (game state, movement) and `MediaTransportService` socket (SFU, audio/video, chat). Both connect to `SFU_SERVER_URL`.
- **Chat protocol**: `ChatV2Service` wraps socket.io emit/ack patterns with typed `AckResponse<T>` wrappers. Realtime events are wired into `chatV2Store` via handler callbacks.
- **Phaser ↔ React bridge**: `EventBus` (Phaser `Events.EventEmitter`) sends events like `"current-scene-ready"`. React reads game state; game reads Zustand stores directly via `useStore.getState()`.

## Styling

- Custom design tokens defined as CSS variables prefixed `--wd-*` in `globals.css`
- Utility classes prefixed `wd-*` (e.g., `wd-bg-panel`, `wd-text-muted`, `wd-btn-primary`)
- shadcn/ui variables also present (standard `--background`, `--primary`, etc.)
- Path alias: `@/*` maps to `./src/*`
