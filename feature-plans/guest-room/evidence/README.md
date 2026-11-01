# Guest release evidence

The dated directories contain checks for the real Phaser/SFU guest implementation. The `2026-11-01` directory records the restricted release and public rollout (November 2 in Asia/Manila). Historical snapshots keep their original source versions; use the latest release manifest for current state.

Earlier prototype screenshots, raw logs and synthetic HTTP voice results are retained in the original local checkout and private retirement archives. They are excluded from this release and are not evidence of real-platform capacity or browser audio.

## November 1 UTC public rollout

- [Public release manifest](2026-11-01/public-launch-final.json): exact validated code/configuration images, public flags, eight-guest/two-room limits, persistent controls and rollback guidance.
- [Final canaries](2026-11-01/public-canary-final.json): 15-minute stable connection, disconnect/presence-grace/empty expiry, final-build entry, unchanged deadline on reload, explicit leave and zero final guest resources. The browser window closed before hard expiry, so it is not labeled a completed 20-minute browser run.
- [Funnel panel correction](2026-11-01/public-funnel-panel-correction.json): the first event is visible using counters labeled with their restart behavior; completed saves remain durable.
- [Final monitoring](2026-11-01/public-monitoring-final.json), [post-redeploy check](2026-11-01/public-monitoring-after-redeploy.json), [live funnel chart](2026-11-01/public-funnel-dashboard.png) and [final real game](2026-11-01/public-real-world-final.png): actual receipts and cleanup, with no firing alerts.

- [Production sign-in and saving](2026-11-01/production-signin-save.json): Google return preserved the operator draft and explicit overwrite guard; a dedicated magic-link test account saved its character and room exactly once and entered the normal world.
- [Public ingress](2026-11-01/public-ingress-final.json): public route/configuration, challenge requirement, origin, method, size and internal-route boundaries passed from outside the former tester allowlist.
- Public TURN [allowed](2026-11-01/turn-public-allowed.json), [blocked peer](2026-11-01/turn-public-blocked.json) and [expired credential](2026-11-01/turn-public-expired.json) checks passed UDP, TCP and certificate-verified TLS, with exact peer/port restrictions intact.
- [UTC correction](2026-11-01/public-clock-correction.json) and [socket burst correction](2026-11-01/public-rate-correction.json) record defects found during the public canary and the deployed corrections. The first two canaries were aborted/failed and are not passing lifecycle evidence.
- [SEO check](2026-11-01/seo-check.json), [real public world](2026-11-01/public-real-world-canary.png) and [390px entry layout](2026-11-01/public-entry-mobile.png) record crawlable content and the real game. Responsive viewport checks are not physical-phone testing.
- [Search Console result](2026-11-01/public-search-console.json), [indexing request receipt](2026-11-01/search-indexing-requested.png) and [processed sitemap](2026-11-01/search-sitemap-processed.png): Google accepted the request and discovered 12 sitemap pages. This does not establish indexing, ranking or AI citations.

Physical voice testing is user-reported (the operator said the trial works); detailed device/network coverage was not supplied. Independent evidence below covers decoded browser audio, server authorization, capacity and local account regression. TLS 443 remains outside the supported/deployed scope. The first 24-hour production review and mature seven-day group return are time-dependent follow-ups; no automation was created.

## November 1 restricted release history

- [Passing eight-guest/two-account capacity run](2026-11-01/capacity-eight-guests-two-accounts.json), [predeclared criteria](2026-11-01/capacity-criteria-v2.json), and [prior attempts](2026-11-01/capacity-attempts.json): 31.09 minutes, expiry/replacement, all observed connections and final cleanup passed. The initial ceiling is eight guests; higher limits and physical-device behavior are unproven.
- [Cleanup and live monitoring](2026-11-01/final-cleanup-and-monitoring.json): temporary test access removed, production remains restricted, resource and saved-group alerts healthy.
- [Historical restricted manifest](2026-11-01/restricted-release-final.json): deployed sources, immutable images, restricted flags, rollback references, authenticated metrics and live dashboard panels.
- [Local account save and group activation](2026-11-01/local-save-and-group-activation.json): real authentication callback, explicit overwrite consent, host conversion, normal invitation, Phaser re-entry and two members overlapping for five minutes. Test mail was captured locally; production provider checks are recorded separately above.
- [Browser relay checks](2026-11-01/browser-relay-host.json): two participants selected UDP/TCP/TLS relay paths and received decoded waveforms on isolated production-host fixtures. Physical devices, restrictive mobile networks and TLS 443 are outside this result.
- [External email alert delivery](2026-11-01/email-alert-delivery.json): production Prometheus, Alertmanager and Resend delivered both firing and recovery emails to the approved operator inbox. The [earlier loopback check](2026-11-01/alertmanager-local-receipts.json) is retained as historical evidence.
- [Follow-up deployment](2026-11-01/restricted-production-redeploy.json) and [actual intent receipts](2026-11-01/production-trial-funnel.json): historical restricted redeploy and privacy-safe funnel receipts.
- [Deployed release and monitoring snapshot](2026-11-01/restricted-production-release.json): exact source/image references and safe restricted settings.
- [Ingress checks](2026-11-01/production-ingress-checks.json): origin, session, method, body-size and private-route boundaries.
- [Fixed-deadline cleanup](2026-11-01/production-hard-expiry.json): actual production guest resources returned to zero; account transports remained.
- [Local real-browser audio](2026-11-01/browser-audio-local.json) and [verification summary](2026-11-01/verification-summary.json): distinguish native authorization checks, decoded audio and actual received waveform observation.
- [Server-rendered entry checks](2026-11-01/trial-entry-ssr.json): explanatory HTML/canonical headers with public discovery still disabled.
- [Real game screenshot](2026-11-01/real-game-local.png), [mobile entry](2026-11-01/trial-entry-mobile.png), and [playback recovery](2026-11-01/playback-recovery-mobile.png): local disposable fixture screenshots, not production audibility or mobile-device evidence.

Server-side group measurement is implemented, tested and populated by a real local visit. No mature seven-day retention results are claimed. Use the current completion handoff for remaining observation windows and physical device/network coverage.
