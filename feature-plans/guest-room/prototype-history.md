> Historical record of the retired image-based trial. Do not use this as a deployment guide. See [the current implementation](README.md) and [the follow-up audit](remnants-audit-20261031.md).


# Guest integration cleanup audit — October 31, 2026

The separate prototype is retired. Production `/try` temporarily redirects to the homepage. The real Phaser guest integration was not implemented at the time of this cleanup; see the current implementation above. Everything below the historical separator describes the withdrawn prototype, not the current deployment or an approved design.

## What was duplicated

| Area | Evidence | Disposition |
| --- | --- | --- |
| Room renderer and movement | `GuestTrial.tsx` placed DOM avatars over `world-map-preview.79895fef.webp` with percentage coordinates and HTTP sync. The real game already has `PhaserGame.tsx`, `game/scenes/BaseGameScene.ts`, multiplayer, tile collision, camera and character animation. | Removed the mock scene, its CSS, Avatar wrapper and component tests. Reuse the actual Phaser scene and multiplayer path. Keep shared world artwork, which other parts of the product use. |
| Character selection | The prototype had its own four-category selector despite existing `CharacterCreationScreen`, `CharacterCustomizationMenu`, `CharacterPreview`, compositor and animation manager. | Removed the parallel selector with the mock scene. Adapt the existing creation UI to guest identity. |
| Voice client | `GuestVoice.tsx` constructed its own mediasoup Device/transports and polled producer state every two seconds. Existing `MediaTransportService`, `AudioChat` and call-signaling code already manage these flows. | Removed the duplicate voice client and its tests. Reuse existing audio controls and transport lifecycle. |
| Voice/signaling server | `src/guest/media.ts` created another mediasoup worker and custom HTTP operations while `services/mediasoup.service.ts` and `handlers/mediasoup.handlers.ts` implement the normal SFU path. `src/guest/server.ts` combined this with a separate polling protocol. | Archived and removed the duplicate media/server entrypoints, tests, Dockerfile, Compose file, launch commands and prototype-only load fixtures. Port reusable admission checks into the existing server, rather than recreating this protocol. |
| Deployment | A candidate frontend on 8082, guest server on 4010, dedicated Redis on 6381 and guest RTC ports 11000–11100 supported only the prototype. | Restored normal frontend routing to 8080. Stopped these three containers and disabled their restart policies. Removed only the operator guest-RTC ingress rules and unused guest Nginx rate-limit zones. |
| Capacity evidence | The old guest dashboard and synthetic load tests measured the separate service. | Archived those configurations/fixtures and removed obsolete guest scrapes, 11 guest-service alerts and guest recording rules. Do not use the old 24-peer local result as capacity certification for the real SFU. |

## Retained because it is useful

- **TURN/TLS:** a network relay, independent of the UI. Keep the relay, certificates, renewal hook, peer restrictions, credentials and probes. It is currently operator-only and scoped to the retired media port range. It is **not already integrated with account voice**; the existing client/server transport configuration must use it, and peer restrictions must be deliberately updated for the existing SFU ports. No additional IP was purchased and no shared 443 routing was changed.
- **Turnstile:** retain the Cloudflare widget, private secret, public build argument and server verification of success, hostname and action. These apply to real guest admission.
- **Guest security/lifecycle code:** retain `security.ts`, `model.ts`, `store.ts`, `turn.ts`, resource checks, telemetry and their tests for extracting expiry, invite rotation, revocation, claim checks and quotas. The old position/reaction protocol and singleton JSON ledger are not automatically the design for the real game.
- **Frontend safeguards:** retain the same-origin BFF/Origin checks, HttpOnly cookie design, safe sign-in return helper, private-route analytics exclusions and security headers. These are reusable boundaries; their old backend endpoint is no longer running.
- **Observability infrastructure:** keep Grafana, Prometheus, Loki, Alertmanager and node-exporter. Active monitoring now covers host and TURN only, with five alerts. Historical prototype logs remain available. The dashboard explicitly states that real game/SFU capacity is not instrumented yet. External alert delivery is still unconfigured.
- **Data and recovery:** preserve the applied guest migration/table, three drafts, Redis volume, secrets and image archives. No database rollback or data purge was performed. These are recovery assets, not active duplicate services.

A separate worker or Redis instance is not inherently wasteful: isolating untrusted traffic can be sensible even when sharing the real application code. The mistake was duplicating the experience and media implementation before evaluating reuse. Worker/Redis placement for the real feature must follow measured load and failure isolation needs, not a blanket rule to share everything.

## Recovery and scope

Before deletion, every source file was archived and hash-verified. Seventeen prototype-only source/deployment files were removed, plus two obsolete monitoring rule/test files. Archives are private:

- `/Users/drew/.codex/private/workdash-guest-prototype-retired-20261031.tar.gz`
- `/Users/drew/.codex/private/workdash-guest-monitoring-retired-20261031.tar.gz`
- Server backups: `/root/workdash/guest/retirement-20261031`

Stopped containers/images remain recoverable and cannot auto-restart. Source evidence and prior runbooks are retained as history. Unrelated dirty files, account backend, existing game code, database records, and other hosted applications were not removed. Homepage/sitemap promotion of the prototype was reverted locally.

## Required real integration

Use the real Phaser world, character creation and existing voice/call path. Introduce an explicit server-verified guest principal bound to a temporary workspace/room and expiry. Existing `socketAuthMiddleware` assumes account JWT fields, and workspace selection checks membership; do not bypass either check or mint fake account identities. Authorize guest events by allowlist, reject account-only actions, enforce room scope and revocation on movement/media, and apply admission/resource limits before allocating work. Add metrics to this real path, separated by guest/account traffic, and remeasure coexistence capacity. Signup should persist the character through an authenticated claim without extending the trial.

## Verification

The retained security/model/resource tests pass (22), as do BFF/sign-in-return tests (9). The backend builds after removal. The default frontend type check encounters existing missing `vi` globals in `DeskMode/modals/__tests__/media-test-utils.ts`, outside this cleanup; no missing prototype imports were reported. Production homepage/help/about/auth-provider checks pass; `/try` redirects without caching. Nginx and Prometheus configurations validate.

---

## Historical prototype documentation — do not deploy

# Guest trial implementation and operator runbook

Implemented October 30, 2026. Public admission remains default-off. The current code supports movement, reactions and guest room voice. Local two-peer WebRTC verification decoded synthetic audio in both directions. Production voice capacity is not yet verified. See [the guest voice and capacity implementation plan](voice-capacity-plan.md). Video, screensharing, files, music, free text and normal account APIs remain outside this guest scope. No deployment has been performed.

## Architecture and enforced boundaries

The `/try` page renders searchable HTML and uses the existing character assets and lounge map raster. Solo exploration allocates no guest room. Invite tokens live in URL fragments, so they are not sent in the request path or referrer. The page disables analytics on direct entry; the global tracker also excludes hashes/search when already loaded during SPA navigation. No name, email, invite or credential is included in the guest counters.

The browser sends commands only to same-origin `/api/guest`. The Next proxy enforces Origin, JSON content type and a custom header. It stores a random 256-bit principal token in an HttpOnly, SameSite=Lax cookie, additionally Secure and __Host-prefixed in production. The token is never returned to JavaScript. Only the authenticated NextAuth session supplies the account bearer token for claims. The backend independently verifies that token and the account record.

The isolated backend listens on loopback by default and requires a separate proxy secret. It does not mount the existing account Socket.IO or media gateway. A dedicated mediasoup worker supplies audio-only routers for guest rooms. Tokens are opaque and cannot authenticate to those account APIs. The guest process exposes only validated guest commands, config, and an independently authenticated operator endpoint. Presence and movement use bounded one-second HTTP polling. Voice uses bounded HTTP signaling and direct encrypted WebRTC media, with a separate port range. Duplicate tabs share the same principal and rate budget.

Guest rooms, sessions, bounded reports and aggregate counters live in a single bounded JSONB ledger. `SELECT FOR UPDATE` serializes admission, lifecycle and claims across process instances. Workspace/character creation happens in the same PostgreSQL transaction as the claim. A separate small database pool, statement/lock timeouts, global ingress limits and in-flight request cap limit contention. This design is intended for a small trial, not unbounded growth; partition the ledger and revalidate quotas before raising the hard configuration ceilings.

Every operation reads server time and current lifecycle. A 2.5-second sweeper reconciles expired rooms and 24-hour drafts even without visitors. The code derives invite tokens from a separate signing key and stores only their hashes in the ledger. Rotating a link revokes the old hash. Room conversion removes anonymous host-management permissions and the temporary invite, preserves existing guests' original deadlines, and grants only the authenticated host membership in the saved workspace.

## Initial policy

| Setting | Current value | Status |
| --- | --- | --- |
| Shared guest admission | Disabled by default | Production additionally requires `GUEST_CAPACITY_REVIEWED=true` and Turnstile configuration |
| Room life | 20 minutes | Starts at successful database creation; never extended by refresh, retry or signup |
| Empty cleanup | Three minutes after all presence leases end | Explicit leave updates the lease immediately |
| Presence lease | 45 seconds | Handles crashed tabs; no movement required |
| Room capacity | Eight guests | Enforced atomically |
| Total active guests | 24 | Development ceiling, not a production capacity claim |
| Total active rooms | Three with the default voice budget | The configured room ceiling of six is reduced to reserve 56 consumers per eight-person room within the 168-consumer budget; conversion does not release a live trial slot early |
| Retained drafts | 500 | Admission fails closed at the cap |
| Server draft retention | 24 hours after trial deadline | Includes validated character appearance and a bounded room-claim record |
| Browser appearance | Up to 24 hours from the latest visit/customization | Non-secret appearance only; clearing browser data removes it |
| Guest session cookie | 25 hours | Covers a full trial and its claim window; server expiry still controls access |
| Guest-saved workspaces | At most three owned workspaces | Conservative additional guest conversion limit; recheck billing policy before launch |
| Reports | Last 200, at most 24 hours | Operator-only view, no free text |

Shared Redis counters currently enforce: 180 commands/second globally, 3,600/minute per trusted network, 180/minute per guest session, five creates/hour per network, 30 join attempts/hour per network, 60 admission attempts/minute globally, and ten claim/report/invite-rotation commands/minute per guest. Config reads have a separate global cap. Rejected attempts also consume quota. These are starting abuse limits and need shared-network usability review. IP is a signal, not personal identity.

## Setup and deployment order

1. Build and test both repositories. Apply the new PostgreSQL migration through the normal migration deployment workflow after reviewing the target database. Do not use `db push` on production. The migration creates and seeds `GuestTrialState`; this seed is required.
2. Generate independent proxy, invite, admin, metrics and TURN secrets and keep them in your deployment secret store. Keep them distinct from the normal account JWT secret. Configure the backend from `Workdash-SFU/src/guest/.env.example` and Next from `frontend.env.example` here. Never put private keys into NEXT_PUBLIC variables.
3. Start the isolated guest process with `npm run guest:start` after the backend build. The optional `Workdash-SFU/deploy/guest.compose.yml` adds CPU, memory, PID and filesystem limits. It binds only to loopback on the host. If Next is containerized, use a private container network instead of a publicly published port.
4. Prefer a separate Redis instance for guest quotas and operational controls. Set a memory budget with `noeviction`; quota failures must reject admission. PostgreSQL is shared only through a small guest pool, so monitor contention with ordinary account workloads.
5. Merge the ingress example from `Workdash-SFU/deploy/guest.nginx.conf.example` into the existing configuration. Verify trusted CDN address handling, direct-origin blocking, the 16 KiB signaling body limit and TLS. Ordinary non-media commands still have a 4 KiB backend limit. Expose only the dedicated WebRTC UDP/TCP range, with firewall and network flood controls. Only then set `GUEST_TRUSTED_IP_HEADER`. If it is unset, the socket peer address is used, which is safe but may group all users behind a proxy under one quota.
6. Configure a Turnstile widget for the actual hostname and action `guest_admission`. Server validation checks both and provider success. The local bypass is honored only with an explicit development or test NODE_ENV. Missing NODE_ENV receives production startup checks. Build Next with the public site key. Test the real provider before opening admission.
7. Deploy default-off. Public `/try` stays useful through solo exploration. Run the production-like staging checks below before setting the capacity-reviewed flag and enabling admission for a bounded audience.

Do not change normal workspace permissions to allow guests. Do not expose the isolated service or operator endpoint publicly. Do not share an unlimited Redis instance with account queues and assume room caps alone prevent overload.

## Operator controls

Guest voice must ship with the metrics, structured events, capacity alerts and historical demand views defined in [the required observability and scaling evidence](voice-capacity-plan.md#required-observability-and-scaling-evidence). The implementation now includes private Prometheus metrics, a Grafana dashboard JSON and alert rules. Deployment wiring and the remaining observability work are listed in `voice-implementation-status.md`.

The internal `/admin` endpoint requires `X-Guest-Proxy` containing **GUEST_ADMIN_SECRET**, not the proxy secret. GET returns aggregate counts, bounded reports and process diagnostics. Never expose it through Next or a public route. Inspect reports there using an authorized internal operator workflow. Initial incident owner: the deploying operator, Andrew until another owner is assigned.

POST accepts `{"control":"pause-create","enabled":true}`, `{"control":"pause-join","enabled":true}`, or `{"control":"stop","enabled":true}`. These shared Redis controls take effect across processes. `stop` closes all live trial rooms and invalidates their invites at the next command or sweep. Character claims can still complete during the retention window. Setting it back to false does not revive closed rooms. Use creation/join pauses to drain without terminating existing trials.

For total isolation, stop the guest service and disable the Next upstream; ordinary account services do not depend on it. If Redis or PostgreSQL is unavailable, guest commands fail closed. Monitor HTTP 429/503, report count, active/draft counts, p95 command latency, process event-loop delay, CPU/RSS and database contention. Escalate on authorization failures, leaked resources or impact to normal rooms, not only on CPU saturation.

During an incident, retain only necessary server status, aggregate counters and bounded report IDs under restricted access. Never dump the guest ledger into public logs. Session hashes, internal room IDs and account claim mappings are security data. Expired drafts/reports are purged; aggregate counters contain no identifiers and remain cumulative.

## Tests and evidence

Backend unit tests cover schema rejection, capacity, idempotency, host boundaries, cross-room actions, revocation, empty-room cleanup, reconnects, immutable expiry, kill policy, bounded config, provider validation and fail-closed quotas. The PostgreSQL integration suite covers concurrent creates/joins across store instances, character overwrite consent, host-only conversion, duplicate claims, transaction rollback and expired-draft claims.

Run backend guest tests with `npm test -- src/guest`. For integration tests, create a disposable loopback database named `guesttest`, prepare the full schema, and set `GUEST_TEST_DATABASE_URL`. Never point this variable at an existing application database; the test resets the guest ledger. The suite explicitly refuses remote/non-guesttest databases. Run frontend tests with `npm test -- src/features/guest src/common/utils/safeAuthReturn.test.ts`.

`Workdash-SFU/scripts/guest-smoke.mjs` is a bounded HTTP security/load probe that refuses non-loopback URLs. Start a separate test guest service with NODE_ENV=development and challenge bypass enabled and a disposable Redis instance. Set `GUEST_SMOKE_URL`, `GUEST_PROXY_SECRET` and optionally `GUEST_ADMIN_SECRET`. It probes racing joins, invalid proxy credentials, unsigned claims, cross-room injection, unavailable media, invite rotation, kicks and closure, and records a local latency report. It is not a production capacity test.

Initial local evidence: 23 backend tests, including seven real PostgreSQL integration cases, and 11 frontend boundary, redirect and failure-recovery tests passed. An eight-person HTTP run completed 160 sync requests with zero failures and approximately 63 ms p95 on this developer machine. Twelve racing friend joins admitted exactly seven guests beside the host. The local browser showed the character picker and active room at desktop and 390px mobile widths. A second bounded run exercised 24 guests across three rooms for 600 updates: zero failures, approximately 98 ms p95, overflow rejected with ROOM_FULL, and active counts returned to zero after closure. Kill-switch testing confirmed rooms do not revive after clearing the stop flag. With Redis stopped, admission returned 503 in 18 ms. Both production builds and targeted lint/type checks passed. See `evidence/http-smoke.json`, `evidence/local-capacity.json`, and desktop/mobile screenshots. These results do not establish capacity on the production host.

## Public launch checks still required

- Production-like staging at the configured global ceiling, including simultaneous room creation, reconnect storms, expiry bursts, multi-process restart and quota-storage failures. Measure normal account rooms concurrently. Suggested acceptance gates: no unauthorized access, no leaked live resources after leases/cleanup, less than 1% unexpected errors, p95 guest command latency under 250 ms, p95 warm room entry under two seconds, no material regression to normal rooms, and guest service resource use within its configured budget. Report cold asset loading separately.
- Real Google and magic-link flows on the deployed origins, including cancel/retry, expiry during signup, existing-account overwrite choice and provider failure. Current tests verify the claim transaction and proxy identity boundary, not the external OAuth providers.
- Real Turnstile hostname/action enforcement, ingress header overwriting and direct-origin protection. Validate restrictive corporate/mobile network behavior and accessibility with supported browsers.
- Guest voice is implemented and locally verified. Before public launch, validate the announced address, firewall, restrictive-network/TURN behavior, the production container budget, sustained real-audio load, alert delivery and normal-room coexistence. Local 24-guest audio and forced TURN evidence do not establish a production capacity ceiling.
- A real consented walkthrough, search-page rollout in the SEO branch, and seven-day group retention instrumentation. Current counters are conversion proxies; they do not prove group retention or attribution. Do not invent those metrics.

The feature is not certified secure or approved for public launch by passing local tests. Keep the flag off until these checks have evidence and an operator owns incident response.

## Source references

- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): validate success, hostname and action; provider tokens are single-use.
- [Umami tracker configuration](https://docs.umami.is/docs/tracker-configuration): exclude query strings and fragments from the already-loaded SPA tracker.

## Guest voice implementation

See [implementation status and verification](voice-implementation-status.md) for the exact shipped behavior, evidence and remaining deployment gates. The detailed [voice and capacity plan](voice-capacity-plan.md) defines the monitoring requirements; the status document records the delivered implementation and environment validation still required.
