# WorkDash search initiative

Research and first implementation: October 30, 2026.

## Audience and target queries

Start with existing friend groups and gamers who want a persistent browser hangout. The product has room-based voice, not distance attenuation. About twenty people is a product comfort guideline, not a load-test guarantee. Do not claim enterprise readiness, end-to-end encryption, Discord migration, or permanent pricing guarantees without evidence.

| Page | Primary intent | Related queries |
| --- | --- | --- |
| / | Identify the product | WorkDash, browser hangout, virtual room |
| /gather-alternative | Compare a replacement for Gather | free Gather alternative, Gather alternative for friends, Gather Town alternative |
| /discord-alternative | Compare a different way to hang out | Discord alternative for friends, Discord alternative with a virtual world, Discord alternative with proximity chat |
| /hangout-with-friends | Find a shared place for an existing group | hang out online with friends, virtual hangout room, browser voice chat for gaming groups |
| /help | Set up and troubleshoot | WorkDash microphone, room-based voice chat, WorkDash mobile, invite friends |
| /vs | Compare specific products | WorkDash vs Discord, WorkDash vs Gather |

These are query hypotheses, not measured volumes or ranking forecasts. Keep related phrases on one useful page. Do not generate separate thin pages for every synonym. Broad "Discord alternatives" is a competitive discovery query; the first page deliberately narrows to friends who want a walkable room.

## Shipped in this change

- Three distinct public pages with unique titles, descriptions, canonical URLs and visible HTML answers.
- Product screenshot and walkthrough links on comparison and use-case pages.
- Contextual links and footer discovery links, plus new sitemap routes.
- Corrected misleading Discord claims. Discord already supports drop-in voice and visible participants.
- Shared FAQ content between homepage and help page.
- Source-linked Discord comparison with a review date.
- Existing Umami CTA events extended to the new pages with page-specific locations.
- Sitemap omits lastmod until real content-modification dates are maintained.

## First 30 days

1. Establish Search Console and Umami baselines before publishing. Record indexed URLs, non-brand queries, clicks, impressions and landing pages for the previous 28 days. Verify search-engine ownership and inspect the production canonical URLs. Submit the production sitemap after release.
2. Publish this change and inspect all three URLs in Search Console. Confirm HTML content, canonical selection, mobile readability, image loading and CTA navigation.
3. Record a real group using the room with their consent. Show sign-in, joining, room-based voice and returning to a workspace. The current screenshot and homepage walkthrough are not a customer testimonial or an empirical performance test.
4. Prepare a short creator/demo pitch and a small list of relevant communities and directories. Check each community's promotion rules. Disclose the maker relationship. Ask for honest reviews, not keyword-stuffed mentions or guaranteed AI citations. Send or post only after the user authorizes those specific communications.
5. Review after four weeks. Improve pages receiving relevant impressions or successful group use. Do not expand based only on raw traffic or one AI answer.

## Measurement and limits

The existing self-hosted Umami integration records page views and referrers when its production build variables are configured. Inspect source/UTM reports for Google, Bing, ChatGPT and Perplexity. ChatGPT search links may carry utm_source=chatgpt.com. Never place invitation tokens, emails, message text, names or workspace names in event data.

Existing event funnel: cta_open_room -> sign_in_started -> sign_in_completed where instrumented -> den_created / invite_joined. CTA location identifies the new page. Verify these in the production dashboard; source code alone does not prove receipt. Google sign-in completion coverage and cross-session attribution must be audited before treating this as a complete funnel.

The primary outcome remains a new group using a room together and returning within seven days. Current anonymous events do NOT establish group co-presence or seven-day group retention. That requires a separately specified server-side aggregate using successful joins/presence, a stable internal workspace key, and a minimum participant threshold. Avoid client-side invented "activated" or "retained" events. Report existing conversion proxies separately until this is implemented and verified against backend data.

For AI visibility, repeat a small fixed prompt set monthly and record engine, date, exact prompt, cited URLs and whether WorkDash is described accurately. Examples: "What can a small friend group use instead of Gather for free?" and "Is there a Discord alternative with a walkable virtual world?" These samples are directional observations, not a reliable rank metric.

## Crawl access

Current robots.txt allows public routes under User-agent: * and excludes /api/ and /invite/. This already permits Googlebot, Bingbot, OAI-SearchBot and PerplexityBot on public pages. Avoid separate bot groups unless exclusions are repeated correctly. Search crawler access does not require opening training crawler access.

After release, inspect real server/WAF logs and the provider's published IP verification guidance. A request with a spoofed bot user-agent is not proof the real crawler can reach the site. Do not weaken firewall rules blindly. Private app routes should keep their authentication and noindex behavior.

## Evidence and maintenance

- Google: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- OpenAI publisher discovery: https://help.openai.com/en/articles/12627856
- Perplexity crawlers: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Discord capabilities: https://support.discord.com/hc/en-us/articles/360045138571-Beginner-s-Guide-to-Discord
- Gather pricing: https://www.gather.town/pricing

Recheck competitor claims and pricing before each publication and at least quarterly. Prefer current official documentation. Google does not require special AI markup or llms.txt. Structured data must match visible content; it does not guarantee inclusion or rich results.

Pending external work: Search Console/Umami baseline access, production release, genuine crawler verification, customer evidence, authorized distribution, and backend retention measurement. No accounts, external posts, or schedules are created by this change.

## Implementation verification

Production Next.js build passed. ESLint passed for changed TypeScript/TSX files. The three existing analytics-helper tests passed. Production browser checks passed at 1440px and 390px for the three new pages and the Gather page: HTTP 200, one H1, correct canonical, description, CTA event attributes, no document overflow, and working home navigation. Sitemap inclusion and server-rendered help answers passed. A review identified light-theme link/button contrast; scoped fixes use existing text and darker accent tokens.

The standalone TypeScript command initially exposed existing missing Vitest globals in unrelated test helpers. With the required test and socket globals supplied explicitly, it passed; the normal production build also passed. No application TypeScript configuration was changed for this work.

## Trust and technical follow-up

Added /about using the origin story already published on the homepage, with Andrew Pinon's existing GitHub identity, support contact, product limits, changelog and policy links. AboutPage, Person and WebApplication JSON-LD identify the same visible maker and app. The homepage app and maker share those stable IDs. No inferred credentials, reviews, user counts or endorsements were added.

Run `npm run check:seo -- http://localhost:8083` against a running build, or `npm run check:seo -- https://workdash.site` after deployment. The read-only command emits a dated JSON report and exits nonzero on broken public-page checks. It checks server-rendered metadata, canonicals, sitemap membership, H1s, document language, share tags, parseable JSON-LD, visible FAQ parity and the about-page identity. This is a smoke check, not a full schema validator or evidence of indexing/rankings. Run Google's Rich Results Test and Search Console URL Inspection separately.

The existing lounge.webp provenance confirms an actual owner-captured app screenshot. The walk-in-intro MP4 is generated cinematic footage and must not be called a real group recording or case study. A genuine walkthrough should capture: sign in and create a workspace; invite another participant; enter the same room and demonstrate voice; move to a different room and show the changed conversation; show desk mode and screen sharing; return to the same workspace. Record only consenting participants, hide email addresses and invite tokens, add captions, and state the capture date and tested browser. Publish the recording only after it exists and has been checked against current behavior. No VideoObject metadata is added for nonexistent evidence.

Search Console ownership and a real recording were requested from the user. Production traffic/AI-referral baselines and group-retention metrics remain unverified until dashboard access is available. The public HTML audit is separate from those measurements.

Follow-up verification: the updated production build and 11-page local SEO smoke audit passed. Desktop/mobile about-page checks passed at 1440px and 390px. On the live site, a browser loaded analytics.workdash.site/script.js, exposed window.umami, and sent an /api/send request. This confirms browser-side analytics initialization, not dashboard receipt or traffic baselines. The pre-deployment live sitemap has seven pages and does not yet include the four new routes. See seo-audit-2026-10-30.json for the dated public checks.

## Search favicon correction

The live favicon.ico and local PNG/ICO fallbacks contained the white symbol without its orange background. The SVG source and site logo matched, but ImageMagick's SVG renderer reproduced the faulty raster output by dropping the gradient/clip group. `npm run icons:generate` now uses sharp/librsvg to render the existing SVG and writes a 96px search PNG, 16/32/48/96/256px ICO frames, Apple icon, and PWA icons. The maskable version fills the entire background. The document head explicitly advertises the 96px PNG and each ICO size while retaining the SVG for browsers. `check:seo` now verifies the PNG declaration, HTTP access, dimensions and orange background.

After deployment, request homepage indexing in Search Console and allow recrawl time. The files do not directly update Google's cached search result, and inclusion is not guaranteed. Official guidance: https://developers.google.com/search/docs/appearance/favicon-in-search/

About-page positioning update: the page now leads with WorkDash's purpose, small-group audience, capabilities and current limits. Its title and description focus on the product. Andrew remains credited in a short closing note and the app's creator metadata; the AboutPage's primary subject is the app. Navigation now says "About WorkDash". This replaces the earlier maker-led presentation without implying a larger company or team.
