# Guest rooms production completion handoff

Updated: November 2, 2026, Asia/Manila. Evidence filenames use November 1 UTC for this release.

Finish the real WorkDash guest trial through production deployment, monitoring, end-to-end verification, measured capacity, public launch and acquisition measurement. The trial uses the real Phaser game and shared SFU in production. The release history and current acceptance status are below.

This is the current execution handoff. It supersedes the original [guest room trial handoff](guest-room-trial-handoff.md) wherever that document describes a separate scene, HTTP voice service, unavailable voice or an earlier rollout. Preserve the original product and server security constraints described below. Do not rebuild the retired prototype.

## Required outcome

A visitor can create an approved character without an account, create an invite-only temporary room, invite friends, walk through the real world and talk through the existing audio-zone system. Each participant can sign in to save their character. Only the host can save the room as a normal account workspace.

The room has an immutable 20-minute deadline starting at successful creation, a three-minute empty timeout, and a separate 45-second presence grace for crashed connections. Maximum room occupancy is eight including the host. Standing still or muting does not make someone absent. Saving does not extend anonymous access or make anonymous visitors permanent workspace members. Drafts remain claimable for 24 hours after the room deadline. Existing characters require explicit overwrite consent.

Account-only tools remain restricted, including unrestricted chat, files, camera, screen sharing, music/integrations and the soccer arena. Voice must work through the existing microphone controls. Keep outdoor audio and the first-use audio-area guide. The first visit must be the actual platform, with truthful controls and errors.

Completion means all six phases below have their acceptance evidence. A deployment alone is insufficient. Fix failures and rerun the affected checks before advancing; do not silently omit voice, monitoring or signup to meet a release date.

## Current release status, November 2, 2026

Public launch and immediate release verification are complete within the evidence scope below. Public TURN listeners and the `/try` route are open. The backend is configured for public access at **eight total guests across two rooms, eight places per room**, with a 2 GiB shared-service memory limit. Creation and joining are enabled with challenge enforcement intact. The UTC deadline and socket burst corrections are deployed, and public discovery is enabled. Do not call either aborted canary a passing lifecycle test.

Frontend [PR #43](https://github.com/ainderew/Workdash/pull/43) merged through the explicitly approved administrator process; the repository ruleset was preserved. Backend [PR #4](https://github.com/ainderew/Workdash-SFU/pull/4), [#5](https://github.com/ainderew/Workdash-SFU/pull/5), [#6](https://github.com/ainderew/Workdash-SFU/pull/6) and [#7](https://github.com/ainderew/Workdash-SFU/pull/7) are merged. The normal backend deployment at `2452473d062d3996c309dcfcaec34373c10d4ced` preserved the public configuration. The original dirty checkouts remain untouched.

The public canary exposed a production-specific clock error: adapter-pg replaced the Berlin `timestamptz` offset with UTC, shifting JSON ledger timestamps by one hour. Relative gameplay expiry still used 20 minutes, but TURN credentials requested late in a room could outlast its intended deadline. [Backend PR #8](https://github.com/ainderew/Workdash-SFU/pull/8) uses numeric Unix milliseconds, transaction-local UTC for cohort reads and an idempotent legacy-ledger upgrade. The upgrade closes old active trials and revokes invites while retaining appearances, claims and saved workspace ownership. A private ledger backup is retained. Do not roll back to a pre-fix backend with guest access enabled.

A second canary ended with `RATE_LIMITED` while a normal visitor was standing in the room. A deterministic 50 Hz stream with network stalls reproduced false rejection by the fixed one-second windows. [Backend PR #9](https://github.com/ainderew/Workdash-SFU/pull/9) retains sustained limits of 60 packets/second and 20 control messages/second, with two seconds of bounded burst credit. [Frontend PR #44](https://github.com/ainderew/Workdash/pull/44) drops obsolete guest movement under transport backpressure. Reliable controls and normal account messaging are unchanged. Logs now identify the exhausted packet/control budget and role, without participant identifiers. The new flood, stall and clock-rewind regression tests passed. See [rate correction evidence](../../feature-plans/guest-room/evidence/2026-11-01/public-rate-correction.json).

The final backend release passed **207 tests across 16 files**, including 16 disposable PostgreSQL checks with Berlin, New York and Manila connections, legacy conversion/claim preservation, UTC cohort activation and TURN expiry assertions. The TypeScript production build passed. The movement correction passed 50 targeted frontend tests, TypeScript and the production build; its normal CI passed 62 tests. Runtime date correction does not change the tested media architecture or increase capacity.

[Frontend PR #45](https://github.com/ainderew/Workdash/pull/45) corrects the real-world readiness callback: the old check expected the retired scene name `Game`, so `MainMap` loaded without the world-entry funnel event. It now recognizes `MainMap` and `SoccerMap`, with a regression test for readiness and cleanup. All 51 targeted tests, TypeScript and the production build passed locally; normal release CI passed 63 tests across 11 files and deployed `c0b25487c9681a51942fa71507befd1bae4eeb18`. A fresh homepage visitor entered the real map, and `funnel_world_entered{reason="hero"}` was observed in Loki and the live Grafana dashboard. Reloading retained the exact original deadline and two guest sockets/two media transports.

Completed journey and infrastructure evidence:

- [Production sign-in and saving](../../feature-plans/guest-room/evidence/2026-11-01/production-signin-save.json): Google returned to the retained draft and required explicit consent before replacing the operator's existing character. No replacement was performed. A real magic link reached a dedicated operator test alias, returned to the retained draft and saved its character and room exactly once. The saved “Our hangout” workspace opened in the normal Phaser world. New accounts receive a default character, so this test explicitly accepted replacing that default. The dedicated account/workspace remain available for review.
- The operator reported “ok i tested it it works.” Detailed devices, networks and provider coverage were not supplied. Treat physical testing as user-reported, not independently observed evidence. No universal corporate-network claim is made; TLS 443 is not deployed.
- Public TURN listener probes passed [allowed relay traffic](../../feature-plans/guest-room/evidence/2026-11-01/turn-public-allowed.json), [blocked peer ports](../../feature-plans/guest-room/evidence/2026-11-01/turn-public-blocked.json) and [expired credentials](../../feature-plans/guest-room/evidence/2026-11-01/turn-public-expired.json) over UDP, TCP and certificate-verified TLS. Only UDP/TCP 3478 and TCP 5349 to the exact server IPv4 were opened. Coturn UID 19991 still reaches only UDP 10000:10500 on the exact SFU IP. No relay-allocation range, private management port or monitoring port was opened. Temporary echo listeners have stopped.
- [Browser relay checks](../../feature-plans/guest-room/evidence/2026-11-01/browser-relay-host.json) selected UDP/TCP/TLS candidates and decoded nonzero audio in both directions on isolated hardened production-host fixtures. This establishes decoded audio, not physical speaker output.
- [External alert receipts](../../feature-plans/guest-room/evidence/2026-11-01/email-alert-delivery.json) confirmed firing and recovery messages through Prometheus, Alertmanager and Resend. The approved operator's private receiver and read-only SMTP secret remain configured. No temporary test route remains.
- [Local account/group acceptance](../../feature-plans/guest-room/evidence/2026-11-01/local-save-and-group-activation.json) covers invitation, overwrite consent, conversion, normal World/Desk re-entry and two signed-in members overlapping for five minutes. Production magic-link delivery is separately proven above.

The [31.09-minute eight-guest plus two-account capacity run](../../feature-plans/guest-room/evidence/2026-11-01/capacity-eight-guests-two-accounts.json) passed its unchanged [numeric criteria](../../feature-plans/guest-room/evidence/2026-11-01/capacity-criteria-v2.json). All 18 observed connections succeeded. Warm transport p95 was 1.46 seconds, account loss increased by 0.40 percentage points, and account latency/jitter p95 stayed below baseline. Expiry/replacement and final cleanup passed. Peak guest egress was 8.312 Mbit/s, leaving 30.73% below the 12 Mbit/s policy guard; event-loop p95 peaked at 89.92 ms. Peak container use was 210.61 MiB of 2 GiB. This supports the initial eight-guest cap; it does not establish a hardware maximum. [Earlier attempts](../../feature-plans/guest-room/evidence/2026-11-01/capacity-attempts.json) remain labeled failed, aborted or invalid.

Saved-group definition `v1` is implemented: two current signed-in members overlap for five minutes, followed by a separate qualifying visit on a later UTC day within seven days. Duplicate tabs and guests do not count. Private associations are bounded to 14 days before activation or eight days after activation; aggregates last 90 days. Grafana panels 57/58 and missing-metric alerts are deployed. Mature seven-day results are not yet available.

Public acquisition is enabled: the homepage and friends page link to `/try`; its explanatory HTML is indexable, canonical and in the sitemap. `/try?play=1` remains `noindex`. The 12-page SEO check passed. [Search Console](../../feature-plans/guest-room/evidence/2026-11-01/public-search-console.json) confirmed that `/try` is available to Google, accepted its indexing request and processed the sitemap successfully with 12 discovered pages. Indexing, rankings and AI citations are not yet established.

Keep the first 24-hour production review and cohort maturity separate from immediate launch verification. The corrected public release was reopened around **November 1, 16:36 UTC (November 2, 00:36 Asia/Manila)**; review a full day's traffic no earlier than November 2, 16:36 UTC (November 3, 00:36 Asia/Manila). Check admission pressure, voice failures, account impact, container/worker/bandwidth peaks and alert/log delivery before increasing caps or promotion. Seven-day return requires an activated group and a mature observation window; do not substitute an empty denominator for a zero return rate. No recurring follow-up automation has been created. Marketing outreach, a paid IP and raising capacity remain separate decisions.

The [final public manifest](../../feature-plans/guest-room/evidence/2026-11-01/public-launch-final.json) records immutable images and settings. Backend `817849daf9839e41a85b48f2c7a1c332de219389` adds only the corrected dashboard caption to the tested runtime. Frontend `c0b25487c9681a51942fa71507befd1bae4eeb18` includes the world-entry fix. Normal CI deployments retained public admission, independent secrets, challenge enforcement and the eight-guest/two-room ceiling. The evidence commit is a later documentation-only frontend release; its normal workflow records that image without changing application behavior.

[Final canary evidence](../../feature-plans/guest-room/evidence/2026-11-01/public-canary-final.json) records a 15-minute uninterrupted connection without rate rejection, followed by browser-window closure and correct presence-grace/empty-room expiry. The window disappeared before the intended hard-deadline observation, so this is **not** a completed 20-minute public browser run. A fresh final-build entry, one reload with the identical deadline and explicit leave also passed. Both rooms expired after three empty minutes; guest sockets/media returned to zero while two account transports remained. Forty-three samples through cleanup were healthy; sampled memory peaked at 360.37 MiB of 2 GiB and event-loop p95 at 30.82 ms. Earlier production hard-expiry and 31-minute capacity evidence cover the hard deadline, with the new UTC regression suite covering timestamp correctness.

[Final monitoring](../../feature-plans/guest-room/evidence/2026-11-01/public-monitoring-final.json) and [post-redeploy monitoring](../../feature-plans/guest-room/evidence/2026-11-01/public-monitoring-after-redeploy.json) show live scraping/log receipt and no remaining firing alerts. The ordinary backend replacement briefly fired `WorkdashGuestRuntimeUnavailable`; it recovered and both Prometheus and Alertmanager were clear by 17:02:55 UTC. The final browser funnel receipt is visible in [Grafana](../../feature-plans/guest-room/evidence/2026-11-01/public-funnel-dashboard.png). [Backend PR #11](https://github.com/ainderew/Workdash-SFU/pull/11) changes the browser-intent panel from hourly increases to explicitly labeled counters since server start. A historical query showed the first world-entry receipt as 0 with the old calculation and 1 with the corrected panel. Runtime counters reset on a process restart; persistent save totals and historical Prometheus/Loki evidence remain. The sampler ended after cleanup; its last read overlapped the ordinary dashboard-caption backend deployment and is excluded from the completed canary window.

The following starting state and six phases are the historical procedure. Their original pending items are superseded by this dated status and the evidence linked above.

## Starting state

| Area | State at handoff | Remaining work |
| --- | --- | --- |
| Real guest game | Implemented locally using the normal game, character creator, multiplayer and SFU | Extract a release, build it and deploy it |
| Server boundaries | Guest namespace, tickets, quotas, expiry, claims, resource limits and tests exist | Verify the deployed ingress, configuration and adversarial behavior |
| First-use audio | Outdoor fallback zone and dismissible area help implemented and browser-checked locally | Verify real voice across zones on supported devices |
| TURN | Live and persistent peer rules allow only UDP 10000:10500 to the exact SFU IP for UID 19991; listeners are operator-only | Wire credentials into the released backend, test real browser relay audio, then open client ingress at public launch |
| Production entry | `/try` and `/try/` redirect to `/`; retired containers are stopped with restart policy `no` | Allow restricted testers, then remove the public redirect at launch |
| Monitoring | Host/TURN dashboards are live; real guest instrumentation and panels are local | Deploy authenticated scraping/log shipping, fill monitoring gaps and verify alert delivery |
| Capacity | Defaults are 24 global guests, six rooms and eight guests per room | Establish the actual shared-server ceiling; old prototype tests are not evidence |
| Acquisition | The local trial is `noindex` and its entry UI is client-rendered | Add public HTML explanations, search integration and a verified conversion funnel |

The [read-only baseline](../../feature-plans/guest-room/evidence/2026-11-01/handoff-baseline.json) records current image IDs and repository heads. Re-read them before execution. The running images use `latest` and have no revision label, so remote `main` is not proof of the deployed revision.

The frontend checkout is based on `4835d853`, while remote `main` was `30bb0a4a`. The backend local/remote base was `798a9b89`. Both checkouts contain unrelated work. In particular, preserve newer landing/search work, billing planning, workspace ownership changes, and GCS/chat-file changes.

The live backend's Docker memory limit was **0**, meaning unlimited. The guest production guard requires a known finite memory budget. Do not copy the old prototype's 512 MiB limit onto the whole account backend. Measure existing usage and set a suitable shared-service limit.

## Source map and operating access

All paths are relative to `/Users/drew/Desktop/projects/workdash-project` unless stated otherwise.

| Purpose | Source |
| --- | --- |
| Current behavior, constraints and evidence | [Guest feature README](../../feature-plans/guest-room/README.md) |
| Entry, invite, save and error UI | `Workdash/src/features/guest/GuestEntry.tsx`, `session.ts`, `Challenge.tsx`, `entry.module.css`; `src/pages/try.tsx` |
| Same-origin proxy and sign-in return | `Workdash/src/pages/api/guest/index.ts`, `src/common/utils/safeAuthReturn.ts`, login and magic-link verification changes |
| Real game integration | `Workdash/src/App.tsx`, character creation, multiplayer, media transport, audio chat, audio zone manager and `BaseGameScene` changes |
| Audio guide | `Workdash/src/common/components/UiControls/AudioAreaIndicator*`, `src/common/store/worldAudioStore.ts`, onboarding hook |
| Server guest runtime | `Workdash-SFU/src/guest/runtime.ts`, `socket-policy.ts`, `security.ts`, `model.ts`, `store.ts`, `resources.ts`, `turn.ts`, telemetry/log sink |
| Existing services reused by guests | `Workdash-SFU/src/index.ts`, media handlers, `mediasoup.service.ts`, `game.service.ts`, `audioZone.service.ts`, workspace claim path |
| Migration | `Workdash-SFU/prisma/migrations/20261030000000_guest_trial` and `GuestTrialState` in the Prisma schema |
| Configuration templates | [Backend guest settings](../../../Workdash-SFU/src/guest/.env.example), [frontend settings](../../feature-plans/guest-room/frontend.env.example), [ingress example](../../../Workdash-SFU/deploy/guest.nginx.conf.example) |
| Deployment workflow | `.github/workflows/deploy.yml` and `Dockerfile` in each repository |
| Monitoring | [Current monitoring runbook](../../../Workdash-SFU/deploy/observability/README.md) and its Compose, dashboard, scrape and rule files |
| TURN | [Current TURN runbook](../../../Workdash-SFU/deploy/turn/README.md), `update-peer-firewall.py`, `scripts/guest-turn-probe.py` |
| Cleanup and historical evidence | [Follow-up audit](../../feature-plans/guest-room/remnants-audit-20261031.md), [evidence index](../../feature-plans/guest-room/evidence/README.md) |
| Existing growth initiative | `worktrees/seo-wins/docs/growth/seo-aeo-initiative.md`; locate its current merged equivalent before changing landing pages |

Use SSH alias `ssh_bb`. The normal containers are `workdash-frontend` on host port 8080 and `workdash-backend` on 4000. The active Nginx configuration is `/etc/nginx/sites-enabled/workdash`. The backend workflow uses `/root/workdash/.env.backend`; preserve its existing unrelated settings and mounts. TURN lives at `/root/workdash/turn`; monitoring at `/root/workdash/observability`. Verify these locations before writing.

Turnstile is already provisioned. Its private local record is `/Users/drew/.codex/private/workdash-turnstile.json`, with a server copy under `/root/workdash/guest/turnstile.json`. The local Grafana password is `/Users/drew/.codex/private/workdash-grafana-password`. Recover values through these private files or the existing provider configuration. Never paste secrets, credentials, cookies, complete environment files or invite links into logs, commits, evidence or chat. Archive source/configuration with secrets and certificates excluded.

Historical retired services and their images/volumes are recovery assets. Do not start `workdash-frontend-guest-candidate`, `workdash-guest-guest-1` or `workdash-guest-guest-redis-1`. Do not deploy `guest-real-fixture.mjs`, a local-only test entrypoint, or restore the old HTTP voice implementation.

## Phase 1 Prepare and deploy the real release for restricted testing

1. Inspect current artifacts/worktrees and reuse a suitable clean release checkout, or create one from the verified current base. Record local changes before extraction. Prepare a reviewed guest-only patch and a file manifest. Copy the necessary hunks from mixed files, not every dirty file. Preserve current landing/search changes. Do not reset or clean the user's working directories.
2. Establish the running release from image IDs/digests and CI history. Fetch current source and reconcile the intended release with it. Record both frontend/backend source SHAs, image references/digests, migration state, safe configuration values and previous image IDs. Retain rollback tags before any image pruning.
3. Fix the deployment path before using it. The current frontend workflow passes the public Turnstile build argument but does not pass `GUEST_INTERNAL_URL`, `GUEST_PROXY_SECRET` or `GUEST_TRUSTED_IP_HEADER` at runtime. Persist those through a protected runtime env file or the repository's approved secrets mechanism. The backend workflow must preserve its guest settings and chosen memory limit on every redeploy. Pin build, migration and deployment to the same immutable release image rather than independently pulling `latest`. Record a revision label for later diagnosis.
4. Resolve the backend runtime mismatch: the checked-in Dockerfile uses Node 20 while `package.json` declares Node >=23. Select a supported runtime compatible with the actual dependencies and mediasoup native worker, align build/runner stages and verify the complete image. Do not infer container readiness from a local TypeScript build.
5. Measure normal backend memory, CPU, socket counts and voice behavior with guests off. Account for monitoring and other hosted applications. Set a finite backend memory limit with measured headroom and verify that cgroup usage/limit are visible inside the container. Configure a protected Redis endpoint for the existing runtime. Preserve quotas and the owner lease; do not run concurrent guest owners against the same ledger.
6. Verify the guest migration in the production migration history, then apply only missing migrations through the normal migration workflow using the exact release image. Keep the existing guest table and retained drafts. Do not run the disposable test suite or reset its ledger against production.
7. Supply the settings in the table below. Build the frontend with the actual public Turnstile site key, not a test key or blank value. Generate a production `GUEST_SOCKET_SECRET` if missing. All guest secrets must be independent, at least 32 characters, and distinct from the account JWT key. Keep the shared TURN key private and consistent with coturn.
8. Deploy the backend first with both guest admission flags false, then deploy the frontend and check normal account behavior. Use the normal application services. A shared backend replacement can interrupt account sockets, so drain active calls or use the existing maintenance/release procedure. Do not start a second shared backend on the same RTC ports as a shortcut.
9. Configure Nginx request/body/connection limits, trusted client-address handling and websocket forwarding. Public API/SFU hosts must deny `/internal/guest` and its descendants; the Next BFF reaches them privately. Prevent direct access to backend/Next ports from bypassing ingress. Preserve `/socket.io` transport/upgrade support for the `/guest` namespace. Verify spoofed forwarding headers cannot choose a test network or evade quotas.
10. Enable restricted mode for one to eight approved tester networks. Keep public redirects for other visitors, but permit approved testers to load `/try` and `/try/` on the canonical HTTPS hostname. Keep the page `noindex`. Match tester access at both the application and TURN listener firewall. Recheck dynamic operator IPs through a trusted channel; do not allow an entire ISP subnet.

| Setting | Restricted release |
| --- | --- |
| `GUEST_ENABLED` / `GUEST_TEST_ENABLED` | `false` / `true` after the initial disabled deployment |
| `GUEST_TEST_NETWORKS` | Comma-separated HMAC-SHA256 network hashes using the proxy secret and `guest-network:` followed by the trusted client IP; compute privately, using the same address normalization as the BFF |
| `GUEST_CAPACITY_REVIEWED` | `false` until Phase 4 supplies the report |
| `GUEST_INTERNAL_URL` | Private normal backend URL ending in `/internal/guest`, normally `http://127.0.0.1:4000/internal/guest` with the current host networking |
| `GUEST_TRUSTED_IP_HEADER` | `x-guest-client-ip` only after Nginx overwrites it and direct bypass is blocked |
| Turnstile | Existing managed widget, hostname `workdash.site`, action `guest_admission`; backend validates the response; production challenge bypass stays false |
| TURN | Existing relay secret and URLs for `sfu.workdash.site`, UDP/TCP 3478 and TLS 5349; `GUEST_TURN_RELAY_ONLY=false` except a scoped relay test |
| RTC | Confirm actual worker arguments remain 10000:10500 and match the live/persistent coturn peer rule |
| Trial limits | Start restricted testing at a small explicit cap; retain eight-person room, 20-minute deadline and current retention rules; record the values |
| Resource limits | A measured finite backend memory limit, protected Redis, bounded pools and current guest stream/traffic guards |

`GUEST_ENABLED=true` and `GUEST_TEST_ENABLED=true` are mutually invalid. Switch them together during launch. With both false, the guest runtime does not expose working guest metrics; monitoring should expect the target only once restricted mode is active.

Acceptance: both exact release images build and run, normal account flows still work, approved testers can enter the real game, other networks cannot create/join, Turnstile works, internal endpoints are inaccessible publicly, and container memory is known. A second deployment must retain these settings.

## Phase 2 Finish production monitoring and alerts

1. Mount a distinct metrics credential into Prometheus at `/run/secrets/guest_metrics_token`. The current monitoring Compose file only defines the Grafana password secret; add the metrics secret definition and service reference. Enable the `workdash-sfu-guest` scrape at the normal backend's `/internal/guest/metrics` with Bearer authentication. Wrong, absent, proxy and admin credentials must not substitute for the metrics credential.
2. Set `GUEST_LOKI_PUSH_URL` on the normal backend and deploy the current dashboard/rules. Keep Grafana UID `workdash-guest-voice` so existing links continue working. Query current logs with `{job="workdash-guest"} | json | service="workdash-sfu-guest"`. Verify an actual admission, rejection, room end and claim in metrics/logs without logging their private payloads.
3. Show active guests/rooms versus configured caps, connected sockets, guest/account transport/producer/consumer counts, account connections/users, shared worker CPU, memory usage/limit, event-loop delay, guest ingress/egress, rejection reasons, request latency, TURN allocations and log-delivery failures. Clearly distinguish configured places from measured safe capacity. Do not report a linear users-per-core ratio from mixed account/guest CPU samples.
4. Close specific instrumentation gaps needed to diagnose voice failures. Current metrics do not measure browser first-audio time, packet loss or audible success. Add bounded connection/failure and quality reporting through the real media path, reusing shared media stats. Client samples are untrusted diagnostics, never authorization or capacity inputs. Bound event names, reason values, payload size, frequency and retention; never label metrics by guest, account, room, IP or invite. Distinguish microphone denial, playback/autoplay blocks, ICE/TURN failure and server allocation refusal.
5. Add alerts for missing/stale guest metrics once that target is expected, sustained admission rejection/pressure, abnormal voice connection failures, shared account impact and log delivery failure. The current availability expression catches `up == 0` but not an entirely absent scrape series. Make the expected-target/no-data behavior explicit without creating alarms for a deliberately disabled rollout.
6. Validate Compose and Prometheus configurations, `promtool check rules`, and focused firing/recovery cases. Exercise dependency loss and native worker failure only in a disposable or staging environment, not by killing the shared production SFU. Verify overload closes new admission appropriately and never leaves expired media alive.
7. Preserve the approved operator email destination in the private Alertmanager configuration and its read-only SMTP secret. This gate passed on November 1 with both firing and resolved messages verified in the operator inbox. Repeat the harmless delivery test after provider/credential changes; an Alertmanager UI status alone does not prove receipt. Do not replace the private receiver with the dashboard-only bootstrap configuration.

Grafana access remains private: `ssh -N -L 13030:127.0.0.1:3030 ssh_bb`, then `http://127.0.0.1:13030/d/workdash-guest-voice`. Preserve 30-day/3-GB Prometheus limits, 14-day Loki retention and bounded Docker logs. Do not publish monitoring ports.

Acceptance: an operator can identify what limit was hit, actual usage at that time, whether accounts were affected and whether recovery occurred. Metrics, current-service logs and tested external notifications must all be available.

## Phase 3 Verify the complete guest and account journeys

Run against the restricted HTTPS release with two separate browser profiles and at least two networks. Use approved test accounts and test-owned rooms. Automated media checks may use synthetic audio tracks; at least one human check should confirm microphone capture, playback and controls without recording private conversations.

| Scenario | Required result |
| --- | --- |
| New host, no account | Character choice enters the real Phaser canvas; timer starts on successful room creation; microphone starts muted |
| Invite from another profile/network | Friend reaches that room after character choice; invite is in the URL fragment and absent from requests/referrers/logs |
| Room audio | Both directions carry audio in the same zone; other zones cannot hear it; outdoor paths work; moving across boundaries releases old subscriptions |
| TURN fallback | Force relay in a scoped test, prove ICE selected a relay and received/decoded audio in both directions over supported UDP/TCP/TLS paths; restore direct-first operation afterward |
| Supported devices | Desktop and real mobile checks cover touch movement, audio guide, mute/local mute, permission denial, device changes and autoplay recovery; no clipped essential controls |
| Reconnect and duplicate tabs | Reconnect preserves expiry and room; one game and one media socket per principal; resources do not multiply; a dropped host does not remove present friends |
| Room lifecycle | Explicit leave, 45-second crash grace, three empty minutes and 20-minute hard deadline are independently verified; media closes; motionless or muted users remain present |
| Moderation | Only host can kick/close/rotate; old invite cannot admit; kicked credential cannot return; reports are bounded |
| Save via Google and magic link | Return reaches the same draft; host saves selected character and a usable normal workspace; member saves only their character; the saved workspace opens through the normal app |
| Save edge cases | Existing character needs explicit replacement; cancelled/retried auth preserves intent; duplicate claim creates only one workspace; expired draft can save without reviving access; quota failure rolls back |
| Conversion with friends present | Guest invite is revoked; anonymous friends keep only the original deadline; no automatic account membership or elevated host capability |
| Admission errors | Full room, global cap, invalid/expired invite, bad challenge and rate limit give accurate next actions; appearance is preserved; no infinite spinner |
| Server authorization | Guest cannot reach account APIs, files/history, another room/zone or another transport/producer/consumer; expired tickets and already-open revoked sockets stop working |
| Account regression | Existing account sign-in, workspace joins, character loading, movement, voice, calls and other affected shared-service behavior still work |

The old probe with temporary UDP echo listeners verified the relay/firewall protocols. It did not establish audible guest audio through the released application. Keep that distinction in the new evidence.

TLS 5349 is deployed; TLS 443 is not. Test a real restrictive network. If a required target network only permits 443 and fails, scope the additional endpoint separately using the existing [port 443 planning history](../../../Workdash-SFU/deploy/turn/PORT-443-PLAN.md), recheck its assumptions and obtain approval before spending money. Do not advertise support for a network configuration that has not passed, or buy an IP automatically.

Acceptance: all journey/security cases pass with the release SHA, browser/device/network, time, expected outcome and actual result recorded. Close identified defects in the real implementation and repeat affected cases.

## Phase 4 Establish shared-server capacity

Use a load generator outside the SFU host. Build it against the actual game namespace, ticket/admission and media handlers; do not resurrect the removed HTTP voice harness. Keep production protections enabled. Use legitimate approved test sessions/networks and a separate protected test environment where load setup requires special provisioning. Never deploy a production challenge bypass or disable quotas to make a benchmark pass.

1. Record host hardware, CPU quota, memory cap, bandwidth, image versions, current normal-account workload and other service usage. Establish an account-call baseline before guests.
2. Test 2, 8, 16 and 24 guests only as resources permit. Include a full eight-person room with everyone transmitting, multiple rooms/zones, movement, idle listeners, join/reconnect bursts, expiry and replacement-room churn. Include direct and forced-relay paths. Hold each meaningful tier for at least 30 minutes so it crosses the 20-minute room lifetime.
3. Run full-load and failure scenarios on a disposable deployment matching production limits. Validate the chosen small canary on the actual shared host under controlled normal traffic. Stop increasing load on sustained quality/resource regression. Do not overload public account calls to discover the breaking point.
4. Use numerical criteria agreed before the run. Initial release targets are at least 99% successful supported voice connections, p95 warm voice connection below three seconds, and below 1% unexpected signaling failures. Count samples and report confidence limitations for small samples. Require no unauthorized media, no unexplained surviving guest resources after their cleanup/grace bounds, and no material account regression against the recorded baseline. Define the account latency/loss/jitter tolerance before testing rather than choosing it after results.
5. Leave measured headroom, initially targeting at least 30% below the first limiting resource, rather than assuming 24 is safe. Record worst observed worker CPU, memory, egress, TURN allocations, event-loop delay, error/quality rates and cleanup time at each tier. Include normal-account demand in the chosen ceiling.
6. Set room/global caps and alert thresholds from the passing tier. Keep the eight-person room maximum unless product scope changes. A smaller initial public global ceiling is acceptable if measured; mark it explicitly. Raise it only after the next tier passes. `GUEST_CAPACITY_REVIEWED=true` is a record of this decision, not a bypass for unfinished tests.

Acceptance: a dated capacity report names the limiting resource, tested ceiling, initial public cap, headroom, stop/recovery behavior and account impact. Guest, shared-worker and host evidence must agree. Old prototype 24-peer results and local signaling tests are excluded from this decision.

## Phase 5 Launch and operate public guest access

Complete Phases 1–4 before opening admission. Prepare Phase 6's code alongside testing so it can ship with launch, but keep public discovery unpromoted until the journey works.

1. Capture exact rollback images, deployment settings, migration status and Nginx/TURN/monitoring backups. Name the operator who will watch the canary and receive alerts. Verify that this is the release tested above.
2. Open only the TURN client ingress needed for the supported endpoints, preserving the exact SFU peer IP, UDP RTC range, quotas and deny rules. Review relay return traffic and provider firewall behavior on the current co-located topology before adding any relay-port ingress. Do not expose arbitrary peer destinations, management ports or monitoring endpoints. Re-run allowed/blocked/expired-credential probes after firewall changes.
3. Switch application flags atomically to `GUEST_ENABLED=true`, `GUEST_TEST_ENABLED=false`, and `GUEST_CAPACITY_REVIEWED=true`, using the measured cap. Clear test-network configuration from the active public configuration. Preserve the server's request, socket, resource and lifecycle limits.
4. Remove the temporary `/try` redirects for all visitors. Verify HTTPS entry, invite fragments and both sign-in methods from a network not on the former tester allowlist. Confirm public failures show correct capacity/challenge errors, not tester-only restrictions.
5. Observe at least one full room lifecycle during the initial canary. Review the next 24 hours of real traffic before increasing caps or promotion. An operator can review this manually; do not create recurring automations without a request.
6. Repeat the deployed configuration checks after a normal automated redeploy to prove the feature survives routine releases. Record the final source SHA/image digests and configuration in the release manifest.

Acceptance: a genuinely new visitor can complete the real voice trial and save flow, normal account users remain healthy, alerts reach the operator, and the release has a working rollback. Report the actual public limits and supported voice paths.

### Scoped rollback

The existing backend owns both account and guest traffic. Stopping it is not a guest-only rollback.

Use the private `POST /internal/guest/admin` endpoint with `x-guest-proxy` set to the separate **admin** secret. Its accepted bodies are `{"control":"pause-create","enabled":true}`, `{"control":"pause-join","enabled":true}` and `{"control":"stop","enabled":true}`. Read the current handler before execution. Pass secrets from a protected file or process input, never in a logged command or URL. Pause creation/joins to drain; use stop for immediate guest revocation. Stop expires live trials, and clearing it does not revive them.

The runtime stores controls in Redis keys `guest:real:pause-create`, `guest:real:pause-join` and `guest:real:stop`. These controls can survive a process restart. Do not clear them casually during rollback or confuse a persisted stop with a deployment failure. If the guest runtime is fully disabled or unavailable, its admin route will not work; restore a verified configuration or image through the normal release procedure.

If the public entry is broken, restore its temporary redirect or an honest availability page while preserving sign-in/save access where feasible. Roll back the exact affected application image if needed. Preserve additive database migrations, claim data and private evidence. Do not resurrect stopped prototype containers or revert the corrected TURN peer range as a generic rollback. Only use the validated peer updater if the verified SFU port configuration itself changes.

## Phase 6 Connect acquisition and measure results

1. Reconcile with the current landing and SEO/AEO/GEO initiative. The release checkout must preserve already-shipped homepage, `#demo`, help, comparison and friend-hangout content. Add a clear “Try without signing up” CTA to `/try` where it fits, with a normal sign-in alternative. Do not send users to the retired fake room or replace the existing real walkthrough with a mock scene.
2. Give `/try` useful server-rendered HTML around the entry flow. Its current `GuestEntry` is loaded with `ssr: false`; removing `noindex` alone would not provide the required explanatory content. Include a brief product description, how to invite friends, room and expiry limits, room-based voice behavior, what signup saves and answers to common questions. Keep the live game dynamically loaded after user intent and avoid adding a second onboarding funnel.
3. Make the public explanatory entry indexable only when public admission works. Add a canonical URL, unique title/description, sitemap entry and contextual links from relevant existing pages. Keep `/try?play=1` live-session responses out of indexing, and keep API/auth/private routes protected. An invite fragment is not sent to the server; do not pretend server robots rules can inspect it. Canonical public content and server authorization protect the distinct concerns.
4. Verify HTML, canonical/robots/sitemap behavior, mobile layout, accessibility and actual CTA navigation on production. Reuse the existing SEO checks where available. Structured data must match visible content. Do not claim search rankings, AI citations, universal corporate-network support or measured capacity without evidence. Use Search Console if existing access permits to submit/inspect the public entry; record a missing ownership/access dependency instead of inventing indexing success.
5. Implement a privacy-safe conversion funnel using the existing analytics and backend telemetry. Current analytics deliberately skips `/try`; do not remove that protection and send raw URLs. Record public CTA source with a bounded location value, successful admission/create/join, entry/voice success, save intent, completed authenticated claim and room conversion. Derive trusted successes from server operations and make retries idempotent. Never send raw invite fragments, cookies, JWTs, email/name, room/workspace IDs, IPs, SDP or audio to analytics or high-cardinality metric labels. Keep untrusted browser diagnostics distinct from server outcomes.
6. Verify receipt in the actual dashboard, not only event emission in developer tools. Show entry/join success, time to enter, voice failure categories, save conversion and capacity/abuse rejection rates. Compare with the existing signup-first route. Report small samples honestly and keep identical security enforcement across variants.
7. Add the group activation/return measurement required by the search initiative. A useful initial definition is a saved workspace with at least two distinct signed-in members overlapping for five minutes, followed by a qualifying group return on a later day within seven days of activation. Record this definition/version before collecting data; it is a product metric definition, not an observed result. Compute it server-side from account-workspace presence with bounded retention and access, then expose aggregates. Do not extend anonymous guest retention or send membership identifiers to marketing analytics. Verify the query with deterministic fixtures. Complete seven-day rates become available only after cohorts mature; missing mature cohorts do not prevent launch.

Acceptance: public entry and links are deployed and crawlable, analytics receipts and server conversion totals reconcile, group-return measurement is implemented and fixture-verified, and pending real-world cohort results are labeled by date. Community posts, outreach, purchases and recurring monitoring are separate actions and are not authorized merely by this handoff.

## Verification commands and evidence

Use supported installed runtimes and the exact release checkout. Typical targeted checks are below; inspect the current package scripts before execution.

Frontend, from `Workdash`:

```sh
npx vitest run src/features/guest/proxy.test.ts src/common/utils/safeAuthReturn.test.ts src/common/components/UiControls/AudioAreaIndicator.test.tsx src/game/audioZoneManager/audioZoneManager.test.ts src/communication/audioChat/audioChat.test.ts
npx tsc --noEmit
npm run build
```

Backend, from `Workdash-SFU`:

```sh
npm run build
npx vitest run src/guest src/services/mediasoup.service.test.ts src/services/audioZone.service.test.ts src/services/workspace.service.test.ts src/services/workspace.gateway.test.ts
```

The database suite is skipped unless `GUEST_TEST_DATABASE_URL` is set. Run it separately against a newly created disposable loopback database named `guesttest`, apply migrations there, and run `src/guest/store.integration.test.ts`. It resets the ledger. Do not point it at production or the user's current local fixture. Record skipped tests explicitly.

Local development previously used frontend 8085, real guest fixture 4100, PostgreSQL 5548 and Redis 6388. Inspect listeners/processes before reusing those ports. The native integration script requires `GUEST_REAL_TEST_URL=http://127.0.0.1:4100` and its documented local fixture keys. It validates Socket.IO/native allocation and zones, not audible RTP. Tests against production must use a separate restricted test procedure with legitimate admission and account permissions.

Store dated, sanitized release evidence under `Workdash/feature-plans/guest-room/evidence/YYYY-MM-DD/`. Include:

- Release manifest with source SHAs, immutable image references/digests, relevant safe configuration and rollback references.
- Security/journey matrix with expected and actual outcomes, device/network coverage and browser screenshots where useful.
- Real two-browser audio/relay evidence showing selected path and received audio without capturing conversation content.
- Monitoring queries, alert firing/recovery receipts with private recipient details redacted, and log privacy checks.
- Capacity/coexistence report and the written public-cap decision.
- Public-route, SEO and analytics verification, metric definitions and cohort availability dates.

## Execution checklist

- [x] Create a clean, reviewed guest release without reverting newer landing or unrelated work.
- [x] Fix persistent deployment configuration, runtime compatibility, immutable images and the shared memory budget.
- [x] Deploy normal backend/frontend and admit only approved testers with server protections intact.
- [x] Deploy current guest monitoring, voice-failure visibility and verified external alerts.
- [x] Pass independent decoded-audio, sign-in/save, responsive viewport, server security and account-regression checks; record the user-reported physical test separately.
- [ ] Record the detailed physical phone/desktop and restrictive-network matrix if those environments are part of the supported claim. The user reported success, but supplied no device/network details.
- [x] Pass the eight-guest/two-account synthetic capacity tier and record the initial eight-guest public ceiling with its scope and limitations.
- [x] Open intended TURN/client access and public admission, remove the redirect, and observe the public connection/reconnect/empty-room lifecycle canaries with their stated scope.
- [x] Publish real trial acquisition links and searchable HTML; verify conversion/group metrics, live world-entry receipts and Search Console submission.
- [x] Confirm ordinary backend and frontend deployments retain the public flags, challenge enforcement, eight-guest ceiling and private ingress boundaries.
- [x] Update the feature README, release manifest and this checklist with evidence and dated follow-ups.
- [ ] Review the first 24 hours after the corrected public release, no earlier than November 3, 00:36 Asia/Manila; keep caps unchanged until reviewed.
- [ ] Review seven-day return once activated cohorts mature. This is measurement follow-up, not missing instrumentation.

Only missing credentials/access, a notification destination, unavailable real-device/network testing or a separately required purchase should need external input. Explain the exact dependency and keep progressing with independent work. Do not call the feature complete while a failed core journey, security boundary, resource test or alert-delivery requirement remains unresolved.
