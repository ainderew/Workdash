# Packet Handoff: desk-51-thread-side-panel-and-reply-composer

## Packet ID
- `desk-51-thread-side-panel-and-reply-composer`

## Scope
Implement thread side panel with root message + ordered replies and reply submission using reused composer behavior.

## Problem Snapshot
Collapsed thread entrypoint is incomplete without a dedicated thread reading/writing surface.

<thinking>
Thread writing must reuse existing composer semantics to avoid creating a second message-send stack. This keeps mention parsing, attachments, and send reliability behavior consistent.
</thinking>

## Implementation Plan
1. Thread panel surface
- Open from:
  - root message reply action
  - `N replies` indicator
- Right-side panel contains:
  - root/main message at top
  - visual divider/label where replies begin
  - replies column sorted oldest -> newest

2. Reply composition
- Reuse composer component at thread panel bottom.
- Sends from this composer call message create with `replyToMessageId=<rootMessageId>`.
- Allow replying to your own root message.

3. Action rules in panel
- Root message may show reply action.
- Reply messages in panel show action placeholders but no reply button.

4. State sync
- On new reply send or realtime receive:
  - thread panel list updates.
  - timeline summary (`replyCount`, preview avatars, `lastReplyAt`) updates.

## Files Expected
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatShell.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/MessageList.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ThreadPanel.tsx` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`

## Validation Commands
- Frontend: `npm run lint`
- Frontend: `npm run build`

## Risks / Open Items
- Panel and search/member panel interaction priority in Desk layout must be defined.
- Thread panel width/breakpoints in 2D compact mode require viewport QA.

## Next Packet Start Conditions
- [ ] Thread panel opens from timeline entrypoints.
- [ ] Thread replies render oldest-first under root message.
- [ ] Thread composer appends replies to root thread only.
- [ ] Reply-to-reply action remains disabled/hidden.

## New-Context Start Prompt For Packet 51
1. Open `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-48-reply-thread-context-reset.md`.
2. Open completed `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-50-reply-hover-actions-and-collapsed-indicator.md`.
3. Implement only packet `desk-51`.

## Implementation Result
- Status: completed
- Added thread side panel component:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ThreadPanel.tsx`
- Wired timeline -> thread open in both shells:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatShell.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/CompactChatShell.tsx`
- Reused composer stack for thread replies with `replyToMessageId`:
  - `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
  - `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/Composer.tsx`
- Root-only timeline loading and live reply summary updates are active in store.
