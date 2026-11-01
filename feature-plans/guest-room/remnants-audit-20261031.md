# Failed prototype follow-up audit

October 31, 2026. Audited both repositories, earlier source archives and selected live deployment settings. The audit below records the initial local cleanup and read-only production inspection.

Follow-up completed after authorization: the live and persistent TURN peer range now matches the actual SFU worker, 10000:10500. The stale operator address was replaced with the authenticated SSH client address. External UDP/TCP/TLS relay tests passed, blocked ports and expired credentials were rejected, and the old installer was retired on the server. See [verification](evidence/2026-10-31/turn-firewall-verification.json) and the [current TURN runbook](../../../Workdash-SFU/deploy/turn/README.md). The mismatch described in the historical findings below is resolved.

## Findings and cleanup

| Finding | Action |
| --- | --- |
| Fake map/image renderer, separate character picker, HTTP voice worker and dedicated deployment | Already removed in the first cleanup. Confirmed there are no remaining source entrypoints or compiled `dist/guest/server` / `dist/guest/media` artifacts. The real trial uses Phaser and the existing SFU. |
| Percentage-coordinate movement, reaction state and HTTP `sync` command in the retained admission model | Removed the command, movement handler, position/reaction fields and participant output. The command schema rejects the retired protocol. Live movement and reactions continue through the existing game handlers. |
| Old `mediaMembers` polling helper and promise queue | Removed after confirming there are no runtime callers. Current socket reconciliation, ownership fencing and shared SFU allocation guards remain. |
| Client packet counters from the retired voice UI | Removed the unused collector and always-zero packet metrics. Real server resource, traffic, latency, admission and log-delivery metrics remain. Browser loss/first-audio measurements are not currently supplied by the replacement runtime. |
| Prototype-specific auth callback change | Restored the existing NextAuth refresh behavior. The archived fake trial was the only caller of its extra session-update path; the current claim flow does not use it. Sign-in return, authenticated claims and overwrite consent remain. |
| Unused prototype reset shortcut in the Next proxy | Removed. The current UI uses explicit leave and resume. Guest cookies, Origin checks, server quotas and expiry remain. |
| Hard-coded TURN firewall installer | Removed `deploy/turn/peer-firewall.sh`, which would reinstall the retired UDP 11000:11100 rule. Archived the original. The live firewall still needs a reviewed update during rollout. |
| Misleading runbooks and dashboard log panel | Split old deployment instructions into explicitly historical documents. Rewrote current TURN/monitoring instructions for the normal backend, corrected the old port 4010 ingress comment, and changed the log panel to filter service `workdash-sfu-guest`. Added an evidence index so old load tests are not mistaken for current capacity proof. |

## Infrastructure and safeguards retained

Turnstile, the same-origin Next proxy and HttpOnly guest credential, short-lived socket tickets, quotas, expiry, invite rotation, revocation, claim checks and the bounded PostgreSQL admission ledger are used by the real implementation. Retain the migration and records. Stored legacy JSON fields are ignored and not exposed; no data migration or purge is necessary for this cleanup.

TURN remains useful for browsers that cannot connect directly to the real SFU. Keep coturn, its certificate/renewal hook, scoped credentials, peer restrictions, quotas and probes. Grafana, Prometheus, Loki, Alertmanager and node-exporter remain the monitoring stack. Existing dashboard UID and Loki job labels are preserved for link/history compatibility; the current service filter separates logs.

Keep shared map artwork, the real character creator, audio-zone changes and first-use help. The existing loading UI still uses the map preview asset. `guest-real-fixture.mjs` and `guest-real-check.mjs` are local checks of the actual runtime, not a replacement product or separate voice implementation.

## Live deployment findings

The following containers are exited with restart policy `no`:

- `workdash-frontend-guest-candidate`
- `workdash-guest-guest-1`
- `workdash-guest-guest-redis-1`

The ordinary frontend/backend, TURN and monitoring containers are running. Nginx still redirects `/try` and `/try/` to `/`. The real guest replacement and this cleanup have not been deployed.

`WORKDASH_TURN_PEER` still allows UDP 11000:11100 then rejects other ports on the permitted SFU IP. The server's retained installer also contains that old range. Before deploying real guest voice, replace both the live and persistent rules using the actual backend RTC range, then validate forced TURN/TLS and real browser audio. The repository default is 10000:10500, but the release environment must determine the rule. Do not run the retired installer.

The previous operator-only TURN ingress needs rechecking as part of that rollout. No additional IP or port 443 relay was provisioned in the recorded implementation. Stopped images, volumes, drafts and secrets remain recoverable; this audit did not delete production recovery assets.

## Verification

- 78 backend unit/regression tests passed across guest lifecycle/security, telemetry/resources, socket policy and shared SFU ownership/limits.
- 10 PostgreSQL integration tests passed on a separate disposable database, including old-draft compatibility, account claims, capacity races and socket-only presence renewal. All 63 migrations applied to that empty test database. The test container and its volume were removed afterward; the running local trial database was untouched.
- Nine frontend proxy/sign-in-return tests passed. The backend build and frontend TypeScript check passed.
- Loki accepted the new current-service log query. It returned no production current-service data, as expected before rollout. No dashboard or live monitoring configuration was changed.
- Reviewed changes against the pre-cleanup archive. No browser or real-audio test was repeated because this cleanup does not change the game or audio path. Sustained capacity and real-network relay validation remain rollout work.

## Recovery and related documentation

The [cleanup manifest](evidence/2026-10-31/remnants-audit-manifest.json) records hash-verified source backups and the separate dashboard/proxy backups under `/Users/drew/.codex/private`. Prior prototype archives and server recovery files remain intact.

See [the real guest implementation and rollout](README.md), [evidence index](evidence/README.md), [earlier cleanup history](prototype-history.md), [TURN runbook](../../../Workdash-SFU/deploy/turn/README.md) and [monitoring runbook](../../../Workdash-SFU/deploy/observability/README.md).
