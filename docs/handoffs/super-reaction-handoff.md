# Super Reaction — Frontend Handoff (Phases 2 & 3)

## Summary
Full frontend implementation of Discord-style super reactions. Long-press on an existing reaction chip triggers a super reaction with animation burst and glow effect.

## Phase 2 — Plumbing

### Types (`_types.ts`)
- `ChatV2MessageReaction`: added `superCount: number`, `viewerSuperReacted?: boolean`
- `ChatV2MessageReactionUpdate`: added `"SUPER_TOGGLED"` to action union, added `superCount: number`

### Service (`chatV2Service.ts`)
- `superReaction()`: emits `chat:v2:message:reaction:super`
- `onSuperReactionUpdate` handler: listens for `chat:v2:message:reaction:super:update`
- Teardown wired in closure

### Store (`chatV2Store.ts`)
- `superReaction()` action: calls service, applies update, sets `viewerSuperReacted` from response
- `applyReactionUpdate()`: includes `superCount` in server-authoritative fields; does NOT put `viewerReacted`/`viewerSuperReacted` in `nextReaction` (preserved via spread)
- `onSuperReactionUpdate` handler: wired alongside existing reaction update handler
- `toggleMessageReaction` ack: clears `viewerSuperReacted: false` on `REMOVED` action

### Hook (`useLongPress.ts`) — NEW
- 500ms default delay, configurable
- Pointer event handlers with move threshold (10px), cancel support
- Click suppression via `shouldSuppressClick()`
- `onContextMenu` prevention

## Phase 3 — Visual Polish

### ReactionChipButton (`ReactionChipButton.tsx`) — NEW
- Extracted per-chip component from `MessageReactionChips`
- `React.memo` wrapped for performance
- Long-press handlers (only when `viewerReacted === true`)
- Glow class `wd-super-reaction-glow` when `superCount > 0`
- Sparkle SVG icon next to count when super-reacted
- Framer-motion scale pulse on trigger
- `SuperReactionBurst` overlay for Lottie animation

### SuperReactionBurst (`SuperReactionBurst.tsx`) — NEW
- Lottie animation overlay (48x48, pointer-events-none)
- `AnimatePresence` for mount/unmount transitions
- `loop={false}`, auto-unmounts on complete

### Animation System
- `superReactionAnimations.ts`: emoji-to-URL mapping with `/animations/super-reactions/` base path
- `useSuperReactionAnimation.ts`: preloads on `onPointerDown`, module-level cache (50-entry LRU), SSR guard
- Placeholder Lottie JSON files in `public/animations/super-reactions/` (heart, thumbsup, laughing, default)

### CSS (`globals.css`)
- `.wd-super-reaction-glow`: accent-colored box-shadow using `--wd-accent-rgb` tokens

### Wiring
- `MessageReactionChips`: now accepts `onSuperReaction` prop, renders `ReactionChipButton`
- `MessageList`, `ThreadPanel`, `DeskChatShell`, `CompactChatShell`: all pass `onSuperReaction` through

### Dependencies
- `lottie-react@^2.4.1` (uses `lottie-web` SVG-only renderer, ~24KB gzip)

## Verification
- 154 frontend tests pass (Node 23)
- Build succeeds (Node 20)
- 170 backend tests pass (Node 23)
