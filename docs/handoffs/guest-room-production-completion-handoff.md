# Guest rooms production completion handoff

Date: November 1, 2026, Asia/Manila.

Finish the real WorkDash guest trial through production deployment, monitoring, end-to-end verification, measured capacity, public launch and acquisition measurement. The trial already uses the real Phaser game and shared SFU locally. The live TURN firewall is fixed. The next work is a scoped release and its production validation.

This is the current execution handoff. It supersedes the original [guest room trial handoff](guest-room-trial-handoff.md) wherever that document describes a separate scene, HTTP voice service, unavailable voice or an earlier rollout. Preserve the original product and server security constraints described below. Do not rebuild the retired prototype.

## Required outcome

A visitor can create an approved character without an account, create an invite-only temporary room, invite friends, walk through the real world and talk through the existing audio-zone system. Each participant can sign in to save their character. Only the host can save the room as a normal account workspace.

The room has an immutable 20-minute deadline starting at successful creation, a three-minute empty timeout, and a separate 45-second presence grace for crashed connections. Maximum room occupancy is eight including the host. Standing still or muting does not make someone absent. Saving does not extend anonymous access or make anonymous visitors permanent workspace members. Drafts remain claimable for 24 hours after the room deadline. Existing characters require explicit overwrite consent.

Account-only tools remain restricted, including unrestricted chat, files, camera, screen sharing, music/integrations and the soccer arena. Voice must work through the existing microphone controls. Keep outdoor audio and the first-use audio-area guide. The first visit must be the actual platform, with truthful controls and errors.

Completion means all six phases below have their acceptance evidence. A deployment alone is insufficient. Fix failures and rerun the affected checks before advancing; do not silently omit voice, monitoring or signup to meet a release date.

## Execution update — November 1, 2026

The real release is deployed in the normal application containers, with restricted admission enabled for the operator network. Public admission and public discovery remain off. The backend has a finite 2 GiB memory limit and explicit restricted caps of eight guests across two rooms. These are provisional test caps, not a measured public ceiling.

Release branches are in `worktrees/guest-release-frontend` and `worktrees/guest-release-backend`, both named `feat/guest-production-release`. Draft PRs: [frontend #43](https://github.com/ainderew/Workdash/pull/43), [backend #4](https://github.com/ainderew/Workdash-SFU/pull/4). The original dirty checkouts remain untouched.

Evidence: [restricted production manifest](../../feature-plans/guest-room/evidence/2026-11-01/restricted-production-release.json), [local browser audio](../../feature-plans/guest-room/evidence/2026-11-01/browser-audio-local.json), [server-rendered trial entry](../../feature-plans/guest-room/evidence/2026-11-01/trial-entry-ssr.json). Browser audio evidence is local and uses the real shared SFU; it is not production TURN or human audibility evidence.

Prometheus scrapes the authenticated real runtime, host and TURN; Loki receives current guest events; Grafana has the browser voice panels. Alert rules and missing-target/recovery fixtures pass. An external alert receiver and its firing/recovery receipt are still pending an approved destination.

The operator entered the real production Phaser room through production Turnstile with the mic off. Public `/try` redirects, public admission remains off, and spoofed forwarding headers cannot enable it. Proxy/admin keys cannot read metrics. Invite rotation and the fixed 20-minute hard expiry were verified. After expiry, guest rooms, participants, sockets, transports, producers and consumers all returned to zero while account transports remained. The stale re-entry button found on expiry was fixed and regression-tested; see [hard-expiry evidence](../../feature-plans/guest-room/evidence/2026-11-01/production-hard-expiry.json). A second browser retained an old revoked cookie; the server rejected admission. The new UI gives that case a specific error and does not clear the revocation.

The acquisition code adds server-rendered explanations/FAQs, canonical metadata and the existing inline character creator. `NEXT_PUBLIC_GUEST_TRIAL_PUBLIC` must remain false until launch gates pass. Setting it true at build time promotes the homepage/footer/discovery CTAs and sitemap entry; live `?play=1` remains noindex. Client intent telemetry has strict fixed fields and one-hour session/action deduplication; successful admissions and saves come from the transactional ledger.

Next required work:

1. Approve a test account and complete Google/magic-link save, overwrite, host conversion and normal account regression checks.
2. Complete real two-device voice, mobile/network switching and forced-relay browser checks. A relay echo probe or decoded sample alone does not prove audible output.
3. Configure an approved alert destination and verify firing plus recovery delivery.
4. Run the Phase 4 sustained guest/account coexistence tiers, record the limiting resource and select measured public limits.
5. Implement and fixture-test server-side saved-group activation and seven-day return aggregates. Current funnel actions are not retention metrics.
6. Complete public canary gates before opening TURN client ingress/admission/discovery, observe a full lifecycle and review the following 24 hours.

The sections below retain the full procedure and original baseline. Treat the dated execution evidence as the newer state.

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
7. Configure an actual alert destination and responder. No external destination exists yet. Discover an existing suitable destination first; otherwise obtain the recipient/channel and authorization for test notifications from the user. Prepare all other monitoring work while that input is pending. Verify both firing and resolved messages arrive; an Alertmanager UI status alone does not prove delivery.

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
- [ ] Deploy current guest monitoring, voice-failure visibility and verified external alerts.
- [ ] Pass real voice, sign-in/save, mobile, lifecycle, abuse and account-regression checks.
- [ ] Complete capacity/coexistence testing and set the measured public ceiling.
- [ ] Open intended TURN/client access and public admission, remove the redirect, and observe the canary.
- [ ] Publish real trial acquisition links and searchable HTML; verify conversion/group metrics.
- [ ] Confirm a subsequent ordinary deployment retains the feature settings.
- [ ] Update the feature README, release manifest and this checklist with evidence and any dated follow-up.

Only missing credentials/access, a notification destination, unavailable real-device/network testing or a separately required purchase should need external input. Explain the exact dependency and keep progressing with independent work. Do not call the feature complete while a failed core journey, security boundary, resource test or alert-delivery requirement remains unresolved.
