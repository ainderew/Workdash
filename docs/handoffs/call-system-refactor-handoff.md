# Call System Refactor Handoff

## What Was Done

### Server (workdash-media-server)

**New files:**
- `src/services/mediasoup.service.ts` — Extracted Mediasoup resource management from `index.ts`. Manages workers, router, transports, producers, consumers with clean API. Uses `Map<>` instead of plain objects. Proxy objects in `index.ts` bridge to AudioZoneService's `Record<>` interface.
- `src/services/call-signaling.service.ts` — Channel-scoped call state management. `activeCalls` Map keyed by channelId. DB-backed membership checks via `ChatRoomMembership`. Broadcasts to `getChatRoomChannel(channelId)` rooms. Auto-cleanup on disconnect.

**Modified:**
- `src/index.ts` — Socket handlers are now thin dispatchers to services. 6 new `call:*` handlers added. Disconnect handler calls both `callSignalingService.handleDisconnect()` and `mediasoupService.cleanupSocket()`.

### Client (workdash)

**New files:**
- `src/common/store/callStore.ts` — Zustand store: `activeCallsByChannel`, `currentCall`, `localMedia` + event handlers
- `src/communication/callSignaling/callSignalingService.ts` — Singleton. Listens for `call:started/ended/participant_joined/participant_left/media_changed`. Emits `call:start/join/leave/get-state/set-media/get-active`.
- `src/common/components/DeskMode/ChannelCallIndicator.tsx` — Green badge in sidebar channel items
- `src/common/components/DeskMode/CallBanner.tsx` — Banner above messages: join button or active call view
- `src/common/components/DeskMode/CallView.tsx` — Participant grid + mic/camera/screen/leave controls
- `src/common/components/DeskMode/StartCallButton.tsx` — Phone icon dropdown in RoomHeader

**Modified:**
- `src/App.tsx` — `CallSignalingService.setupListeners()` after SFU init
- `src/common/components/DeskMode/DeskChatShell.tsx` — `<CallBanner>` between error bar and MessageList
- `src/common/components/DeskMode/RoomHeader.tsx` — `<StartCallButton>` in header toolbar
- `src/common/components/DeskMode/ChannelSidebar.tsx` — `<ChannelCallIndicator>` in channel list items
- Theming fixes: `VideoChatContainer.tsx`, `ScreeShareContainer.tsx`, `ScreenShareUi.tsx`, `DeskModeControls.tsx` — replaced hardcoded Tailwind colors with `--wd-*` CSS vars

### Build Status
- Server: TypeScript clean, lint 0 errors, 144/144 tests pass
- Frontend: Build passes (Node 20), lint 0 new errors, 128/128 tests pass (Node 23)

---

## Remaining Work (5 items)

### 1. Fetch active calls on workspace join
**What:** `CallSignalingService.fetchActiveCallsForChannels()` exists but is never called. When a user joins a workspace, it should be called with all channel IDs to populate sidebar indicators.
**Where to hook in:** `DeskChatShell.tsx` — look for where rooms/channels are loaded after workspace selection. After rooms load, call:
```ts
const channelIds = rooms.map(r => r.id);
CallSignalingService.getInstance().fetchActiveCallsForChannels(channelIds);
```
**Also consider:** Calling it on socket reconnect.

### 2. Sync existing DeskModeControls with call media state
**What:** When a user is in a call (`callStore.currentCall !== null`) and toggles mic/camera via `DeskModeControls` (outside CallView), the change doesn't propagate to other participants because `CallSignalingService.setMedia()` isn't called.
**Fix:** In `useUiControls.ts` or `DeskModeControls.tsx`, after toggling mic/video, check `useCallStore.getState().currentCall` and if non-null, call `CallSignalingService.getInstance().setMedia(channelId, { audio/video })`.

### 3. Verify socket room membership for call events
**What:** `CallSignalingService` (server) emits to `getChatRoomChannel(channelId)` rooms (pattern: `chat:room:{channelId}`). Need to confirm that `ChatV2Gateway` already joins users to these rooms when they load channels. Likely already works — `ChatV2Gateway` line 416 does `socket.join(getChatRoomChannel(payload.roomId))` on room join.
**Action:** Trace the flow to verify users are in these rooms before call events fire. If not, add room join in the workspace gateway's `listChannels` handler.

### 4. Manual testing checklist
Run through these scenarios on a live instance:
1. User A starts huddle in #dev-talk. User B (member) sees indicator. User C (non-member) doesn't.
2. User B joins. Both see each other in CallView. Sidebar updates for all #dev-talk members.
3. User B mutes. User A sees mute icon change.
4. User A leaves. User B sees A disappear.
5. User B leaves (last). Call ends, indicator disappears for all members.
6. User A kills tab mid-call. Server disconnects, removes from call, others see update.
7. Theme check: call UI matches rest of app across all 5 themes.

### 5. Minor cleanup
- Verify `wd-control-hub-legacy` CSS class in `globals.css:560-581` is used anywhere; delete if orphaned.
- The `callStore.reset()` method should be called on workspace switch or logout.

---

## Key Architecture Decisions

- **Channel-scoped calls** (not workspace-scoped): Call events go to `chat:room:{channelId}` rooms, matching how chat messages are broadcast. Only channel members see call activity.
- **DB membership checks**: `CallSignalingService.verifyChannelMembership()` queries `ChatRoomMembership` before allowing start/join. No client-trust.
- **Single global router**: Kept the existing single Mediasoup router for now. The plan mentioned one-router-per-call but that's a future optimization.
- **Proxy pattern for AudioZoneService**: `index.ts` uses `Proxy` objects to bridge `MediasoupService`'s `Map<>` data to `AudioZoneService`'s `Record<>` interface, keeping live references without modifying AudioZoneService.

## Socket Events (new)

| Event | Direction | Payload |
|-------|-----------|---------|
| `call:start` | C->S | `{channelId, type}` |
| `call:join` | C->S | `{channelId}` |
| `call:leave` | C->S | `{channelId}` |
| `call:get-state` | C->S | `{channelId}` |
| `call:set-media` | C->S | `{channelId, media: {audio,video,screen}}` |
| `call:get-active` | C->S | `{channelIds: string[]}` |
| `call:started` | S->C | `CallPresence` |
| `call:ended` | S->C | `{channelId}` |
| `call:participant_joined` | S->C | `{channelId, participant}` |
| `call:participant_left` | S->C | `{channelId, userId}` |
| `call:media_changed` | S->C | `{channelId, userId, media}` |
