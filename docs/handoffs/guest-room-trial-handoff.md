# Guest room trial: security and first-use handoff

> Superseded for execution on November 1, 2026 by [Guest rooms production completion handoff](guest-room-production-completion-handoff.md). Use that handoff to finish deployment, voice validation, monitoring, capacity testing, public access and acquisition. This earlier brief contains historical prototype status and design suggestions that no longer describe the real Phaser/SFU implementation.

Date: 2026-10-30
Status: historical planning and prototype brief. Current implementation status, including real guest voice, is in [the feature README](../../feature-plans/guest-room/README.md). The completion handoff above defines the remaining work.
Scope: Workdash frontend and Workdash-SFU backend.

## Purpose and agreed direction

Let someone experience WorkDash with friends before creating an account. The first visit must be fast, understandable and reliable. Signup preserves the character and gives the host a persistent place for their group.

The latest discussion replaces the initial public stranger lounge with temporary, invite-only guest rooms. Anyone holding an active invite can request entry; this is not a publicly listed room and the link is not proof of personal identity. Do not advertise it as confidential.

Agreed workflow:

1. Visitor chooses an approved character appearance without an account.
2. Visitor creates a temporary room and receives an invite link.
3. Friends choose characters and join without accounts, within admission limits.
4. Each guest may sign up to save their own character.
5. The host may sign up and explicitly save the room, subject to normal account limits.

Room lifetime is 20 minutes from successful server creation. Character customization does not consume trial time. A room that stays completely empty for three minutes closes early. Standing still, muted audio and a background tab do not mean the room is empty. Host disconnection does not close a room while friends remain. Refreshing, inviting, reconnecting and starting OAuth do not reset expiry.

These durations are initial product settings, not validated conversion optimizations. Keep them configurable. Do not revive the earlier proposal of three shared public lounges as the private-room capacity policy.

## Product boundaries and decisions still needed

Proposed first release:

- Up to eight participants per guest room, including the host, subject to load validation.
- One live room per host guest session, with additional creation quotas across sessions and network signals.
- Approved avatar assets and preset reactions. No arbitrary uploads, external media, music bots, screen sharing, camera, workspace editing, DMs or unrestricted text chat.
- Voice only after the media-specific tests and quotas below pass. The UI must state what the deployed demo actually supports. A movement-only demo must not promise a voice trial.
- Optional solo exploration should avoid allocating a shared room or media resources until needed.

Before implementation is considered ready, record decisions for total concurrent rooms, total guests, creation rates, media quotas, browser-local character retention, server claim-draft retention, and the treatment of guests after room conversion. Do not invent a production capacity from the eight-person UX proposal.

Recommended conversion policy: after the host saves the room, existing guests may finish their original trial window under their original restricted permissions. Revoke the temporary invite. Further entry uses the ordinary authenticated invitation flow. Saving the room does not make anonymous visitors permanent members or extend their guest credentials. Explain this before conversion.

## Current repository evidence and required discovery

Read these entry points on the actual implementation branch before editing:

- Frontend: `src/pages/invite/[code].tsx`, `src/pages/api/auth/[...nextauth].ts`, `src/types/auth.ts`, and the existing character creation and world-entry code.
- Backend: `src/middleware/socket-auth.middleware.ts`, `src/middleware/http-auth.middlware.ts`, `src/middleware/workspace-member.middleware.ts`, `src/routes/invite.route.ts`, `src/services/workspace.gateway.ts`, `src/schemas/socket-schemas.ts`, and media handlers/services.
- Related briefs: `docs/handoffs/call-scaling-handoff.md` and `docs/handoffs/billing-implementation-handoff.md` in the frontend repository.
- Search initiative, currently in the separate seo-wins checkout: `worktrees/seo-wins/docs/growth/seo-aeo-initiative.md`, relative to the parent project directory. Verify its eventual merged location and release status.

Observed in this planning pass: socket authentication assigns account user ID, email and name after JWT verification. Workspace middleware checks account membership. Invite metadata is publicly readable behind an existing route limiter. These observations are not a complete authorization audit. Do not fabricate user accounts or bypass membership checks to fit guests into those assumptions.

The call-scaling handoff contains dated shared-media and eager-transport findings. Recheck current code and deployment before relying on them. Its capacity estimates are not guest-launch evidence. Existing uncommitted work is present in the frontend checkout; preserve it and coordinate branches before implementation.

## Security invariants

1. Guests are a distinct principal type with an explicit capability allowlist. A guest credential cannot authenticate as an account or access normal workspace, admin, billing, file, search, message-history or membership APIs.
2. Every HTTP operation and socket event checks the principal, room, capability and live room/session state. Authentication at socket connection alone is insufficient. Expired or revoked sessions stop operating on already-open sockets.
3. Media authorization verifies that transports, producers and consumers belong to the permitted room and principal. Client-provided room IDs or media IDs never establish ownership.
4. The server owns room expiry, host identity, presence, slot counts and permissions. Client clocks, avatar IDs, display names and analytics events establish none of these.
5. A copied invite grants only an opportunity to join within policy. It grants no host, claim, moderation or room-conversion capability.
6. Guest admission and resource allocation remain bounded during races, reconnect storms, process restarts and dependency failures.
7. Normal signed-in users remain protected from guest resource exhaustion. Guest traffic must have enforceable resource budgets, not only a room-count limit.

## Admission, credentials and abuse controls

- Use high-entropy, unguessable invitation tokens with expiry and revocation. Store token hashes where practical. Redact invites and credentials from logs, analytics, error reports and referrers. Do not put session credentials in query strings or persistent browser storage.
- Use an HttpOnly secure session cookie where the architecture permits it. For socket/media credentials, use short-lived, narrowly scoped tokens with explicit issuer/audience validation and server revocation checks. Specify secure cross-origin handling for the actual frontend/backend deployment.
- Protect cookie-authenticated mutations against CSRF; validate allowed browser origins on sockets. CORS alone is not authorization.
- Apply network-edge controls and bounded request bodies before expensive work. Apply shared server limits to room creation, invite lookup/redemption, session issuance, connections, reconnects, messages and media allocation.
- Combine guest-session, account where applicable, network and global quotas. Configure trusted proxies correctly so spoofed forwarding headers cannot evade limits. Shared household or campus IPs must not automatically imply abuse.
- Add a server-validated anti-bot challenge before expensive admission when policy requires it. Verify expected hostname/action, reject replay, and rate-limit the challenge path. A challenge is not a substitute for quotas or authorization.
- Make room creation and joins idempotent for network retries. Reserve room and participant capacity atomically across backend instances, with bounded reservation TTLs and rollback after failed joins. Do not use process-local counters as global enforcement.
- Fail closed for new shared-room admission when quota or authorization state cannot be checked. Offer solo exploration or an honest retry state; do not silently remove caps.
- Bound socket event rates, payload lengths, nesting and numeric ranges. Validate movement against allowed map bounds and avatar choices against approved assets. Coalesce movement updates and apply outbound backpressure.
- Restrict concurrent sockets per guest session. Count reconnects consistently so duplicate tabs neither multiply resources nor incorrectly mark an occupied room empty.
- Provide host kick, invite revocation/rotation and room-close actions with server enforcement. Kicked sessions cannot rejoin with the same credential. Add local mute and a bounded abuse-report path. A leaked link and replacement browser sessions can bypass simple kicks, so retain admission controls and the ability to close the room.
- Define guest-specific CPU, memory, connection, media and egress budgets. Prefer a separately constrained guest service/worker pool where feasible. Include origin protection and infrastructure-level traffic controls; application rate limits cannot absorb every volumetric attack.

## Room lifecycle and cleanup

Suggested states: active, converted, expired, closed. Empty-room cleanup is a deadline attached to an active room, not a client event that immediately deletes it.

- Store server creation time and an immutable trial deadline. Record an empty-since timestamp only when no valid participant presence leases remain.
- Use bounded heartbeat leases to detect crashed clients. A dropped host is allowed to reconnect while the room remains active. Define and test the heartbeat grace interval separately from the three-minute empty-room period.
- Clear empty-since when someone successfully rejoins. Recheck occupancy and lifecycle atomically before closing; a stale cleanup job must not delete a room someone just rejoined or converted.
- At expiry, reject new actions immediately and close sockets/media. Cleanup jobs are a backstop, not the authority deciding whether expired credentials still work.
- Reclaim transports, producers, consumers, presence, temporary metadata, invite tokens and reservations. Run idempotent reconciliation after restarts and test partial cleanup failures.
- Starting signup does not grant an unbounded extension. If OAuth finishes after expiry, allow a separately retained, bounded character/room-configuration draft to be claimed under policy, without restoring anonymous access or media.
- Distinguish live-room expiry from draft retention. Choose and disclose the draft-retention duration before launch. No indefinite retention of guest history or raw media.

## Signup and ownership transfer

- Bind a single-use claim to the guest session and the authenticated account produced by the normal sign-in flow. Preserve the intended destination through a validated OAuth state/return path; reject arbitrary redirects.
- Claim character appearance only from validated approved assets. Never trust a user-submitted guest ID as proof of ownership.
- Saving a character does not save someone else's room. Only the verified host guest session can request room conversion.
- Convert with an atomic, idempotent transaction that checks current lifecycle, claim ownership, account workspace quotas and trial resource limits. Resolve competing claims and cleanup races explicitly.
- Rotate/revoke guest host credentials after conversion. Do not copy anonymous participants into permanent membership, grant roles, or carry all guest permissions into account credentials.
- Preserve character choices on cancelled, failed or retried signup. Existing-account login must not silently overwrite an existing saved character; offer a clear choice.
- If conversion cannot finish, show a retryable error and the honest room status. Never display a saved-room success until the backend confirms it.

## First-contact experience

Use the established warm den design in `PRODUCT.md` and `DESIGN.md`. Keep the first screen focused on entering or joining, with a good default character and optional customization.

- Main CTA: "Try with friends". Supporting copy: "No account needed. Your guest room lasts 20 minutes."
- Joining an invitation should preserve the destination through character choice, connection errors and signup. Do not route invitees through unrelated onboarding.
- Show character preview promptly and meaningful progress during asset loading. Load the game after intent rather than blocking the search landing page on it. Avoid media allocation before the visitor requests voice.
- On entry, show the invite action and one simple interaction. Do not require a long tutorial. A host alone must have something understandable to do while waiting.
- Request microphone permission only after the user explicitly chooses voice. Start muted. Make mute, participant identity and leave controls obvious. Handle denied permission, unavailable devices and failed media without losing the room.
- Show a quiet remaining-time indicator and a clear five-minute warning. Do not interrupt repeatedly, fake urgency or reset the timer as a conversion trick.
- Persistent CTA: "Keep my character". Host CTA: "Save this room". Explain that saving the room requires an account and that guests remain temporary.
- If a room is full, expired, closed or unavailable, give the correct next action. Preserve appearance; never show an infinite spinner, fake queue position or a signup wall presented as an infrastructure error.
- Do not promise that anyone with an invite can always enter. State capacity and availability limits without burdening the first screen with implementation details.
- Support keyboard controls, visible focus, screen-reader status messages, sufficient contrast, reduced motion and usable touch controls. Test the actual supported mobile browsers and weak-network loading.
- Display real participant presence only. Any tutorial character must be visibly labeled as a guide.

## SEO, AEO, GEO and measurement

Provide an indexable `/try` page with server-rendered descriptions of the actual deployed trial: no-account entry, duration, invitation behavior, signup preservation and supported voice behavior. Link from relevant comparison and friend-hangout pages. Keep live guest rooms and token-bearing invite pages out of indexing and sitemaps; authentication remains the protection for private data. Robots exclusions are not access control.

Use a real consented walkthrough. Describe room-based voice accurately; do not claim distance attenuation based on older product terminology. No fabricated reviews, user counts or promised AI citations. Keep public search pages available when new guest admissions are disabled.

Measure page visit, create attempt, successful room entry, invite join, first meaningful action, signup start/completion, character claim and room conversion. Use server-confirmed events for admission and ownership outcomes. Attribute the host's acquisition separately from invited visitors; do not inflate acquisition by counting reconnects.

The primary business result is a real group using a saved room and returning within seven days, not raw guest creation or signup counts. Define participant thresholds and retention aggregation before reporting that result. Keep invitation tokens, names, email addresses, message contents and credentials out of analytics. Set retention/access policies for security telemetry separately.

Compare with the signup-first experience. Report time to entry, join failures, signup abandonment, guest-to-group conversion, return rate, abuse reports and cost per activated group. Any experiment must use identical security enforcement in both variants.

## Mandatory verification before public launch

Security and lifecycle tests must exercise backend behavior directly, not merely disabled UI controls:

| Scenario | Required result |
| --- | --- |
| Guest calls account/admin/history/file endpoints | Denied without disclosing protected data |
| Guest changes room, user, producer or consumer IDs | Cannot cross rooms or assume another identity |
| Expired/revoked token on an existing socket | Further actions denied and resources released |
| Invite or challenge replay, forged claims, CSRF | No unauthorized admission or ownership change |
| Concurrent creates/joins across server instances | Global, room and principal limits hold |
| Multiple tabs, reconnect storm, process restart | No duplicate ownership, leaked slots or unbounded resources |
| Last participant leaves, then rejoins near cleanup | Occupied room survives; truly empty room closes |
| Host leaves while friends remain | Room stays active until its original deadline |
| Twenty-minute deadline with active participants | Trial access ends according to server time |
| OAuth cancelled, delayed or retried | Character draft survives policy; trial access does not extend |
| Conversion races with expiry, cleanup or duplicate claim | Exactly one valid outcome, no privilege escalation |
| Participant signs up before the host | Participant keeps own character, gains no host authority |
| Host converts with anonymous friends present | Guest expiry preserved; no automatic permanent membership |
| Malformed/oversized packets and event floods | Bounded resource use; legitimate rooms stay responsive |
| Dependency outage or anti-bot failure | Bounded failure, usable explanation, no admission bypass |
| Kill switch during active sessions | Defined revocation/drain behavior; ordinary accounts protected |

Run staged load tests on non-production infrastructure for idle guests, join bursts, all participants moving, reconnect bursts, expiry/cleanup bursts and voice if enabled. Measure p95 entry latency, errors, event-loop delay, worker CPU, memory, transport counts and egress while signed-in reference rooms are active. Set written numerical pass/fail thresholds and production caps from those results before release. Verify every temporary resource returns to baseline after the test.

Perform first-use checks on desktop and supported mobile devices: fresh visitor, invited friend, full room, weak network, blocked microphone, connection recovery, five-minute warning, expiry, successful signup and failed signup. Verify copy against the actual backend outcome and preserve the selected character throughout.

## Delivery sequence and launch gates

1. Audit current authorization and resource allocation on the chosen branches. Document capability boundaries and settle the remaining lifecycle/capacity decisions.
2. Implement guest principals, admission quotas, lifecycle, cleanup and ownership claims behind a default-off feature flag. Add the adversarial tests alongside the backend changes.
3. Build character entry, invite joining, recovery, expiry and signup continuity. Connect voice only when its separate admission and ownership checks are ready.
4. Complete staging security tests, load tests and desktop/mobile experience checks. Record measured capacity and unresolved findings in this handoff.
5. Release to a bounded audience with alerts and an operator runbook. Expand only after join reliability, cost and abuse rates meet the agreed thresholds.

Public launch is blocked by cross-room access, guest-to-account privilege escalation, unbounded admission/media allocation, expiry or claim races, resource leaks, missing revocation, or a broken core join/signup journey.

The runbook must document who responds, how to disable creation and joins independently, how to revoke active guest sessions, how to shut down guest media, how to retain minimal incident evidence, and how to verify normal rooms remain healthy. A UI feature flag alone is not a kill switch.

Required handoff-back evidence: changed frontend/backend paths, capability matrix, chosen limits and rationale, automated test results, staged load report, first-use screenshots/results, conversion semantics, cleanup verification and rollback instructions. Do not report the feature as secure merely because tests pass; state tested boundaries and remaining limitations.
