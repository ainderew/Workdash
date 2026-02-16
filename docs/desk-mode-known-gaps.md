# Desk Mode Known Gaps Tracker

Last updated: 2026-02-16
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
| DMG-008 | P2 | Legacy Bridge | Legacy mapping is fixed to `mainmap-lobby` room context. | `desk-07-legacy-bridge` / `desk-11-files` | Add scene/room mapping strategy for non-mainmap contexts. |
| DMG-009 | P1 | Observability | Metrics/telemetry are process-local and reset on restart. | `desk-12-reliability` / `desk-13-migration` | Export metrics to persistent backend (Prometheus/Grafana or equivalent). |
| DMG-010 | P1 | Ops | No automated alert pipeline wired from thresholds/runbook. | `desk-12-reliability` | Wire alerts (pending backlog, failed events, p95 latency, failure-rate spikes). |
| DMG-011 | P2 | Release Ops | Feature-flag control is env-based only (no dynamic config service). | `desk-13-migration` | Introduce central config/flag service for staged runtime toggles. |
| DMG-012 | P3 | World/Desk Runtime | Global Phaser sleep/wake may need scene-specific resume hooks. | `desk-08-mode-toggle` | Add scene lifecycle pause/resume hooks where needed after gameplay QA. |
| DMG-013 | P1 | Realtime UX | Category/channel arrangement is not pushed in realtime to other connected Desk clients. | `desk-14-categories-and-channel-arrangement` | Emit/consume `chat:v2:category:*` and room-structure push events to auto-sync clients. |
| DMG-014 | P2 | Runtime/Ops | Media server listen port is hardcoded to `4000`; local parallel runs conflict (`EADDRINUSE`). | `desk-14-categories-and-channel-arrangement` | Move server listen port to env configuration with sensible default + startup log. |
| DMG-015 | P3 | Media Delivery | Desk GIF persistence is URL-only and depends on external GIF CDN availability. | `desk-19-gif-support-and-server-header` | Add optional async mirror-to-storage pipeline if stronger retention/control is required. |

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
