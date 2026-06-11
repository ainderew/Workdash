# One-click Lounge — Implementation Overview

A pinned always-available voice lounge ("The Den") that removes "who calls first"
friction. Mockups in this directory: `mockup.html` (states), `lounge-view.html`
(in-lounge view + empty state), `desk-call-redesign-v3.html` (hearth call panel).
Design context: `PRODUCT.md` (cozy gamer den personality), `DESIGN.md` (den palette).

## Decisions (confirmed with user)

- Lounge = an **existing channel designated per workspace** (`loungeChannelId` on
  Workspace). No new room type, no new call system — a lounge call is a normal
  channel call with privileged UI surfaces.
- Clicking the Den card **joins the call immediately** (and navigates to the channel).
  The channel row keeps normal navigate-only behavior.
- One call at a time; joining the lounge while in another call switches (instant,
  confirm only if sharing screen or owner with others in call).
- Nudges suppressed while in any call / DND / focus mode / passive tab.
- "Online" for quorum = any non-offline, non-DND workspace member.
- Quorum nudge: max once per evening, "Not tonight" snoozes until 6am, only inside
  user-configurable lounge hours (default 19:00–01:00 local). Live-call nudge ignores hours.
- Auto-join on app open: opt-in, default off, joins muted via 5s countdown pill,
  graceful fallback to one-click pill if browser blocks gesture-less media.
- Personality: cozy den (amber/sage/warm charcoal) for lounge surfaces; rest of app
  migrates later. No new theme tokens hardcoded — add `--wd-den-*` tokens.

## Status (2026-06-11)

All four phases implemented. Commits: SFU `77ef441` (designation) + `3dd20b7`
(crew ping); frontend `b8d6947` (card), `2567bdc` (nudges), `4346595`
(auto-join + settings + hearth + ping). Remaining ideas: hearth music chip,
den re-theme beyond the call panel, per-user crew subset for quorum nudges.

## Phases

1. **Foundation (DONE)** — backend `loungeChannelId` (schema, service, gateway,
   payloads), frontend Den card in ChannelSidebar (live occupancy via
   activeCallsByWorkspace + presence), one-click join/start + navigate, designation UI
   for admins. Tests both repos.
2. **Nudge engine (DONE)** — client-side: live-call nudge + quorum nudge (sonner), lounge
   hours + snooze prefs (localStorage), active-tab gating, "Ping the crew" manual nudge.
3. **Auto-join pill (DONE)** — countdown pill component, opt-in setting, muted join,
   gesture-fallback.
4. **Hearth call panel (DONE — chrome on lounge call + crew ping; music chip deferred)** — den-themed call view for the lounge channel (firelight,
   dimmed idle tiles, speaker halo, eq nameplate, mantel dock, music chip,
   "first one here" empty state).

## Key integration points

- SFU repo: `prisma/schema.prisma` Workspace model, `workspace.service.ts`,
  `workspace.gateway.ts`, `call-signaling.service.ts` (active call info already
  broadcast via workspace snapshots).
- Frontend: `chatV2Store` rooms/selectRoom, `callStore.activeCallsByWorkspace`,
  `presenceStore.presenceMap`, `callSignalingService.startCall/joinCall` (has
  in-flight dedup), `ChannelSidebar`.
