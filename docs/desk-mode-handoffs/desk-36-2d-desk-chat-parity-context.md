# Packet Handoff: desk-36-2d-desk-chat-parity-context

## Packet ID
- `desk-36-2d-desk-chat-parity-context`

## Owner
- Frontend chat-v2 surface

## Problem Statement
2D mode chat and Desk mode chat currently run through different frontend stacks:
- 2D side window uses legacy `TextChatService` + `messagingStore`.
- Desk mode uses room-aware `chat:v2:*` via `chatV2Store` and `DeskLayout`.

Because legacy bridge traffic is pinned to `mainmap-lobby`, 2D cannot access full room/channel navigation or desk search behavior. This creates feature drift and inconsistent message routing expectations between modes.

## Root Causes
1. Runtime split between legacy and v2 chat clients on frontend.
2. 2D UI mounts `ChatWindow` (legacy) instead of desk chat-v2 shell.
3. Legacy protocol path maps to a fixed room context (`mainmap-lobby`).
4. Search/filter UX exists in Desk components only.

## Current Architecture Map
### 2D Path (legacy)
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`
  - mounts legacy `ChatWindow`.
- `/Users/AndrewPinon/projects/workdash/src/common/components/TextChat/ChatWindow.tsx`
- `/Users/AndrewPinon/projects/workdash/src/communication/textChat/textChat.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/store/messagingStore.ts`

### Desk Path (chat-v2)
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/store/chatV2Store.ts`
- `/Users/AndrewPinon/projects/workdash/src/communication/chatV2/chatV2Service.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`

## Locked Product Decisions
1. Full Desk parity in 2D side window.
2. Shared selected room across Desk and 2D.
3. Hard frontend cut to chat-v2 (no legacy 2D runtime).
4. Expanded right drawer in 2D (`desktop <= 90vw`, mobile full width).

## Target State Data Flow
1. 2D and Desk mount the same shared `DeskChatShell` (presentation differs only by container).
2. Both paths read/write through `chatV2Store` + `ChatV2Service` only.
3. Active room state is global via `chatV2Store.currentRoomId`.
4. Search state/behavior is shared and available in both mode presentations.
5. Socket handshake advertises `chatProtocolVersion: 2` from frontend.

## File Touch Map (Planned)
### Docs
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-known-gaps.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-36-2d-desk-chat-parity-context.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-37-shared-chat-shell.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-38-2d-expanded-drawer.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-39-v2-hard-cut.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-40-parity-validation.md`

### Core Frontend
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatShell.tsx` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskChatDrawer.tsx` (new)
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/DeskLayout.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/ChannelSidebar.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/DeskMode/RoomHeader.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/SidebarMenu/SidebarMenu.tsx`
- `/Users/AndrewPinon/projects/workdash/src/common/components/UiControls/UiControls.tsx`
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`
- `/Users/AndrewPinon/projects/workdash/src/communication/mediaTransportService/mediaTransportServive.ts`

### Legacy Runtime Removal Targets
- `/Users/AndrewPinon/projects/workdash/src/common/components/TextChat/ChatWindow.tsx`
- `/Users/AndrewPinon/projects/workdash/src/communication/textChat/textChat.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/store/messagingStore.ts`

## Packet Sequence and Scope Boundaries
1. `desk-37-shared-chat-shell`
- Extract shared chat-v2 stateful shell from Desk layout.

2. `desk-38-2d-expanded-drawer`
- Mount shared shell in 2D side window with expanded responsive drawer.

3. `desk-39-v2-hard-cut`
- Remove legacy 2D chat runtime and force v2 protocol handshake.

4. `desk-40-parity-validation`
- Validate parity matrix, reconnect stability, and responsive behavior.

## Owner Checklist
- [x] Decisions frozen before implementation.
- [x] Scope sequence defined and packetized.
- [ ] Shared shell extracted and desk parity preserved.
- [ ] 2D drawer parity delivered.
- [ ] Legacy runtime removed from active frontend path.
- [ ] Validation matrix executed (`lint` per step, final `lint + build`).
