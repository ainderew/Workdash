# Dota 2 In-Game Detection + Multi-Source Activities + Perf Fixes — Handoff

## Status: PARTIAL — shipped features complete, 2 perf tasks deferred

Commits shipped:
- Backend: `a675718` — multi-source activity system + Dota 2 in-game detection
- Frontend: `03021490` — multi-source activities + Dota 2 "Playing" pill
- Frontend: `59cb4936` — notification bell shows unread count badge
- Frontend: `1d6b735b` — CI lint fix
- Frontend: `8d523d17` — perf: reduce re-render cascades

Remaining (documented below): MessageList virtualization (P1), DeskChatShell decomposition (P3).

---

## What Was Built

### 1. Steam Dota 2 In-Game Detection (backend)

A background worker polls Steam's `GetPlayerSummaries` API every 60s to detect when linked users are playing Dota 2. When detected, a "Playing Dota 2" activity is published to every workspace the user belongs to. When the game ends, the activity clears. The user's presence dot color is NOT changed — this routes through the activity system alongside music.

### 2. Multi-Source Activity Refactor (backend + frontend)

The activity system was refactored from single-activity-per-user to multi-source. A user can now simultaneously show "Listening to Synthwave" AND "Playing Dota 2" as separate pills. Each activity occupies a named slot keyed by `source` (typed `ActivitySource` enum: `"music" | "dota" | "custom"`).

- **Redis storage**: Changed from `SET activity:{ws}:{uid} <json>` to `HSET activity:{ws}:{uid} <source> <json>`. Same 10-min TTL.
- **Events**: Renamed from `activity:update` / `activity:cleared` to `activity:set` / `activity:clear` (by source) / `activity:clear-all` / `activity:batch-set` / `activity:batch-clear` (by source).
- **Frontend store**: `activityMap[wsId][userId]` is now `Record<source, UserActivity>` instead of a single `UserActivity`.

### 3. Performance Fixes (frontend)

- MemberPanel presence selector cascade eliminated (stable `onlineUserIdKey`)
- Typing indicator array reconstruction eliminated (early-exit + `.map()`)
- Typing emit debounced (200ms throttle)
- Activity store duplicate-update guard (type+startedAt+title compare)
- `console.error` gated behind logger in mediaTransportService

### 4. Infrastructure Improvements (backend)

- Shared `http-client-base.ts`: `TokenBucketRateLimiter` (bounded wait queue + timeout), `CircuitBreaker`, `warnOnce`. Used by both Steam and OpenDota clients.
- `game-registry.ts`: Steam app IDs + display names centralized.
- `activity-sources.ts`: Typed `ActivitySource` enum shared by all producers.
- Dev control panel (frontend) + dev HTTP endpoint (backend) for simulating Dota activity without a gaming PC.

---

## Architecture

### Dota Detection Data Flow

```
Steam Web API ← steamWebClient.fetchPlayerSummaries (batched 100/call)
       ↓
steamPresenceWorker (60s setInterval)
       ↓
steamPresenceService.syncPresenceForLinkedUsers(io)
  1. prisma.steamLink.findMany → all linked users
  2. steamWebClient.fetchPlayerSummaries(steamIds)
  3. For each user: diff summary.gameid against Redis snapshot (steam:gameid:{userId})
  4. Batch workspace lookup: ONE prisma.workspaceMember.findMany for all transitioning users
  5. Fan out via activityService.setActivity / clearActivity per workspace
       ↓
Socket.io broadcasts activity:set / activity:clear to ws:{workspaceId} rooms
       ↓
Frontend activityService listeners → activityStore → ActivityText pills
```

### Key Design Decisions

- **Activity system, not presence system**: Dota detection routes through `activityService`, not `statusService`. The user's presence dot stays green/purple/yellow — the game shows as a separate pill below the name. This allows music + dota to coexist and avoids the priority/manualLock complexity of the status system.
- **Source-keyed slots**: Each `source` string is a slot in a Redis hash. `clearActivity(ws, uid, "music")` removes only the music slot; dota survives. This is the core multi-source invariant.
- **Typed ActivitySource enum**: `"music" | "dota" | "custom"` — prevents typo-driven silent failures (e.g., `"Dota"` vs `"dota"` would be a compile error).
- **FanoutResult instead of silent catch**: `steamPresenceService` methods return `{ attempted, succeeded, failed[] }` via `Promise.allSettled`, not `.catch(() => {})`. Dev route surfaces failures as HTTP 502.
- **WRONGTYPE migration**: `activityService.safeHset` catches Redis WRONGTYPE errors (from pre-refactor `SET`-shape keys) and auto-migrates by deleting + retrying. `batchSetActivities` pre-checks `redis.type` for each key.
- **NODE_ENV allowlist**: Dev route uses `DEV_ENVS = {"development", "test"}` allowlist (not `!== "production"` blocklist), so staging/preview/unset envs are closed by default.
- **Workspace batch lookup**: `syncPresenceForLinkedUsers` computes transitions first, then issues ONE `workspaceMember.findMany` for all transitioning users. No N+1.

---

## Files Created

### Backend (workdash-media-server)

| File | Purpose |
|------|---------|
| `src/infrastructure/http-client-base.ts` | Shared `TokenBucketRateLimiter` (bounded queue + timeout), `CircuitBreaker`, `warnOnce`. Used by Steam + OpenDota. |
| `src/infrastructure/steam-web.client.ts` | Steam Web API client. `fetchPlayerSummaries` → `FetchPlayerSummariesResult { players, complete }`. Preserves partial results on mid-batch failure. |
| `src/infrastructure/steam-web.client.test.ts` | 8 tests: chunking, partial failure, circuit breaker, missing key. |
| `src/infrastructure/game-registry.ts` | `GAMES.DOTA2 = { appId: "570", defaultTitle: "Dota 2", activitySource: "dota" }`. |
| `src/services/activity/activity-sources.ts` | `ACTIVITY_SOURCES` enum + `ActivitySource` type. |
| `src/services/activity/activity.service.test.ts` | 20 tests: HSET slots, TTL refresh, WRONGTYPE migration, batch clear TTL, malformed JSON skip. |
| `src/services/steam-presence.service.ts` | Core Dota detection logic. `syncPresenceForLinkedUsers`, `handleSteamUnlink`, `setDotaActivityEverywhere`, `clearDotaActivityEverywhere`. Returns `FanoutResult`. |
| `src/services/steam-presence.service.test.ts` | 12 tests: transition in/out, idempotency, privacy, partial fetch, fan-out, unlink. |
| `src/workers/steam-presence.worker.ts` | 60s `setInterval` poller. Logs tick overlap warnings. Throws if `setIo()` not called before `start()`. |
| `src/routes/dev-presence.route.ts` | `GET /api/dev/dota-activity?userId=N&on=1`. Allowlist-gated. Surfaces fan-out failures. |

### Frontend (workdash)

| File | Purpose |
|------|---------|
| `src/communication/activity/_sources.ts` | Frontend mirror of `ActivitySource` enum. |
| `src/common/components/DevControlPanel/DevControlPanel.tsx` | Floating dev panel (Ctrl+Shift+D). Toggles Dota simulation. Hidden in production. |
| `src/common/store/activityStore.test.ts` | 12 tests: source-keyed upsert, clear isolation, hydration, batch clear. |
| `src/communication/activity/activityService.test.ts` | 7 tests: socket event → store mapping, validation rejection, idempotent setup. |

## Files Modified

### Backend

| File | Change |
|------|--------|
| `src/services/activity/activity.service.ts` | Rewritten: HSET by source, TTL refresh on clear, WRONGTYPE migration, pipeline error checking, new events. |
| `src/services/activity/activity.types.ts` | Added `source: ActivitySource` to all activity types. |
| `src/infrastructure/opendota.client.ts` | Refactored to import shared `TokenBucketRateLimiter` + `CircuitBreaker` from http-client-base. |
| `src/services/music/music.service.ts` | Uses `ACTIVITY_SOURCES.MUSIC` constant; `clearActivity` + `batchClearActivities` now pass source param. |
| `src/services/dota.gateway.ts` | Calls `steamPresenceService.handleSteamUnlink` after `dotaService.unlinkSteam`. |
| `src/services/dota.service.ts` | `unlinkSteam` now deletes `steam:gameid:{userId}` snapshot BEFORE the DB row (closes worker-race window). |
| `src/services/workspace.gateway.ts` | `activity: activityMap.get(uid) ?? null` → `activities: activityMap.get(uid) ?? []` (array shape). |
| `src/index.ts` | Imports + lifecycle wiring for `steamPresenceWorker`. |
| `.env.example` | Added `STEAM_WEB_API_KEY`, `STEAM_PRESENCE_POLL_INTERVAL_MS`. |

### Frontend

| File | Change |
|------|--------|
| `src/common/store/activityStore.ts` | `Record<source, UserActivity>` per user. `hydrateActivities` replaces (server authoritative). `setActivity` early-exit on no-change. |
| `src/communication/activity/_types.ts` | Added `source` field + `validateUserActivity` runtime validator. |
| `src/communication/activity/activityService.ts` | New event names; payload validation at socket boundary; `parseBatchSet` etc. |
| `src/common/components/DeskMode/ActivityText.tsx` | Renders one pill per source (sorted by startedAt). Memoized sort. Exhaustive switch. |
| `src/communication/chatV2/_types.ts` | `WorkspaceMember.activity` → `WorkspaceMember.activities` (array). |
| `src/communication/chatV2/chatV2Service.ts` | Hydration uses `hydrateActivities` with array shape. Typing emit debounced (200ms). |
| `src/common/components/DeskMode/MemberPanel.tsx` | `onlineUserIdKey` selector replaces whole-presenceMap subscription. |
| `src/communication/mediaTransportService/mediaTransportService.ts` | `console.error` → `logger.log` on connect_error. |
| `src/App.tsx` | Mounts `<DevControlPanel />`. |
| `package.json` | Added `react-virtuoso` (installed, not yet wired). |

---

## Testing

### Automated

- **Backend**: 680/680 tests pass (40 new). `npm run build` clean.
- **Frontend**: 992/992 tests pass (19 new). `tsc --noEmit` clean. `npm run build` (Node 20) clean.

### Manual Verification

1. **Dota detection**: Link Steam → launch Dota 2 → within 60s, "Playing Dota 2" pill appears under your name in all shared workspaces. Quit → pill clears.
2. **Multi-source coexistence**: Play music while in Dota → both pills show.
3. **Dev panel**: Open app → Ctrl+Shift+D → click "Start match" → pill appears. Click "End match" → clears.
4. **Unlink**: Settings → Connections → Unlink Steam → pill clears immediately.
5. **Dev route 404 on prod**: `curl -i https://prod/api/dev/dota-activity?userId=1&on=1` → 404.

### Prod Status

- Backend deployed (`a675718`), worker running: `[steam-presence] Worker started { intervalMs: 60000 }`.
- `STEAM_WEB_API_KEY` set in `/root/workdash/.env.backend`.
- Dev route confirmed 404 on prod.
- Frontend deployed (`8d523d17`).

---

## Remaining Work (2 tasks)

### P1: MessageList Virtualization

**Why**: `MessageList.tsx:1040` renders every message in history to the DOM. A 500-message channel = 500+ React components + avatars + reactions. No list virtualization. This is the single biggest source of scroll jank and slow initial paint.

**What's ready**: `react-virtuoso` is installed in `package.json`.

**What needs doing**:

1. **Extract `MessageRow` component** from the inline `.map()` body at `MessageList.tsx:1040–1780`. This is 700+ lines of JSX with 15+ closure references from the parent scope (`flyoutMessageId`, `editingMessageId`, `highlightedMessageId`, `pinnedMessageIds`, `openProfilePopover`, `handleAvatarContextMenu`, `memberNameMap`, `localBackendUserId`, etc.). Each must become a prop or a store selector in the extracted component.

2. **Wrap in `<Virtuoso>`**:
   - Replace `flex-col-reverse` scroll container with Virtuoso's `followOutput` (auto-scroll to bottom on new messages).
   - Replace `topSentinelRef` IntersectionObserver with Virtuoso's `startReached` callback for infinite-scroll-up.
   - Use `initialTopMostItemIndex={messages.length - 1}` to start at bottom.
   - `itemContent={(index) => <MessageRow ... />}` for the virtualized render.
   - Day separators: include as a conditional div inside each `MessageRow` (check `previousMessage` from the data array, not from React siblings).

3. **Handle scroll state**: `showNewMessagesPill`, `isScrolledFarBack`, `scrollToBottom` currently read `scrollContainerRef.scrollTop`. Virtuoso exposes `atBottomStateChange` and `scrollToIndex` — rewire these.

4. **Highlighted message scroll**: `highlightedMessageId` currently uses `scrollIntoView`. Replace with `virtuosoRef.scrollToIndex(index, { align: 'center' })`.

**Key risks**:
- Dynamic message heights (text, images, reactions, thread previews) — Virtuoso handles this but needs accurate height estimation or measurement.
- Context menus and flyouts positioned relative to message elements — ensure they still work within the virtualized container.
- Lightbox gallery (`lightboxState`) derives its image list from `messages.flatMap(...)` — this stays as-is since it's not a render concern.

**Estimated effort**: 4–6 hours.

**Test plan**: Load a channel with 200+ messages. Verify: smooth 60fps scrolling, no flickering on fast scroll, older messages load on scroll-to-top, new messages auto-scroll when at bottom, highlighted message scrolls into view, context menus position correctly.

---

### P3: DeskChatShell Subscription Decomposition

**Why**: `DeskChatShell.tsx:66–166` has ~101 individual `useChatV2Store()` calls. Any property change in `chatV2Store` (which is the busiest store — messages, typing, unread counts, room structure) re-renders this root component, which cascades to ChannelSidebar, MessageList, and MemberPanel — the entire desk-mode tree. Additionally, lines 225–282 have 13 `useEffect` hooks forming a chain: each state update triggers the next effect, causing sequential async waterfalls on workspace switch.

**What needs doing**:

1. **Extract child container components**:
   - `ChannelSidebarContainer` — owns selectors for `roomOrder`, `roomsById`, `categoriesById`, `categoryOrder`, `directRoomsById`, `directRoomOrder`, `unreadByRoomId`, `pinnedRoomIds`. Renders `<ChannelSidebar>`.
   - `ChatPaneContainer` — owns selectors for `selectedRoomId`, `messagesByRoomId`, `isLoadingMessages`, `editingMessageId`. Renders `<MessageList>` + `<MessageComposer>`.
   - `MemberPanelContainer` — owns selectors for `membersByRoomId`, `selectedRoomId`. Renders `<MemberPanel>`.
   - `DeskChatShell` becomes a layout shell: `<div className="flex"><ChannelSidebarContainer /><ChatPaneContainer /><MemberPanelContainer /></div>`. It retains only 5–10 truly-shared selectors (e.g., `selectedWorkspaceId`, `chatInitialized`).

2. **Consolidate initialization effects**:
   - Merge the 4-step workspace-init chain (lines 225–282) into a single `async function initializeWorkspace(wsId)` that runs `reloadRoomStructure` → `selectRoom` → `reloadDirectRooms` → `fetchActiveCallsForChannels` sequentially within one effect. No intermediate state updates triggering cascading effects.

**Key risks**:
- `DeskChatShell` passes callbacks between child areas (e.g., sidebar room-click → chat pane room switch). These must become Zustand actions or callback props, not closure captures.
- Some state is genuinely shared (e.g., `selectedRoomId` is read by sidebar, chat pane, AND member panel). This stays in Zustand, but each container subscribes only to what it needs.
- The 13 effects interact in non-obvious ways. Need to trace each dependency chain before consolidating to avoid breaking initialization order.

**Estimated effort**: 6–8 hours.

**Test plan**: Switch workspaces rapidly 5 times — verify no stale rooms, no flash of wrong content, correct member list. Open React Profiler — verify ChannelSidebar doesn't re-render when a message arrives (message change only hits ChatPaneContainer). Type in chat — verify MemberPanel doesn't re-render.

---

## Dependencies Added

| Package | Version | Repo | Used for |
|---------|---------|------|----------|
| `react-virtuoso` | latest | workdash (frontend) | Installed, not yet wired. For MessageList virtualization (P1). |

## Environment Variables Added

| Variable | Repo | Required | Default |
|----------|------|----------|---------|
| `STEAM_WEB_API_KEY` | workdash-media-server | Yes (for Dota detection; worker self-disables without it) | none |
| `STEAM_PRESENCE_POLL_INTERVAL_MS` | workdash-media-server | No | `60000` |
| `WORKDASH_ALLOW_DEV_ROUTES` | workdash-media-server | No (overrides NODE_ENV allowlist) | unset |

## Redis Key Changes

| Key Pattern | Old Shape | New Shape |
|---|---|---|
| `activity:{wsId}:{userId}` | `SET <json>` (single activity) | `HSET <source> <json>` (multi-source hash) |
| `steam:gameid:{userId}` | n/a (new) | `SET <appId>` with 2h TTL |

Auto-migration: `safeHset` catches WRONGTYPE on old keys and deletes+retries. `batchSetActivities` pre-checks with `redis.type`. Old keys had 10-min TTL, so manual cleanup is optional — they self-expire.
