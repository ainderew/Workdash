# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080 (with log overlay)
npm run dev-nolog    # Start dev server on port 8080 (without log overlay)
npm run build        # Production build
npm run lint         # ESLint with auto-fix: eslint 'src/**/*.{ts,tsx}' --fix
```

No test runner is configured.

## Environment Variables

- `NEXT_PUBLIC_SERVER_URL` — Backend API (default `http://localhost:3000`)
- `NEXT_PUBLIC_SFU_SERVER_URL` — SFU/WebSocket server (default `http://localhost:4000`)

Config is read from `src/common/utils/config.ts`.

## Architecture

**Workdash** is a collaborative virtual workspace combining a 2D Phaser game world with a Discord-style chat UI ("Desk Mode"), real-time audio/video/screen sharing, and a WebSocket-backed communication layer.

### Tech Stack

Next.js 15 (Pages Router) + React 19 + Phaser 3 + Tailwind CSS v4 + Zustand + Socket.IO + mediasoup-client. Auth via next-auth with Google OAuth. shadcn/ui primitives in `src/components/ui/`.

### Two Interaction Modes

The app has two mutually exclusive modes toggled via `uiStore.interactionMode`:

- **"world"** — Phaser game canvas is active; 2D avatar movement, proximity audio, spatial interactions
- **"desk"** — Phaser loop is paused (`game.loop.sleep()`); full-screen Discord-like chat UI renders via `DeskLayout`

Mode is persisted to localStorage and URL query param (`?mode=desk|world`).

### Source Layout

```
src/
├── pages/              # Next.js Pages Router (login, app, API routes)
│   └── api/auth/       # next-auth config
├── App.tsx             # Main app shell — bootstraps services, switches modes
├── PhaserGame.tsx      # React ↔ Phaser bridge (ref-forwarded)
├── game/               # Phaser-only code (no React)
│   ├── main.ts         # Phaser Game config & scene registration
│   ├── scenes/         # Boot → Preloader → MainMap, SoccerMap
│   ├── multiplayer/    # Multiplayer socket (separate from MediaTransport)
│   ├── player/         # Player entity, enums
│   ├── character/      # Character sprite/customization types
│   ├── audio/          # Background music, audio settings
│   ├── audioZoneManager/ # Proximity-based audio zones
│   └── EventBus.ts     # Phaser ↔ React event bridge
├── common/
│   ├── store/          # Zustand stores (global state)
│   │   ├── useStore.ts     # User identity store
│   │   ├── uiStore.ts      # UI panels, interaction mode, mic/video state
│   │   ├── chatV2Store.ts  # Chat rooms, messages, threads, reactions, DMs
│   │   ├── playerStore.ts  # Multiplayer player positions
│   │   ├── audioStore.ts   # Audio stream state
│   │   ├── pollStore.ts    # Polls
│   │   └── soccerStore.ts  # Soccer mini-game state
│   ├── components/
│   │   ├── DeskMode/       # Discord-style chat UI (channels, messages, threads, reactions)
│   │   ├── UiControls/     # World-mode bottom toolbar
│   │   ├── ScreenShare/    # Screen sharing UI
│   │   ├── VideoChat/      # Video chat UI
│   │   └── ...             # CommandPalette, Poll, Soccer, etc.
│   └── utils/
│       └── config.ts       # Environment config
├── communication/      # Service singletons (all use Socket.IO)
│   ├── mediaTransportService/ # Core socket + mediasoup Device (SFU)
│   ├── chatV2/         # Chat service, types, reaction catalog
│   ├── audioChat/      # Audio producer/consumer
│   ├── videoChat/      # Video producer/consumer
│   ├── screenShare/    # Screen share producer/consumer
│   ├── reaction/       # Emoji reactions (game world)
│   └── poll/           # Live polls
├── components/ui/      # shadcn/ui primitives (button, avatar, tooltip, etc.)
└── styles/globals.css  # Tailwind v4 config, design tokens, utility classes
```

### Key Patterns

- **Singleton services**: `MediaTransportService`, `ChatV2Service`, `Multiplayer` — use `getInstance()`. Initialized in `App.tsx` after auth.
- **Two socket connections**: `Multiplayer` socket (game state, movement) and `MediaTransportService` socket (SFU, audio/video, chat). Both connect to `SFU_SERVER_URL`.
- **Chat protocol**: `ChatV2Service` wraps socket.io emit/ack patterns with typed `AckResponse<T>` wrappers. Realtime events are wired into `chatV2Store` via handler callbacks.
- **Phaser ↔ React bridge**: `EventBus` (Phaser `Events.EventEmitter`) sends events like `"current-scene-ready"`. React reads game state; game reads Zustand stores directly via `useStore.getState()`.

### Styling

- Tailwind CSS v4 (using `@import "tailwindcss"` syntax, not `@tailwind` directives)
- Custom design tokens defined as CSS variables prefixed `--wd-*` in `globals.css`
- Utility classes prefixed `wd-*` (e.g., `wd-bg-panel`, `wd-text-muted`, `wd-btn-primary`)
- shadcn/ui variables also present (standard `--background`, `--primary`, etc.)
- Path alias: `@/*` maps to `./src/*`
