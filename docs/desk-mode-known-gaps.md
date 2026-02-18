# Desk Mode Known Gaps Tracker

Last updated: 2026-02-17
Scope: Consolidated unresolved gaps after packets `desk-04` through `desk-14`.

Usage:
- Keep this file as the single source of open product/engineering gaps.
- When a gap is resolved, move it to the "Resolved" section with the packet/commit that fixed it.

## Open Gaps

| ID | Priority | Area | Gap | Source | Next Action |
|---|---|---|---|---|---|
| DMG-002 | P1 | Desk UI | Member add/remove requires numeric `userId`; no lookup/invite UX. | `desk-10-room-management` | Add user search and invite flow (`email`/`name` lookup + role selection). |
| DMG-003 | P1 | Realtime UX | Room/member list updates are not pushed to all clients automatically. | `desk-10-room-management` | Emit and consume room/member update events to auto-refresh state cross-client. |
| DMG-004 | P1 | Attachments | Client SHA-256 hashing not implemented before attachment send. | `desk-11-files` | Add browser hashing for file uploads and enforce hash presence server-side. |
| DMG-005 | P2 | Attachments | Signed URL lookup has no expiry-aware cache strategy. | `desk-11-files` | Add per-object cache with TTL/refresh to reduce repeated signed-read calls. |
| DMG-006 | P2 | Legacy Bridge | Legacy image/gif type inference uses URL heuristics. | `desk-07-legacy-bridge` | Persist explicit media subtype metadata and map deterministically for v1 payloads. |
| DMG-007 | P2 | Legacy Bridge | Legacy `senderSocketId` uses synthetic `user:<id>`. | `desk-07-legacy-bridge` | Decide compatibility contract and either map to active socket id or migrate UI off socket-id semantics. |
| DMG-008 | P2 | Legacy Bridge | Legacy mapping is fixed to `mainmap-lobby` room context. **Status: in progress via `desk-36` to `desk-40` (frontend hard cut to chat-v2 shared shell).** | `desk-07-legacy-bridge` / `desk-11-files` | Complete frontend cutover and remove legacy 2D runtime dependence on fixed-room mapping. |
| DMG-009 | P1 | Observability | Metrics/telemetry are process-local and reset on restart. | `desk-12-reliability` / `desk-13-migration` | Export metrics to persistent backend (Prometheus/Grafana or equivalent). |
| DMG-010 | P1 | Ops | No automated alert pipeline wired from thresholds/runbook. | `desk-12-reliability` | Wire alerts (pending backlog, failed events, p95 latency, failure-rate spikes). |
| DMG-011 | P2 | Release Ops | Feature-flag control is env-based only (no dynamic config service). | `desk-13-migration` | Introduce central config/flag service for staged runtime toggles. |
| DMG-012 | P3 | World/Desk Runtime | Global Phaser sleep/wake may need scene-specific resume hooks. | `desk-08-mode-toggle` | Add scene lifecycle pause/resume hooks where needed after gameplay QA. |
| DMG-013 | P1 | Realtime UX | Category/channel arrangement is not pushed in realtime to other connected Desk clients. | `desk-14-categories-and-channel-arrangement` | Emit/consume `chat:v2:category:*` and room-structure push events to auto-sync clients. |
| DMG-014 | P2 | Runtime/Ops | Media server listen port is hardcoded to `4000`; local parallel runs conflict (`EADDRINUSE`). | `desk-14-categories-and-channel-arrangement` | Move server listen port to env configuration with sensible default + startup log. |
| DMG-015 | P3 | Media Delivery | Desk GIF persistence is URL-only and depends on external GIF CDN availability. | `desk-19-gif-support-and-server-header` | Add optional async mirror-to-storage pipeline if stronger retention/control is required. |
| DMG-016 | P1 | Desk Search | Header message search (from/in filters, sort, grouped results) is not implemented yet. | `desk-14-message-search` planning | Implement `/docs/desk-mode-message-search-plan.md` packet sequence and validate DB index/query performance. |
| DMG-017 | P1 | Rollout Risk | Hard frontend cut to chat-v2 for 2D removes legacy fallback path and increases release blast radius. | `desk-36-2d-desk-chat-parity-context` | Execute parity validation matrix (`desk-40`) and monitor socket ack failures/timeouts post-release. |
| DMG-018 | P1 | DM/Friends Contract | DM/friends UI depends on new chat-v2 socket contracts and DB models not previously shipped. | `desk-41-dm-friends-context-reset` | Complete packets `desk-42` and `desk-43` before enabling DM rail UI in frontend. |
| DMG-019 | P1 | Unread Correctness | Aggregated unread badge semantics require room-level unread counts from backend read cursor state. | `desk-41-dm-friends-context-reset` | Validate unread-count API + cross-mode read updates in `desk-47`. |
| DMG-020 | P1 | Reply Threads | Reply-to-message UX and thread data contract are not implemented for Desk/2D parity, including root-only replies and thread panel flow. **Status: in progress via `desk-48` to `desk-53`.** | `desk-48-reply-thread-context-reset` | Implement packet sequence (`desk-49`..`desk-53`) and validate cross-mode/thread-notification correctness before rollout. |

## Resolved

- DMG-001: `prompt()` UX replaced with custom desk modals for room/category/member actions (post `desk-15`).

## References

- `/Users/AndrewPinon/projects/workdash/docs/style-system.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-10-room-management.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-11-files.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-12-reliability.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-13-migration.md`
- `/Users/AndrewPinon/projects/workdash/docs/desk-mode-handoffs/desk-14-categories-and-channel-arrangement.md`
- `/Users/AndrewPinon/projects/workdash-media-server/docs/chat-reliability-runbook.md`
- `/Users/AndrewPinon/projects/workdash-media-server/docs/chat-migration-rollout.md`
