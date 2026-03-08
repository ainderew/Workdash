# Floating Call Window — Implementation Plan

## Overview
Add a Google Meet-style floating/PiP call window that appears when a user is in an active call but navigates away from the call's channel. The window is draggable within the application viewport, shows participant video tiles, and provides full call controls.

## Current State
- `CallView` renders inline between `RoomHeader` and `MessageList` inside `CallBanner`
- Only visible when viewing the call's channel
- No floating/draggable UI exists for calls
- Existing drag pattern: pointer events with `setPointerCapture` (used in CallView resize)
- Z-index range available: z-[70–79] is unused (between CommandPalette z-60 and Composer z-[99])

## Design Decisions
- **Z-index**: `z-[75]` — above desk content (z-30) and CommandPalette (z-60), below context menus and modals
- **Drag implementation**: Custom pointer events (matches existing codebase pattern, no new deps)
- **Trigger**: Floating window appears automatically when user navigates away from the call channel; dismissed when returning to it
- **State**: New `isFloating` + `floatingPosition` fields in `callStore`
- **Position persistence**: Position resets on mount (bottom-right default), persisted during session via store
- **Boundary clamping**: Window stays within viewport bounds during drag

## Phases

### Phase 1: Core Floating Infrastructure + Store
- Add `isFloating`, `floatingPosition`, `floatingSize` to `callStore`
- Create `FloatingCallWindow` component shell with draggable behavior
- Create `useFloatingCallVisibility` hook (show when in call + not viewing call channel)
- Mount `FloatingCallWindow` in `DeskChatShell` (outside the channel content flow)
- Basic positioning and drag with boundary clamping

### Phase 2: UI/UX Design + Call Controls
- Design and implement the floating window UI (video tiles grid, controls bar)
- Port call controls from `CallView` into shared `CallControlBar` component
- Add participant video rendering (reuse `CallParticipantTile` in compact mode)
- Add "expand" button to navigate back to call channel
- Add collapse/expand toggle for the floating window itself
- Smooth transitions and animations

### Phase 3: Polish, Edge Cases, and Review
- Handle resize/boundary edge cases (window resize, orientation change)
- Handle mode switching (desk ↔ world) while in a call
- Handle workspace switching while in a call
- Snap-to-corner behavior on drag end
- Accessibility (keyboard nav, focus management, aria labels)
- Final UI/UX review pass

## Files to Create
- `src/common/components/DeskMode/FloatingCallWindow.tsx` — main floating window
- `src/common/components/DeskMode/CallControlBar.tsx` — shared controls (extracted from CallView)
- `src/common/hooks/useFloatingCallVisibility.ts` — visibility logic hook
- `src/common/hooks/useDraggable.ts` — reusable drag hook

## Files to Modify
- `src/common/store/callStore.ts` — add floating state
- `src/common/components/DeskMode/DeskChatShell.tsx` — mount FloatingCallWindow
- `src/common/components/DeskMode/CallView.tsx` — extract controls into shared component
- `src/common/components/DeskMode/CallBanner.tsx` — coordinate with floating state

## UI/UX Design Spec

### Floating Window (Default State)
```
┌─────────────────────────────────┐
│  ◉ Channel Name        ─  ✕    │  ← Header: drag handle + channel name + minimize/expand
├─────────────────────────────────┤
│                                 │
│   ┌──────┐  ┌──────┐          │
│   │ Vid1 │  │ Vid2 │          │  ← Participant tiles (2x2 grid max)
│   └──────┘  └──────┘          │
│   ┌──────┐  ┌──────┐          │
│   │ Vid3 │  │ Vid4 │          │
│   └──────┘  └──────┘          │
│                                 │
├─────────────────────────────────┤
│  🎤  📹  🖥️  ↗️  📞           │  ← Controls: mic, video, screen, expand, leave
└─────────────────────────────────┘
```

### Floating Window (Collapsed/Pill State)
```
┌──────────────────────────────┐
│  ◉ #general  👤3  🎤 📹 ↗️ 📞 │  ← Single row: channel, count, quick controls
└──────────────────────────────┘
```

### Dimensions
- Default: 320×260px (expanded), 280×40px (collapsed pill)
- Min: 280×200px, Max: 480×400px
- Default position: bottom-right, 24px from edges
- Snap corners: 24px inset from viewport edges

### Animations
- Appear: scale-in from bottom-right (150ms ease-out)
- Disappear: scale-out to bottom-right (100ms ease-in)
- Snap: spring animation to nearest corner (200ms ease-out)
- Collapse/expand: height transition (150ms ease-in-out)
