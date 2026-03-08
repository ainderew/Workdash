# Floating Call Window — Phase 1 Handoff

## Status: COMPLETE

## What was built
Phase 1 establishes the core floating call window infrastructure:

1. **Store changes** (`callStore.ts`):
   - Added `floatingPosition: FloatingPosition | null` — tracks window x/y coordinates
   - Added `floatingWindowState: FloatingWindowState` — 'expanded' | 'collapsed'
   - Added `setFloatingPosition()` and `setFloatingWindowState()` actions
   - Both reset on `reset()` call

2. **Visibility hook** (`useFloatingCallVisibility.ts`):
   - Returns `{ shouldShow, channelId, callPresence }`
   - `shouldShow = true` when: user is in a call AND not viewing the call's channel AND in desk mode
   - Reads from `callStore.currentCall`, `chatV2Store.currentRoomId`, `uiStore.interactionMode`

3. **FloatingCallWindow component** (`FloatingCallWindow.tsx`):
   - Fixed position at z-[75] (above desk content z-30, below menus/modals z-120+)
   - Draggable header with pointer events + setPointerCapture
   - Snap-to-nearest-corner on drag release
   - Boundary clamping within viewport
   - Enter/exit animations (scale + opacity)
   - Expanded view: header + 2x2 video grid + controls bar (320x268px)
   - Collapsed pill: header + controls row (320x44px)
   - Glass-morphism: backdrop-blur, translucent panel background
   - Window resize handler (re-clamps position)
   - SSR-safe (typeof window guards)

4. **CallControlBar component** (`CallControlBar.tsx`):
   - Shared controls extracted from inline CallView controls
   - Props: isMuted, isVideoOff, isScreenSharing, onToggle*, onLeave
   - Optional: onToggleCollapse, onExpandToChannel
   - Two sizes: 'sm' (h-7 w-7, 13px icons) and 'md' (h-8 w-8, 15px icons)

5. **CallView refactored** (`CallView.tsx`):
   - Now uses `CallControlBar` instead of inline buttons
   - Screen share state now reads from `callStore.localMedia.screen` (was local state)
   - Both collapsed and expanded views use the shared control bar

6. **DeskChatShell integration** (`DeskChatShell.tsx`):
   - `FloatingCallWindow` mounted before modals, inside the `<section>` root
   - Import added for the new component

## Files created
- `src/common/components/DeskMode/FloatingCallWindow.tsx`
- `src/common/components/DeskMode/CallControlBar.tsx`
- `src/common/hooks/useFloatingCallVisibility.ts`

## Files modified
- `src/common/store/callStore.ts` — added floating state + actions
- `src/common/components/DeskMode/CallView.tsx` — refactored to use CallControlBar, screen share from store
- `src/common/components/DeskMode/DeskChatShell.tsx` — mount FloatingCallWindow

## Review findings addressed
1. Deleted unused `useDraggable.ts` (inline implementation is more complete)
2. Fixed resize handler stale closure (reads from store directly via `useCallStore.getState()`)
3. Screen share state uses `callStore.localMedia.screen` in both FloatingCallWindow and CallView
4. Added `onPointerCancel` handler on drag handle
5. Added SSR guards for `window.__BACKEND_USER__` and `getDefaultPosition()`
6. Removed unused `SNAP_THRESHOLD` constant

## Build verification
- TypeScript: PASS (no errors in new/modified files)
- Lint: PASS (pre-existing error in ChannelSidebar.tsx unrelated)
- Build (Node 20): PASS

## What Phase 2 should cover
1. **World mode support**: Show floating window when in world mode and in a call
2. **Mode switching**: Handle desk↔world transitions while in a call
3. **Workspace switching**: Handle workspace switch while in a call (should leave call)
4. **Resize capability**: Allow resizing the floating window
5. **Keyboard shortcuts**: Escape to collapse, Enter to expand to channel
6. **Accessibility**: aria labels, focus trap, keyboard navigation within floating window
7. **Animation polish**: Smoother collapse/expand height transitions
8. **Edge case**: Multiple rapid channel switches while in a call

## Architecture notes for Phase 2
- The `useFloatingCallVisibility` hook currently only shows in desk mode. To support world mode, remove/modify the `isDeskMode` check.
- The snap-to-corner behavior uses viewport midpoint detection — works for any corner.
- The drag implementation uses refs for `startMouse`, `startPos`, `lastPos` to avoid stale closures.
- `CallControlBar` is ready to be extended with new controls without modifying FloatingCallWindow.
