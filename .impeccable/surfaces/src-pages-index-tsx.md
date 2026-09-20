---
version: 1
slug: "src-pages-index-tsx"
primary_target: "src/pages/index.tsx"
related_targets: ["src/components/landingPage","src/components/navbar"]
---

# Landing page (`/`) — surface brief

Scope: the marketing route `/` only. Visitor mode: **Persuade**.

Audience: friend groups of gamers (ex-coworkers, ~20 people max) who keep a voice
call open at night. Job: understand in one glance that a room is already running
and that joining costs one click. Action: `Open the room` → `/app`.

Proof we actually have: a screenshot of our own lounge. Proof we do **not** have
and must never fake: customer testimonials, company logos, user counts, pricing.
Confirmed by the user on this run — the previous page's five named endorsements,
each attributed to a real company, were fabricated and are deleted; the
Free / $5 "Guild Upgrade" tiers were never built and are replaced by an honest
early-access statement. Positioning is the PRODUCT.md truth (friend groups), not
the old remote-work-team pitch.

Constraints: Pages Router, Tailwind v4, tokens in `globals.css`, `next/font`.
The app's own den system (`--wd-*`) is untouched; this surface owns `--brd-*`.

## Direction contract

**THESIS.** Presence is a physical fact you read off a board, not a feature list.
This surface refuses the category default it replaced: dark hero, blurred accent
blobs, scroll-progress bar, four same-size icon cards, fake testimonials, fake
pricing tiers, and a mock browser chrome around a screenshot.

**OWN-WORLD.** A night-shift crew board in enamelled steel. Deep bottle-green
enamel field, brushed-aluminium edge banding and screw heads, bone laminate name
plates riding in routed channels, domed lamps in aluminium housings — amber for
in-call, green lens for in-world, dark for absent — and a paper ledger strip
clipped along the bottom. Engraved signage lettering throughout: Archivo variable,
width axis carrying the plate legend. Lamplight is the only light in the palette.
The board is one object under one light, so it never themes; only the wall behind
it follows light/dark.

**STORY.** The visitor reads four lamps lit and understands, before any copy, that
people are in there now. They believe it because the lamp key is literally the
product's three states and the screenshot is our own room. They press the
panel-mount button and open the room.

**FIRST VIEWPORT.** Two columns at 1440. Left: the headline at ~72px over three
lines of body, then the amber pushbutton `Open the room` beside an aluminium ghost
`Look inside first`, then a legend line of honest terms. Right: the board at ~45%
of viewport width (amended from ~54% during the finish round: at 1440 a 54% board
leaves the text column under 350px, which breaks the body measure the craft floor
requires, so the board takes the largest share the reading column can spare)
— header rail (`Crew board` · `4 on · since 21:41`), five channels each
holding a name plate, a lamp and a time-on readout, and the ledger strip beneath.
Primary action sits left, above the fold, at the end of the reading order. The
authored moment: plates slide home in their channels in sequence while the lamps
warm up behind them.

**FORM.** Night-shift crew roster board — candidate 6 of my ordered grounded list
(1 Dota party lobby, 2 lit windows at night, 3 Philippine computer shop, 4 lamplit
den interior, 5 JRPG save-select, 6 crew board, 7 24-hour store window). Assigned
by the roll. Seed key `6811e9e1`, scope direction, mode persuade, assigned index 6.
Raises taken from declined and competitive challengers: a printed key that is
literally accurate (ekiben wrapper); one working ink plus lamp light, no decorative
colour (doujin catalog); state that integrates over time rather than snapping —
lamps warm on a delay curve (VU meter bridge, competitive); a visitor ledger of
tonight's arrivals as honest chrome (minihompy room, competitive); depth built from
genuinely separated physical layers rather than a drop shadow (multiplane cel dawn).

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance
