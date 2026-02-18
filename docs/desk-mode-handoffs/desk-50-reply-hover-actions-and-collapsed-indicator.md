# Packet Handoff: desk-50-reply-hover-actions-and-collapsed-indicator

## Packet ID
- `desk-50-reply-hover-actions-and-collapsed-indicator`

## Scope
Add message hover action rail and collapsed thread indicator in Desk + 2D message timeline surfaces.

## Problem Snapshot
Reply entrypoint UX does not exist. Users need a fast per-message action area and clear, clickable thread affordance in timeline.

<thinking>
This packet is isolated to timeline interaction and rendering. It intentionally avoids opening thread panel logic so hover/layout issues can be hardened first.
</thinking>

## Implementation Plan
1. Hover action rail
- Add an absolute action container at message top-right:
  - visually 50% outside / 50% inside message bubble.
  - appears on hover/focus within message item.
- Actions shown (placeholder-ready):
  - reactions placeholder
  - reply (root messages only)
  - edit placeholder
  - forward placeholder
  - ellipsis placeholder
- Reply messages:
  - do not show reply action.
  - still show placeholder action rail for future actions.

2. Collapsed thread indicator under root message
- If root has replies, render indented clickable row:
  - avatar strip of repliers
  - label: `N replies`
  - accent color + medium/semibold weight (`500`/`600`)
- Indicator opens thread panel trigger callback (actual panel in next packet).

3. Parity
- Apply same behavior to Desk and compact 2D timeline renderer.

## Files Expected
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx` (if timeline-specific wiring needed)
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatShell.tsx` (thread-open callback plumbing)
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts` (UI state hooks if needed)

## Validation Commands
- Frontend: `npm run lint`
- Frontend: `npm run build`

## Risks / Open Items
- Hover rail z-index must not be clipped by message container overflow.
- Mobile/touch fallback behavior needs explicit QA.

## Next Packet Start Conditions
- [ ] Root messages show reply-capable hover rail.
- [ ] Reply messages hide reply action.
- [ ] `N replies` indicator renders correctly and is clickable.

## New-Context Start Prompt For Packet 50
1. Open `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-48-reply-thread-context-reset.md`.
2. Open completed `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-49-reply-thread-data-contract.md`.
3. Implement only packet `desk-50`.

## Implementation Result
- Status: completed
- Message hover action rail with placeholder actions and root-only reply action:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
- Collapsed reply indicator (`N replies` + avatars) under root messages:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
- Timeline callback plumbing for thread open is wired in Desk and compact 2D shells.
