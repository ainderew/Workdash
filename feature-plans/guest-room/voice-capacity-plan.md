> RETIRED PROTOTYPE DOCUMENT. The separate HTTP media service and worker described below were removed. Read [the real Phaser/SFU integration](README.md) for current behavior and rollout requirements. Old load results do not establish the shared SFU capacity.

# Guest voice and capacity implementation plan

October 30, 2026. Guest voice and initial capacity telemetry are now implemented locally. See [implementation status](voice-implementation-status.md) for delivered behavior and evidence. This document remains the full target plan; it includes monitoring and production validation work not yet completed. Production capacity is not verified.

## Experience

A guest chooses a character, creates or joins an invite room, and can talk with friends without an account. Use one shared voice channel for the trial room. Enter with the microphone off and an explicit Join voice button. Explain microphone permission, show connection and mute states, provide local participant mute and retry, and handle autoplay restrictions. Listening must not require microphone permission. Permission denial must leave a usable listen-only path. No recording. Keep the existing 20-minute room deadline, three-minute empty cleanup and signup-to-save flow. Signup does not extend anonymous voice access.

## Server design

1. Add a guest-only media manager using the installed mediasoup stack. Start one dedicated guest worker with one audio-only router per active room, created lazily. Do not attach guests to the account media gateway or its shared router. Use a distinct media port allocation and explicit announced address. The existing HTTP-only container budget of 0.5 CPU and 384 MB is not a tested voice allocation. Choose its replacement after measurement.
2. Keep signaling behind the same-origin Next proxy and HttpOnly guest session. Audio flows by encrypted WebRTC directly to the media endpoint, not through Next. Define separate bounded signaling schemas and body limits for RTP/DTLS capabilities. Retain strict origin, proxy authentication, rate limits and timeouts. Public media ports require firewall and network-level flood protection; HTTP challenges do not protect UDP bandwidth.
3. Derive room and principal from authoritative guest state for every media operation. Check lease, revocation, deadline, room state and resource ownership. Only consume producers belonging to another active guest in the same room. Reject video, screen sources, data channels and extra encodings. One send transport, one receive transport, one microphone producer and at most seven remote audio consumers per guest. Create consumers paused until client setup completes.
4. Serialize resource allocation per principal and room. Reserve quotas before asynchronous allocation, release on failure, and recheck authorization after allocation before returning resources. Use idempotent request IDs and server-issued connection generations so retries or duplicate tabs cannot multiply resources. A replacement connection closes the prior generation.
5. Close resources on leave, kick, room closure, lease loss and deadline. Local deadline timers enforce expiry even if the database is down. Reconcile authoritative membership at least every five seconds and fail closed when authorization freshness expires. A successful kick/close response must acknowledge local media teardown. Include cleanup race tests and worker crash recovery. Restore voice only after fresh authorization; never resurrect an expired room.
6. Initially support exactly one active guest media owner. Enforce a renewable ownership lease with fencing, terminate media before the lease expires if renewal fails, and reject signaling at non-owners. Do not add replicas behind a load balancer without room-to-node routing. Worker failure clears runtime resources and clients reconnect with backoff within their original room deadline.
7. Target mono Opus at 24-32 kbps, with DTX and echo cancellation. Treat encoder settings as preferences, not security controls. Apply transport limits, monitor actual input and close sustained abusive senders. Include network packet-rate limits because bitrate negotiation cannot stop a malicious sender. Never log media payloads, SDP, credentials or invite tokens.
8. Verify restrictive-network connectivity. If TURN is required, use short-lived credentials tied to active membership, bounded allocations and a separate relay budget. Test relay-only clients and include relay traffic in sizing. Do not claim universal connectivity based on a local direct connection.

## Capacity model

Track registered users, concurrent room occupants, voice-connected users and transmitting producers separately. Size admission for everyone in each admitted room being able to unmute together. Quiet microphones are not spare guaranteed capacity.

For a fully connected audio room with n transmitting users, the SFU has n producers and n * (n - 1) outgoing consumers. With two transports per voice-connected user, transport demand is at most 2n. Across rooms, sum each room's demand instead of squaring total users. Adding one person to an n-person room adds 2n worst-case consumers.

Illustrative budget using 50 kbps per forwarded stream, including an assumed allowance for packet overhead. This is a planning input to replace with measured wire traffic, not a codec guarantee or server benchmark.

| Occupancy | Producers | Outgoing consumers | Estimated outbound traffic |
| --- | ---: | ---: | ---: |
| One room of 4 | 4 | 12 | 0.6 Mbps |
| One room of 8 | 8 | 56 | 2.8 Mbps |
| Three rooms of 8 | 24 | 168 | 8.4 Mbps |
| Six rooms of 8 | 48 | 336 | 16.8 Mbps |

The current global cap is 24 guests across up to six rooms. Six rooms does not currently authorize 48 guests. Three full eight-person rooms are the worst fan-out distribution for 24 occupants. At the illustrative rate, 8.4 Mbps sustained for an hour is approximately 3.78 GB outbound, before TURN and other services.

A historical inventory from October 2 describes six shared vCPUs, 11.7 GB RAM and a 300 Mbps port shared with other applications. Verify the live host, quotas, traffic allowance and baseline load before using those numbers. The main media service currently creates one worker; whole-host average CPU can hide saturation of that worker. A mediasoup worker uses one CPU core.

Keep eight as the room product limit and 24 as the first staging target. Determine the public cap from production-like voice testing. No fixed users-per-vCPU claim is justified yet. For eight-person rooms, a tested consumer budget C supports at most floor(C / 56) full rooms, subject also to worker CPU, memory, ports, bandwidth, control-plane load and call-quality limits.

## Operator visibility

Add a private metrics endpoint and an authenticated operator dashboard. Keep metrics scraping separate from the reports endpoint. Use bounded labels such as node, worker, outcome and rejection reason; do not label metrics with guest, IP, invite or room identifiers.

Display:

- Active rooms and occupants against configured limits; voice-connected users, transmitting producers, transports and consumers; reserved worst-case consumers and remaining admission budget.
- Per-worker CPU using deltas of worker.getResourceUsage(), container CPU throttling, memory and host CPU steal. Node process.cpuUsage() alone excludes the mediasoup child process. Measure both the guest worker and normal account workers.
- Host and guest media inbound/outbound Mbps and packets per second, measured transport byte deltas, retransmissions, monthly traffic and TURN use. Distinguish wire traffic from RTP payload traffic.
- Voice connection success and time to first received audio, disconnects, reconnects, sampled loss, jitter and RTT, with sample counts. Client quality reports are untrusted telemetry and never authorize additional capacity.
- HTTP latency/error/rate-limit counts, database lock waits, Redis health, worker restarts, resource cleanup failures and last successful metric collection time.
- Admission state and reason: open, near capacity, draining or paused. Show configured ceiling, last tested ceiling and observed occupancy separately. Do not label remaining slots as verified capacity if the test is missing or stale.

Prometheus/Grafana is a suitable implementation if there is no existing metrics system. Scrape every 10-15 seconds, evaluate local admission health more frequently, and retain enough history to inspect the busiest periods. Reset event-loop histograms per reporting window. Cost per guest-hour requires actual hosting and traffic costs; do not invent a cost from CPU percentage.

## Required observability and scaling evidence

Added October 30 at the user's request. These are delivery requirements for guest voice, not optional follow-up work. Integrate with the application's existing log collection and observability deployment after inspecting it; do not create a disconnected dashboard or assume a collector already exists. The backend currently has a tagged console logger with JSON context, but that alone does not provide historical metrics, alerting or log retention.

### Metrics and historical demand

Collect guest and signed-in media workloads separately and show their combined impact on shared host resources. Include:

- Gauges for room occupants, voice-connected users, transmitting producers, consumers, transports, reserved media capacity, configured ceilings and the last verified test ceiling. Label tested capacity with build and environment metadata outside high-volume series.
- Admission counters split by create/join and outcome: admitted, product room limit, global guest limit, media reservation exhausted, CPU pressure, memory pressure, bandwidth pressure, stale telemetry, dependency unavailable and abuse rate limit. Keep abuse and invalid requests separate from capacity demand.
- Histograms for signaling latency, voice connection time and session duration; counters for connection attempts, successes, failures, reconnects and cleanup failures. Include denominators and sample counts on quality charts.
- Resource time series for each media worker and container, host bandwidth and packet rate, CPU steal and throttling, database contention, Redis failures, and normal call quality. Preserve the distinction between per-core worker CPU and whole-host CPU.
- Time spent near capacity, in a paused state and at each limit; peak and p95 concurrent occupancy, voice guest-hours, media GB per guest-hour, peak reserved-versus-used streams, and remaining headroom over 24-hour, seven-day and 30-day windows.

Capacity rejection requests are not unique lost users. Retries can inflate them and bots can generate them. Where a valid guest session exists, count affected sessions once per bounded reporting window using expiring private deduplication state. Export only the aggregate count. Label rejected create requests without an established session as attempts, not people. Do not add guest IDs to metrics labels. Show attempted demand and served demand separately; neither alone establishes the exact number of prospective users.

Start with 30 days of detailed metrics and 90 days of hourly aggregates, subject to the existing monitoring storage budget. Keep incident logs for 14 days initially. Configure retention explicitly and review volume after rollout. Dashboards must show missing or stale data as unknown rather than zero.

### Structured operational events

Use stable event names with structured context through the backend logging convention. Required events are `guest.capacity.state_changed`, `guest.admission.rejected`, `guest.voice.connection_failed`, `guest.voice.worker_failed`, `guest.voice.cleanup_failed`, `guest.capacity.telemetry_stale` and `guest.capacity.policy_changed`. Record recovery transitions as well as failures.

Each event includes UTC timestamp, severity, service, environment, node, worker when applicable, build version, event name, bounded reason code, operation and a server-generated request correlation ID where applicable. Capacity events include observed value, unit, threshold, configured limit, reserved and used resources, measurement window, sample age, and previous/new admission state. Policy changes include previous/new values and the authenticated operator reference in access-controlled audit logs.

Use an allowlist of fields. Never log guest cookies, bearer tokens, invite links, raw IPs, email addresses, audio, SDP or full request bodies. Do not serialize arbitrary exception objects. Do not emit per-packet logs. Count every rejection in metrics, but sample repetitive rejection logs and emit periodic aggregate summaries with suppressed-event counts. Always retain state transitions and policy changes. Bound log queues and logging rates so an attack cannot exhaust disk or block media handling.

### Alerts and operational response

Implement configurable duration-based alerts and recovery notifications, with deduplication and hysteresis. Tune numerical resource thresholds during the load test. Required alert conditions:

| Condition | Response |
| --- | --- |
| Sustained low tested headroom or repeated legitimate capacity rejections | Warn the operator and inspect the limiting resource and busiest-hour trend |
| Admission automatically paused | Alert with reason, threshold, usage and a dashboard/runbook link; preserve existing calls where possible |
| Worker crash, leaked resources beyond the cleanup bound or failing teardown | High-priority alert and reconciliation; block unsafe allocations |
| Voice connection or quality regression with sufficient samples | Alert even when CPU looks healthy; compare signed-in call quality |
| Metrics absent or stale | Mark capacity unknown and block new media allocations according to the admission policy |
| Sustained impact on signed-in calls or other shared services | Stop guest growth and drain guest admission; inspect shared-host contention |

Do not page for every rejected request. Use minimum sample counts for percentage alerts and a separate no-data alert. Record the first breach, duration, peak, mitigation and recovery so later capacity decisions can use incident history. Configure the notification destination during deployment; no external messages are authorized by this document alone.

### Scaling decisions

The dashboard must answer what limit was hit, how often and for how long, how many valid sessions were affected, what resource constrained admission, and whether normal calls degraded. Produce a weekly view of peak demand, rejection rates, headroom, voice guest-hours and traffic trends. This is a dashboard/report requirement, not a scheduled automation created by this plan.

If a configured cap is the constraint and resources remain healthy, test the next cap before changing it. If a worker core is saturated while the host has spare capacity, evaluate distributing rooms across additional workers. If host CPU, memory, network or shared-service contention is the constraint, evaluate a dedicated media node or additional nodes. Increased packet loss with spare server resources may require network or TURN work instead of a larger server. Do not infer linear users-per-CPU scaling from one load point.

Before launch, demonstrate that a controlled capacity breach appears in metrics, produces a bounded structured event, changes admission correctly, reaches the configured alert destination, and records recovery. Verify the same for stale metrics and a worker failure. Confirm that rejected retries do not inflate the affected-session count and that log volume stays bounded during an admission flood. Observability acceptance is part of the voice release gate.

## Admission and overload behavior

Use atomic reservations for the worst-case media demand of admitted users, plus configured guest and room limits. For the first trial, reserve the full eight-seat media budget when creating a room if resources allow, so the host's invited friends have a predictable opportunity to join. Reservations expire with the room. This conservative option can limit the number of simultaneous rooms below six; expose that explicitly in the dashboard.

After benchmarking, set operational ceilings below the last passing load step with roughly 30% measured headroom. Account for normal users and other applications on a shared host. Stop new room creation first, then new joins if an emergency resource or quality threshold is crossed. Preserve existing calls while draining. Resume only after sustained recovery, using hysteresis to avoid repeated opening and closing. Unavailable or stale capacity data blocks new allocations. Offer a clear busy message and preserve character edits. A runtime capacity pause must not silently remove voice from an otherwise advertised voice trial.

Use configurable thresholds derived from baseline and test results. Initial candidates to validate include sustained worker CPU over 70% of one core, memory over 75% of its budget, or egress over 70% of its assigned share. Quality degradation and resource failures override apparently healthy CPU. These are proposed triggers, not measurements or automatic production changes.

## Validation and delivery order

1. Build guest media authorization, quotas, resource ownership and deterministic cleanup tests. Exercise cross-room consumption, guessed resource IDs, duplicate/replayed allocation, races with kick and expiry, account-token confusion and dependency failure.
2. Wire the browser voice controls and prove bidirectional audio with two independent browser sessions. Cover listen-only permission denial, mute, local mute, mobile autoplay, reconnect and expiry. Unit tests alone cannot establish audible voice.
3. Add worker and transport metrics, private dashboard and admission controls before inviting public traffic. Verify metric deltas, counter resets, stale samples, reservation accounting and overload recovery.
4. Run a separate load generator producing and receiving real WebRTC audio on a host matching production limits. Test 8, 16 and 24 users, worst-case all transmitting, mixed occupancy, join bursts and reconnect storms. Hold each step for at least 30 minutes to cross the room deadline and test replacement-room churn. Collect CPU, packet rate, memory, throughput, connection success and audio quality. Include TURN paths and normal signed-in calls concurrently.
5. Record the largest passing load step, limiting resource, headroom and exact build/hardware/configuration. Suggested starting acceptance targets: at least 99% successful voice connections under supported test conditions, p95 warm audio connection under three seconds, below 1% unexpected signaling errors, no surviving resources after cleanup bounds, and no material degradation to normal calls. Define loss/jitter targets for controlled network conditions before testing and compare signed-in call baselines. Repeat after changes that affect media cost or host allocation.
6. Open a bounded rollout using the measured ceiling. Alert on exhausted headroom, quality regressions and capacity rejection rate. Raise limits only after the next load step passes.

## References

- [mediasoup scalability](https://mediasoup.org/documentation/v3/scalability/)
- [Worker resource usage and transport controls](https://mediasoup.org/documentation/v3/mediasoup/api/)
- [RTC statistics](https://mediasoup.org/documentation/v3/mediasoup/rtc-statistics/)
- Local historical inventory: `docs/handoffs/call-scaling-handoff.md`.
