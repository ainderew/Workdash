> RETIRED PROTOTYPE DOCUMENT. The separate HTTP media service and worker described below were removed. Read [the real Phaser/SFU integration](README.md) for current behavior and rollout requirements. Old load results do not establish the shared SFU capacity.

> October 31 cleanup: the separate guest prototype is retired. `/try` redirects home; its three containers are stopped. Host/TURN monitoring remains active. See the cleanup audit in `Workdash/feature-plans/guest-room/README.md`. Earlier deployment and capacity claims below are historical.

# Guest voice implementation status

October 30, 2026. Implemented locally; no production deployment or public admission change.

## Delivered

- Guest voice through a dedicated mediasoup worker and an audio-only router per room. The account media gateway remains separate. The browser uses the existing HttpOnly-cookie proxy for signaling and WebRTC for media.
- Explicit listen-only entry, microphone off initially, microphone consent on demand, mute/unmute, leave voice, autoplay recovery and local participant mute. Hiding a guest also mutes their audio locally. Microphone permission denial preserves listening. Camera, screen and data channels are rejected by the guest protocol.
- Authoritative membership on each command, same-room producer checks, transport and consumer ownership, strict bounded command envelopes, one send/receive transport per principal, one producer and seven consumers maximum. Repeated transport and producer creation is idempotent. A second tab cannot allocate another connection for an existing principal.
- Single service owner through a renewable Redis lease and a database owner fence. Serialized guest/media lifecycle operations prevent allocation races with kick and closure. Owner loss, worker death and stale authorization close media and stop the service for supervisor restart. A replacement owner invalidates the old owner's database writes.
- Server reconciliation every 2.5 seconds, local deadline checks every 250 ms, authorization freshness limited to eight seconds and voice heartbeat leases of 15 seconds. Kick and close acknowledge after local teardown. Room presence still has its separate 45-second lease. Normal expiry and the 20-minute absolute deadline remain enforced.
- Full-room media reservations. Default 168 consumers permit three eight-person rooms, at most 24 guests. Each room reserves 56 consumers even while quiet. Runtime stream limits, incoming/outgoing transport bitrate settings, and measured incoming-bitrate abuse closure are enforced. Bitrate feedback alone is not treated as protection against malicious senders. Network-level UDP flood protection remains a deployment responsibility.
- Automatic admission pause after three high-resource samples and recovery after six low-resource samples. Current candidates are worker CPU at 70% or guest egress at 70% of its configured budget; recovery requires both below 55%. These thresholds need staging validation. Existing authorized voice is retained during a pressure pause.
- Distinct room-full, global-guest-capacity, room-capacity and voice-capacity rejection reasons. A private `/metrics` endpoint requires a distinct read-only metrics secret in production; ordinary proxy credentials cannot read it. No public Next route forwards metrics/admin requests.
- Occupancy, reservations, stream counts, worker CPU, worker peak RSS, Node RSS, sampled traffic, sample freshness, admission state, request latency histograms and rejection counters. Bounded client reports add packet loss, jitter and RTT telemetry. Client reports never change authorization or admission capacity.
- Structured operational events with bounded repeated logs, request IDs on errors, resource context on capacity transitions and policy-change events. No media, cookies, invite tokens, SDP or raw IPs are logged. Error counters retain every rejection even when logs are suppressed.
- Deployable Prometheus scrape example, alert rules and Grafana dashboard under `Workdash-SFU/deploy/observability`. Alerts cover unavailable metrics/voice, pauses, reservations, rejections, CPU, cleanup failures, slow signaling and reported audio loss. No external notification destination has been configured or messaged.

## Verification

- Backend guest suite: 36 tests, including a real mediasoup worker and eight disposable PostgreSQL integration cases. Coverage includes resource ownership, cross-room denial, duplicate connections, caps, expiry, stale authorization, owner fencing, rollback and conversion.
- Frontend guest suite: 13 tests including proxy/redirect boundaries, listen-only entry, permission denial and cleanup when room access ends.
- Both production builds, TypeScript checks and targeted lint passed during implementation. Final verification results are reported with the delivery.
- Two independent guest principals sent generated tones through real browser WebRTC connections to the guest worker. Both receivers decoded nonzero audio with zero packet loss during the short test. A host kick revoked the peer. See `evidence/voice-two-peer.json`. This test uses no microphone permission and is a functional check, not a sustained load test.
- Desktop and 390px mobile interface inspection verified listen-only entry and leaving voice. Evidence: `voice-desktop.png` and `voice-mobile.png`.
- Prometheus `promtool` validated all 13 alert rules and four recording rules and the metrics format. A live Redis shutdown test closed the allocated guest transport, stopped the media worker and exited the service with status 1 for supervisor recovery.
- `Workdash-SFU/scripts/guest-media-smoke.mjs` verifies signaling, bounded quality reporting, metrics credential isolation, immediate stop teardown and no resurrection after clearing stop, against disposable loopback fixtures.

To repeat the browser media check, start a disposable guest backend on loopback with the documented fixture secrets, then from `Workdash` run `GUEST_PROXY_SECRET=guest-test-proxy-secret-32-characters node scripts/guest-voice-browser-check.mjs`. Open `http://127.0.0.1:8091/?peers=24&seconds=120` and run the test. Restart the fixture for fresh sessions before each run. The fixture supports 2, 8, 16 or 24 server-side test sessions and never ships as an application route. The HTTP media smoke script accepts only loopback and the disposable fixture keys. Do not use either against real application data.

## Completed follow-up

- The shared-network request quota is 3,600/minute so 24 users behind one NAT can sustain normal room sync and voice polling. Per-session, admission and global caps still apply.

- Container memory admission uses actual cgroup usage and limits. Three samples at 75% pause admission; six below 60% recover. Unknown or stale container limits block new production admission. CPU throttling and host CPU/memory panels are included.
- Authorized, expiring TURN credentials and browser ICE configuration support restrictive-network fallback. The dedicated coturn deployment has an exact SFU peer allowlist, allocation and bandwidth quotas, no TCP relay destinations, and a TLS certificate mount. Public enabled voice requires TURN configuration.
- Server DTLS attempts, successes/failures and connected guest seconds are exported. Client readiness, first received audio and failure outcomes are bounded and deduplicated per connection. Client timings remain untrusted and first audio has up to ten seconds of sample delay.
- Challenge-verified capacity rejections are deduplicated per session/hour without logging session identifiers. Recording rules retain operational history. These are session-hours, not unique people, exact billing or lost revenue.
- Structured logs ship asynchronously to private Loki through a bounded queue, with stdout fallback and delivery/drop metrics. Logs retain 14 days; Prometheus retains 30 days or 3 GB. All container stdout rotates. No audio, cookie, invite or SDP enters the guest application logs.
- The complete Linux monitoring Compose deployment provisions Prometheus, Grafana, Loki, Alertmanager and node-exporter. Metrics access uses a dedicated read-only secret which cannot access admin controls. Grafana and all monitoring ports bind to loopback. External alert delivery awaits a chosen destination; dashboard alerts are available without sending messages.

## Additional verification

- Three full rooms, 24 guest principals, 48 transports and 168 decoded synthetic audio streams passed for 120 seconds. Every stream received audio with zero reported packet loss. All 24 server DTLS connections succeeded. Kick revoked access, and all media resources returned to zero after teardown. Peak sampled worker CPU was about 11.1% of a core and egress about 8.54 Mbps on this developer machine. The egress pressure guard paused admission and recovered after teardown. See `evidence/voice-24-peer.json` and `voice-24-peer-server.json`.
- A forced TURN-over-TCP two-guest test decoded audio both ways with zero packet loss and enforced kick. See `evidence/voice-turn-relay.json`. This local fixture did not use TLS; public certificate and network validation remain deployment checks.
- Real Loki push and query succeeded. Real Prometheus scraping returned `up=1`. The Grafana dashboard provisioned successfully and both Prometheus and Loki datasource health checks passed. The metrics key read metrics but received 403 for admin; the admin key received 403 for metrics when the independent reader key was configured.
- Prometheus validates 13 alert rules and four recording rules. A rule test verifies memory alert firing and recovery. Loki and Alertmanager configurations validate with the pinned images. External notification delivery has not been tested because no destination is configured.

- The dedicated Node 24 image built successfully. It started in production mode as UID 1000 with one CPU, a 512 MiB cgroup limit, read-only filesystem and dropped capabilities. The media worker became ready and memory-limit detection returned the exact configured value. Admission remained disabled. See `evidence/voice-container.json`.

## Deploy and validate the environment

The implementation and deployment files are local. No production migration, container deployment or admission flag change has been made. Read-only inspection found a shared six-core host with roughly 12 GB RAM running several applications, without an existing Prometheus/Grafana stack. A local test does not establish how much spare production capacity those apps leave.

Use `Workdash-SFU/deploy/observability/README.md` and `deploy/turn/README.md` for exact setup, security boundaries and rollback. The guest container has a one-core / 512 MiB candidate budget. Monitoring adds its own bounded resources. Configure independent secrets, TURN hostname/certificate, announced media IP, restricted firewall paths, Turnstile and the notification destination. Keep admission off while checking them.

Before public launch, validate the real OAuth/Turnstile flows, public TLS/relay reachability and ingress header rules. Run the same full-room test in an isolated production-like allocation alongside normal calls and verify notification delivery. Only then record the largest passing capacity step and set the capacity-reviewed flag. The admin endpoint deliberately keeps its verified ceiling null until there is deployment evidence. The configured 24-guest limit is a tested local workload, not a certified production ceiling.

## Production rollout, October 31, 2026

The dedicated guest worker, its private Redis, and the private Grafana/Prometheus/Loki/Alertmanager/node-exporter stack are deployed. The additive guest migration is applied. Public guest admission remains disabled. The current frontend and account backend were not redeployed.

Live checks confirmed the voice worker is ready, the 512 MiB cgroup limit is known, independent admin/metrics access is enforced, Prometheus scrapes both guest and host, and operational events reach Loki. The configured ceiling remains provisional at 24 guests in three eight-seat rooms; no production voice capacity has been certified.

Access Grafana through `ssh -N -L 13030:127.0.0.1:3030 ssh_bb`, then open `http://127.0.0.1:13030/d/workdash-guest-voice/workdash-guest-voice-capacity`. Username is `admin`; the generated password is in the private local file `/Users/drew/.codex/private/workdash-grafana-password`. Do not copy it into this repository.

The backend deployment runbook is `Workdash-SFU/deploy/ROLLOUT-20261031.md`. Evidence is in `evidence/production-dark-check.json` and `evidence/production-release-manifest.json`. Before public launch, complete TURN/TLS/firewall configuration, frontend proxy and Turnstile configuration, real-network voice and coexistence load testing, and external alert delivery.

## TURN follow-up, October 31, 2026

The live coturn relay passed UDP, TCP and TLS relay probes, certificate verification, forbidden-peer rejection, expired-credential rejection and allocation cleanup. Its private Prometheus target is up and the dashboard now includes relay metrics. Certificate renewal and an SFU-port firewall restriction are installed. TURN ingress is limited to the operator test IP and public guest access remains off. See `evidence/production-turn-probe.json` and `evidence/production-turn-expiry.json`.

Production Turnstile keys are still required. The frontend widget and server hostname/action verification are implemented; credentials have not been supplied. Actual browser audio over the production relay and capacity testing remain pending. TLS uses port 5349; support for networks restricted to port 443 requires a separate endpoint plan because the web server already owns 443.

## Turnstile configuration, October 31, 2026

Created the Cloudflare widget `WorkDash guest rooms` for `workdash.site`, in managed mode with pre-clearance disabled. The secret is installed in the private guest server env and the running service was verified to use it. Cloudflare Siteverify rejected an intentionally invalid token with `invalid-input-response`; this is a negative-path check, not a successful real visitor challenge.

The public site key is configured as the GitHub repository variable `NEXT_PUBLIC_GUEST_TURNSTILE_SITE_KEY` in `ainderew/Workdash`. Local Dockerfile and deployment workflow changes now pass that variable at build time. Those source changes still require inclusion in the frontend release. The frontend has not been redeployed. Public guest admission remains disabled.

The widget evidence screenshot is `evidence/production-turnstile-widget.png`. Credentials are held privately in `/Users/drew/.codex/private/workdash-turnstile.json` and `/root/workdash/guest/turnstile.json`, both mode 600, and must not be committed. A real browser challenge and full guest flow remain deployment checks. The dedicated-IP versus shared-routing decision for TURN on port 443 remains pending.

## Restricted frontend rollout, October 31, 2026

The guest frontend is now deployed at `https://workdash.site/try`, based on the current production frontend commit `30bb0a4af131480196902e11e0fc908dcbf5176e` plus guest changes. This supersedes the earlier pending-frontend notes. The existing landing page and canonical redirects remain intact. No guest promotion links were added to the homepage or sitemap during restricted testing.

Public admission remains off. The server admits only the operator test network, with real Turnstile verification, one room and four total guests. Ingress overwrites the trusted client-address header and applies request/connection/body limits. Outside-network configuration and commands remain disabled, including a forged client-address test. Guest media and TURN firewall rules admit only the same test network.

Real browser checks passed Turnstile admission, customization, invitation joining in a second browser, reactions, invitation rotation, host removal, revoked-session rejection and lease rejoin. The sign-in entry page opened. A Back-navigation defect was found because clearing the invite replaced Next.js history state with null; the guest page now uses the Next router for that transition. Microphones were left off pending explicit permission, so voice-control readiness is not evidence of transmitted or decoded production audio. Saving a character into an authenticated account remains unverified in production.

Grafana has separate public and restricted-test admission indicators. All three Prometheus targets and all 16 alert rules plus four recording rules are healthy. No active alerts were present after the restricted tests. Evidence is in `evidence/production-restricted-check.json`, `production-ingress-check.json`, `production-restricted-monitoring.json` and `production-guest-room.png`.

See `Workdash-SFU/deploy/ROLLOUT-20261031.md` for the candidate port, active Nginx file, rollback and required promotion into the ordinary automated frontend deployment path. Production capacity remains uncertified, external notifications remain unconfigured, and TURN on port 443 remains a separate decision.

The live empty-room check passed. The room expired after three minutes with no occupants, and all voice resources were zero. See `evidence/production-before-empty-expiry.json` and `production-after-empty-expiry.json`. The final frontend image with the navigation correction is `sha256:1893d2b27dc59fc0d3f05a404c49cabe68caa689b6541428c24699e1d27fe682`.

The corrected deployed build passed the real-browser sign-in/Back test and restored the same room, invitation and character without reloading. The empty-room expiry check also found an obsolete countdown on the ended-room screen. The UI now hides the countdown when the server reports the room ended; a regression test covers early expiry while the original deadline is still in the future. Server expiry and admission remain enforced.

Live frontend-proxy negative tests also passed: unauthenticated character claims return 401 SIGN_IN_REQUIRED, cross-origin requests return 403, and invalid challenges return 403 CHALLENGE_REQUIRED. See `evidence/production-proxy-security.json`.

The ended-room countdown correction is included in frontend image configuration `sha256:341294b0e5367c398215e39dd0280a1d68ca16959496be4ffa7fcab862e09c8e`, manifest `sha256:cdd0af8ca2eeb6da6d3d712da1264bf7ce49867db74b8f6151be11d0aa42b052`. This supersedes the preceding frontend image. The three guest recovery tests pass, including early server expiry.

Final browser verification confirmed the ended-room screen has no countdown, voice entry is disabled, and the character draft remains available. Both disposable rooms are closed or expired, with zero active guest or media resources. The trial tab is left at character selection. No microphone or account-character change was performed. Screenshot: `evidence/production-ended-room.png`.
