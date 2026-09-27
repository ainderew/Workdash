# Workdash Backlog — known bugs, improvements, and deferred work

Covers BOTH repos (Workdash frontend + Workdash-SFU backend, sibling checkouts).
Compiled 2026-06-12 from a multi-agent code review + the One-click Lounge build.
Line numbers are approximate — re-verify before editing. Check items off (or
delete them) as they land; add new findings here rather than in chat history.

## Verified bugs — backend (Workdash-SFU)

- [ ] **GET_ACTIVE has no membership check** — `src/handlers/call-signaling.handlers.ts`
      (`CallEvents.GET_ACTIVE` handler). Returns `CallPresence` (participant
      names + media state) for arbitrary client-supplied channelIds. Its sibling
      GET_STATE verifies membership; GET_ACTIVE should too. Verified by hand. **Security.**
- [ ] **Music UDP port reuse race on stall retry** — `src/services/music/music.service.ts`
      (~doStartPlayback / stall retry path). Retry can spawn FFmpeg before the
      previous process exits, violating the CLAUDE.md PlainTransport rule.
      Symptom: rapid track skips kill music until restart.
- [ ] **Same-device reconnect races in mediasoup ownership** —
      `src/handlers/mediasoup.handlers.ts` (closeProducer ownership lookup) +
      `src/services/call-signaling.service.ts` (registerSession evicts old
      socket after mutating participant.socketId). Peers get duplicate
      producer-removed events / reconnected user can't unmute.
- [ ] **pendingWorkspaceEmits never GC'd** — `src/services/call-signaling.service.ts`
      (existing TODO ~line 127). Delete the entry in leaveCall when
      workspaceToActiveChannels for that workspace empties.
- [ ] **Timers without `.unref()` block graceful shutdown** —
      `src/services/chat-v2.gateway.ts` (typing timeout ~1890),
      `src/services/music/music.playback.ts` (hardTimer/idleTimer ~67/183).
      SIGTERM can hang up to 10 min while music plays.
- [ ] **audioZone stale-socket gaps** — `src/services/audioZone.service.ts`:
      `shouldReceiveAudio` doesn't null-check `socketWorkspaces` for either
      socket (stale zone entries can mis-route audio after reconnect); empty
      `zoneRooms` Sets are never deleted (slow leak).
- [ ] **Transport leak when create succeeds but the ack never reaches the client**
      — `src/services/mediasoup.service.ts` (~createWebRtcTransport). Client
      retries can hit MAX_TRANSPORTS_PER_SOCKET. Add an orphan reaper or
      late-register the transport.
- [ ] **Music circuit breaker has no half-open recovery** —
      `src/services/music/music.ytdlp.ts`. Once open after a yt-dlp failure
      burst it never self-heals.
- [ ] **FFmpeg orphaned on rapid stop+disconnect** —
      `src/services/music/music.playback.ts`. Await `session.processesExited`
      in the disconnect path before dropping the session.
- [ ] **Chat events don't re-verify room membership** — `src/services/chat-v2.gateway.ts`
      message handlers trust roomId after socket auth; a user removed from a
      room can still send until disconnect.
- [ ] **startCall membership re-check after await** — `src/services/call-signaling.service.ts`
      (~startCall): user can be removed from the workspace in the window
      between the DB check and `activeCalls.set()`.
- [ ] **Call ownership can transfer to an idle/ghost session** —
      `handleSocketDisconnect` picks the first surviving session arbitrarily.

## Verified bugs — frontend (Workdash)

- [ ] **`reloadRoomStructure()` promise unhandled** — `src/App.tsx` (workspace
      resolve effect). Rejection = silently blank room list. Add `.catch` + retry UI.
- [ ] **loadCallProducers partial failure leaves broken call state** —
      `src/communication/callSignaling/callSignalingService.ts`. If one of the
      three viewers fails, user stays in call with e.g. frozen video; no rollback.
- [ ] **Multiplayer `watchNewPlayers` re-registration leaks old callbacks** —
      `src/game/multiplayer/multiplayer.ts` (~170-224). Scene reload can fire
      both old and new callbacks → duplicate players.
- [ ] **Wrong tile can be unpinned on media change** — `src/common/store/callStore.ts`
      `handleMediaChanged` (~373-392): stale `pinnedTileKey` edge case when
      screen-share stops then another user's pin intervenes.
- [ ] **App unmount only tears down SoundboardService** — `src/App.tsx` init
      cleanup; ChatV2Service/CallSignalingService/WebrtcStatsService listeners
      survive logout-in-place.
- [ ] **`UserSettingsModal.test.tsx` fails collection locally** — missing
      optional dep `phaser3spectorjs` (phaser transitive). Fix the install or
      mock `@/game/EventBus` like `chatV2Store.test.ts` does. CI is unaffected.

## UX backlog (from design review; ranked roughly by impact)

- [ ] Call hotkeys — shortcut registry (`src/common/keyboard/shortcutRegistry.ts`)
      has only 2 entries; add M (mute), V (video), J (join active call).
- [ ] Toast/sidebar pulse when a call starts in a channel you're NOT viewing
      (currently invisible; lounge channels covered by the nudge system, others not).
- [ ] World-mode first-entry controls hint ("WASD to move · scroll to zoom").
- [ ] Invite links force desk mode and never show world mode — consider
      defaulting invitees to world for the differentiated first impression.
- [ ] Unread badges don't distinguish mentions/live calls from plain unreads.
- [ ] Server-settings saves (emoji/soundboard/roles) give no success/failure
      feedback until refresh — optimistic update + toast.
- [ ] Init screen: technical copy ("Initializing SFU…"), no auto-retry/refresh
      CTA; WorkspaceSelectorOverlay spins forever on fetch failure.
- [ ] Desk↔world mode switch shows a blank canvas while Phaser wakes — add a
      transition state.
- [ ] Mobile/responsive: world-mode video grid is fixed-position, sidebar
      breakpoints sparse (~60 uses repo-wide).
- [ ] The world doesn't follow a rotated phone or a resized window:
      `Phaser.Scale.ENVELOP` (`src/game/main.ts`) keeps the size the game loaded
      at, so a phone loaded in portrait and turned sideways shows the world ~2x
      with the top and bottom cropped off. `Scale.RESIZE` would track the viewport.
- [ ] Desk-mode mobile drawer overflows narrow phones: the 72px guild rail plus
      the 300/320px channel sidebar (`ChannelSidebarContainer`) exceeds a 375px
      viewport, clipping the sidebar's right edge.
- [ ] World control hub is ~1050px wide, so it still overflows at exactly the
      `lg` breakpoint (1024px). Below `lg` it is replaced by
      `UiControls/MobileWorldControls`.
- [ ] World hub "Leave Call" button has no `onClick`, so it is inert
      (`UiControls.tsx`).
- [ ] Mention autocomplete + profile popover discoverability.
- [ ] Soccer/MatchHistory modals still on raw Tailwind colors — migrate to
      `wd-*` tokens (listed in docs/style-system.md as migration targets).

## Lounge — deferred follow-ups

- [ ] Music chip in the lounge call header (track + who queued, click opens
      playlist sidebar) — designed in `feature-plans/one-click-lounge/lounge-view.html`,
      deferred from phase 4.
- [ ] Per-user "crew" subset for quorum nudges (matters once workspaces exceed
      friend-group size; currently all workspace members count).
- [ ] Cross-device nudge dedup via backend events (currently localStorage-only,
      so phone + desktop can each toast once).
- [ ] Auto-join gesture fallback needs real-world verification on cold Chrome
      profiles (getUserMedia without gesture may throw; manual pill fallback
      exists but is untested in anger).
- [ ] Dock behavior at very small tile heights (MIN_HEIGHT 80) — overlap may
      crowd tiles; needs a real-use look.
- [ ] World-mode lounge surfaces (Den card/nudges are desk-only by design, phase 1-4).

## Infra / CI

- [ ] **GitHub Actions Node 24 bump (before 2026-06-16)** — both repos'
      `deploy.yml`: actions/checkout@v4, docker/build-push-action@v5,
      docker/login-action@v3, docker/setup-buildx-action@v3 get force-switched
      to Node 24 on the 16th. Bump to current majors.
- [ ] SFU local test env: gcs.config/chat-file suites need `GCS_BUCKET_NAME`,
      workspace.gateway/music suites emit Redis ECONNREFUSED noise without a
      local Redis. Consider test-time guards or a documented `.env.test`.
- [ ] SSH note for tooling: `~/.ssh/config` pins github.com to the `work` key;
      these repos need `id_ed25519` (`GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519"`).
      A host alias would clean this up.
- [ ] SFU horizontal scaling is single-node by design (in-memory call/zone
      maps, no socket.io adapter) — fine for now, documented in repo CLAUDE.md.

## Feature ideas parked (from product brainstorm; not committed work)

PiP/always-on-top call overlay (Document PiP API) → pairs with global
push-to-talk via a thin desktop wrapper; Steam/Dota presence shown in call UI;
"queue up?" repurposed ready-check; auto post-match Dota scoreboard into the
channel; inter-workspace soccer leagues (MatchHistory table exists, unused);
"meet me here" guest deep links into world coordinates; webhook-driven world
objects (CI status → server room on fire); Workdash CLI (`workdash knock`).
Mockups and design context: `feature-plans/one-click-lounge/`, `PRODUCT.md`,
`DESIGN.md`.
