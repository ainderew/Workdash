# Workdash — Design System

Current system lives in `src/styles/globals.css` (`--wd-*` tokens) and
`docs/style-system.md`. This file documents the system **and** the "cozy gamer den"
direction it is evolving toward (see PRODUCT.md). New features should use the den
palette; existing purple-accent surfaces migrate opportunistically.

## Visual theme

Cozy gamer den: a warm, lamplit room. Deep warm charcoal surfaces, amber accent
light, sage green for "alive" signals. Soft 12–16px radii. Personality in glow and
copy, restraint in layout.

## Color palette (dark, primary theme)

### Den direction (new work)

**Implemented as accent-derived, not fixed amber.** The shipped den surfaces
(`--wd-den-*` in `globals.css`) are computed from the user's selected theme
accent via `color-mix` — panel tint stops at 20/12/7% accent into the panel
surface, embers at 70% accent toward white, glow at accent 0.2/0.06 alpha.
Speaking indicators (halo, equalizer, tile ring) all follow `--wd-accent`.
The fixed warm values below remain the *reference mood* (what the den feels
like under an amber theme) and the palette for mockups:

| Role | Value | Notes |
|---|---|---|
| Background (base) | `#181210` | warm near-black |
| Surface (panel) | `#1d1511` | sidebar, cards |
| Surface (raised) | `#221a14` | hover, elevated cards |
| Border subtle | `#3d2f23` | hairline separators |
| Border strong | `#4a3a2c` | inputs, ghost buttons |
| Text primary | `#f3e6d5` | warm cream — 12.8:1 on base |
| Text muted | `#b5a18a` | 5.4:1 on panel — AA body safe |
| Accent (amber) | `#f0a35e` → `#ffc46b` gradient | primary actions, lamplight glow |
| Accent ink | `#241a12` | text on amber buttons |
| Live / success (sage) | `#97c27f` | presence, live call pulse |
| Danger | `#e8836f` | warm red, leave/mute states |

### Legacy tokens (existing surfaces)

Purple accent `--wd-accent` (`rgb(168 85 247)`) on cool dark panels
(`--wd-surface-panel: rgb(15 17 21)`). Keep using `wd-*` utility classes when
touching existing components; introduce den values via new tokens rather than
hardcoded hex (lint enforces no raw hex in app scope).

## Typography

- Single sans family (system stack / existing app font) in multiple weights —
  no second family.
- Body 13–14px; metadata 11–12px; line-length ≤ 75ch.
- Headings: weight 700, normal letter-spacing. No display sizes inside app UI.

## Components

- **Buttons**: amber gradient primary with 2px pressed-edge shadow (`0 2px 0 #9c6430`),
  ghost = transparent + `border-strong` + muted text. Radius 12px.
- **Cards**: panel surface, 1px subtle border, radius 16px, optional
  `inset 0 1px 0 rgb(255 255 255 / 0.04)` top highlight.
- **Live states**: sage border + soft outer glow (`0 0 22px rgb(140 180 110 / .13)`)
  + 8px pulsing dot. Pulse disabled under `prefers-reduced-motion`.
- **Avatars**: circular, 2px surface-colored ring; overlapping stacks at −7px;
  speaking = 2px sage outline.
- **Toasts** (sonner): panel-2 surface, radius 18px, action row of primary + ghost.

## Layout

- Three-column desk shell: guild rail (64px) / channel sidebar (270px) / main.
- Spacing scale: 4 / 8 / 12 / 16 / 24.
- Call panel docks at top of the main column; chat scrolls beneath; composer fixed.

## Motion

- Pulses: 1.8–2.2s ease-in-out, box-shadow ripple only.
- Hover/active transitions ≤ 200ms.
- Everything gated on `prefers-reduced-motion: reduce`.

---

## Landing surface (`/`) — the crew board

> **Scope boundary.** Everything below applies to the marketing route `/` only
> (`src/pages/index.tsx`, `src/components/landingPage/**`, `src/components/navbar/**`
> when rendered under `.wd-board-page`). It is a second, surface-scoped world with its
> own token prefix `--brd-*` and its own utility prefix `.wd-board*`. The application
> keeps the cozy gamer den system documented above: `--wd-*` tokens, three-column desk
> shell, den/legacy accent. **Never mix the two.** No `--brd-*` token may appear inside
> `/app`; no `--wd-*` token may appear on the landing surface. Tokens live in
> `src/styles/globals.css` under the comment `Landing surface: the crew board`.

### Overview

**Creative North Star: "The Night-Shift Crew Board"**

A roster board in enamelled steel, hung on a wall. Deep bottle-green enamel field,
brushed-aluminium edge banding and screw heads, bone-laminate name plates riding in
routed channels, domed lamps in aluminium housings, and a paper ledger strip clipped
along the bottom. Presence is not a feature bullet here; it is a physical fact you read
off the board. Four lamps lit means four people are in the room right now.

The board is **one object under one light**, so it is made of fixed material and never
themes. Only the wall it hangs on follows the app's light/dark setting. Lamplight is the
only chroma in the palette: amber for in-call, green lens for in-world, dark for absent.
Everything else is enamel, aluminium, bone laminate and paper.

**Key Characteristics:**

- Theme-invariant object on a theme-following wall
- One working ink plus lamp light; no decorative colour
- Depth built from separated physical layers, never from a drop shadow alone
- Engraved signage lettering, width axis carrying the register
- Exactly one authored motion moment, on first paint only

### Colors

The palette is a single dark material — enamel, aluminium, laminate — lit by one warm
lamp. Chroma appears only where light does.

#### Primary (lamplight — the only chroma)

- **Filament Amber** (`--brd-lamp: #FFB44A`): a station that is in the voice call. The
  primary pushbutton, the focus ring, the caret, text selection, and `--brd-lamp-ink` on
  the dark wall.
- **Lamp Core** (`--brd-lamp-core: #FFE7B6`): the hot centre of a lit lens.
- **Lamp Deep** (`--brd-lamp-deep: #C77A22`): the pushbutton's seated bottom edge and
  the amber lens's cooled rim.
- **Lens Green** (`--brd-lens-green: #8FD08A`): a station in the world but not in the
  call. The second and last lamp colour.
- **Warning Ink** (`--brd-signal: #E2674C`): destructive text only (sign out). It is not
  a lamp state and must not be used as one.

#### Neutral — the board's own material (fixed, never themed)

- **Bottle Enamel** (`--brd-enamel: #1B2721`), **Lit Enamel**
  (`--brd-enamel-lit: #26342C`), **Deep Enamel** (`--brd-enamel-deep: #121B16`),
  **Routed Groove** (`--brd-groove: #070C09`): the board field, its top-lit crown, its
  shaded foot, and the channel a plate rides in.
- **Brushed Aluminium** (`--brd-alu: #7F8C84`), **Aluminium Highlight**
  (`--brd-alu-hi: #C6D1C8`), **Aluminium Shadow** (`--brd-alu-lo: #3D4741`): edge
  banding, bezels, lamp housings, screw heads, ghost-button stroke, scrollbar thumb.
- **Bone Laminate** (`--brd-plate: #D6CFBB`) with edge `#EFE9D9` and shade `#A8A18E`,
  engraved in **Legend Black** (`--brd-legend: #141815`): the name plates.
- **Board Ink** (`--brd-ink: #EDE6D8`, dim `#9DACA1`, faint `#8B998F`): type on enamel.
- **Hairlines** (`--brd-rule: rgb(199 214 203 / 0.13)`, strong `/ 0.24`).

#### Neutral — the wall (the one themed layer)

- **Light wall**: `--brd-wall: #EFECE2` with ink `#1B211D` / dim `#4A574F` /
  faint `#5E6B63`, lamp ink `#8A5410`.
- **Dark wall**: `--brd-wall: #080B09` with ink `#EDE6D8` / dim `#9DACA1` /
  faint `#8B998F`, lamp ink `#FFB44A`.

#### Named Rules

**The One Light Rule.** Amber and green are lamp states, not a palette. No surface,
border, illustration or decoration on this route may carry chroma that is not light
coming from a lamp.

**The Two Families Rule.** `--brd-ink*` is the board's fixed ink and never changes with
the theme. `--brd-fg*` is *ink on the current surface*, and it is redefined per surface:
`html:has(.wd-board-page)` sets it to wall ink and flips it under `.dark`;
`.wd-board`, `.wd-board-window`, `.wd-board-rail` re-point it at `--brd-ink*`;
`.wd-board-paper` re-points it at its own darker paper ink (`#23291F` / `#39413B` /
`#545D56`). This is the single most important rule in the system. A new component
writes `var(--brd-fg)` and inherits the right ink automatically. Writing `--brd-ink`
directly on a wall-level element, or `--brd-fg` on a surface that has not declared its
own, is the one way to break the world.

**The Board Does Not Theme Rule.** Adding a new board surface means declaring its ink
family, not adding a `.dark` variant. `.dark` may only change the wall.

### Typography

**Signage Font:** Archivo Variable (`--font-board`, `next/font/google`, `wdth` axis
loaded), falling back to `ui-sans-serif, system-ui, sans-serif`.

**Character:** one engraved signage face doing every job. The weight axis carries
emphasis; the **width axis carries the register** — a name plate is a name plate because
its letters are narrowed like a routed legend. `font-synthesis-weight: none` on the page
root: if a weight is not real, it is not drawn.

#### Hierarchy

- **Display** (`.wd-board-display` — 760 weight, `font-stretch: 94%`,
  `clamp(2.35rem, 6vw, 4.5rem)`, line-height 0.99, tracking -0.033em, balanced):
  the single page headline.
- **Head** (`.wd-board-head` — 720 weight, `font-stretch: 96%`,
  `clamp(1.6rem, 3.2vw, 2.4rem)`, line-height 1.08, tracking -0.024em): section
  headings.
- **Body** (`.wd-board-body` — 17px / 1.0625rem, line-height 1.62, `--brd-fg-dim`,
  `max-width: 68ch`): all prose. Individual blocks tighten to 58ch or 34ch where the
  column is narrower.
- **Plate legend** (`.wd-board-plate` — 680 weight, `font-stretch: 90%`, 15px,
  tracking +0.008em): engraved names on laminate.
- **Legend** (`.wd-board-legend` — 640 weight, `font-stretch: 86%`, 11px, tracking
  +0.17em, uppercase, `--brd-fg-faint`): column headers, lamp-key state names, spec
  labels, nav links, the honest-terms line. `.wd-board-legend-strong` raises it to
  `--brd-fg` for the one value that matters in a pair.
- **Ledger** (`.wd-board-ledger` — 500 weight, 12.5px, line-height 1.75,
  `font-variant-numeric: tabular-nums`): the paper strip, time-on readouts, footer,
  photo caption.

#### Named Rules

**The Width-Axis Register Rule.** Register is set with `font-stretch`, not with a second
family and not with a size bump: 94% display, 96% head, 90% plate, 86% legend. A new
role picks a width on that ramp or it does not belong to the board.

**The Legend Is A Label Rule.** The uppercase letterspaced signage voice names a thing
that exists — a column, a state, a spec field, a destination. It is never set above a
headline as a kicker or eyebrow, and never used for a sentence.

**The Readout Rule.** Any number that changes over time (time-on, ledger timestamps,
counts) is set in tabular numerals so the column does not twitch.

### Layout

One centred column, `max-width: 80rem`, gutters `1.25rem` rising to `2rem` at `sm`.
Sections carry `4rem` vertical padding, `6rem` at `lg`. Anchored sections declare
`scroll-margin-top: 5.5rem` so the fixed rail never covers a heading.

The hero is two columns at `lg`: reading column `minmax(0, 0.95fr)` against board
`minmax(0, 1.2fr)` — the board takes the largest share the reading column can spare
without breaking the body measure. Other two-column sections use `1fr / 0.78fr`
(screenshot caption) and `1fr / 1.05fr` (status spec). Everything collapses to one
column below `lg`; the board itself never reflows internally, it only scales.

Rhythm inside a board is tight and mechanical: `7px` between station channels, `5px`
channel padding, `1.375rem` lamp, `9px` screw. Rhythm outside a board is editorial:
`mt-5` after a head, `mt-9` before the button, `mt-12` before a board.

### Elevation & Depth

Depth here is **built, not faked**. Four real layers, in this order, on every board:

1. **Routed channel inset** — the groove is cut into the field
   (`0 3px 5px rgb(0 0 0 / 0.7) inset` plus a hairline bottom lip).
2. **Seated plate** — the laminate sits *in* the groove with a lit top edge, a dark
   bottom edge and its own cast shadow.
3. **Pooled lamplight** — `.wd-board-pool`, a radial wash of the lamp's own colour
   thrown onto the enamel behind a lit station, at 16% amber or 13% green.
4. **Spill onto the wall** — the board's shadow stack ends with
   `0 12px 58px -14px var(--brd-spill-glow)`, warm light thrown onto the wall *in the
   board's own silhouette*, plus `.wd-board-mount::before`, a soft ambient bloom behind
   the whole object.

#### Shadow Vocabulary

- **Board hang** (`0 1px 0 rgb(255 255 255 / .07) inset, 0 -1px 0 rgb(0 0 0 / .5) inset,
  0 2px 4px rgb(0 0 0 / .3), 0 18px 40px -12px var(--brd-cast),
  0 42px 90px -28px var(--brd-cast), 0 12px 58px -14px var(--brd-spill-glow)`): the only
  way a board meets the wall. Two cast-shadow distances plus the light spill.
- **Channel** (inset, above): any recess.
- **Plate seat** (`0 1px 0 rgb(255 255 255 / .9) inset, 0 -1px 0 rgb(0 0 0 / .22) inset,
  0 2px 3px rgb(0 0 0 / .42), 0 6px 12px -4px rgb(0 0 0 / .4)`): anything sitting in a
  channel.
- **Pushbutton travel** (`0 3px 0 var(--brd-lamp-deep)` at rest → `0 0 0` plus
  `translateY(3px)` on `:active`): the button's body has height and the press spends it.
- **Window bezel** (`0 0 0 1px var(--brd-alu-lo), 0 0 0 8px var(--brd-enamel),
  0 0 0 9px rgb(0 0 0 / .5), 0 3px 6px rgb(0 0 0 / .4) inset,
  0 24px 50px -18px rgb(0 0 0 / .7)`): a cut-out in the enamel, not a framed picture.

#### Named Rules

**The Two-Sided Edge Rule.** Every raised or recessed element carries a lit edge and a
shaded edge from the same light — a `rgb(255 255 255 / x) inset` on the side facing the
lamp and a black inset on the far side. A single flat shadow is not depth here.

**The Light Reaches The Wall Rule.** A lit board throws light, not just shadow. Any new
board-class surface carries `--brd-spill-glow` in its shadow stack or it looks pasted on.

### Shapes

Machined, not soft. Radii are small and fixed, and they shrink as the part gets smaller:
board `6px`, inspection window `5px`, routed channel `4px`, name plate `3px`,
pushbutton `7px`, focus ring `2px`, profile menu `8px`. Lamps, screws and avatars are
full circles (`50%`). Nothing on this surface uses the app's soft 12–16px furniture radii.

The board silhouette is a rectangle with a 1px aluminium border plus a 1px black outline
(`.wd-board-frame`) and a 2px brushed band inset `7px` from each side at top and bottom —
the top band lit, the bottom band the shadowed return at 40% opacity. Enamel and paper
both carry a real 160px noise tile (`/assets/board-grain.png`, `mix-blend-mode: overlay`,
0.85 opacity) so the field is a surface rather than a fill.

**Recorded caveat — the aluminium band.** The band is drawn with three repeating
gradients at 3px, 7px and 13px periods. They are *not* effectively incommensurate:
measurement shows a dominant 21px repeat, and the 13px layer is inert at this scale.
It reads as brushed metal only because the band is 2px tall at roughly 9% modulation.
Anyone changing that band's height or contrast must re-derive the periods rather than
trusting the three-layer premise.

### Components

#### Panel-mount pushbutton (`.wd-board-button`)

The primary control, and the only amber object that is not a lamp.

- **Shape:** softly machined corners (7px), padding `0.9375rem 1.75rem`.
- **Colour:** amber gradient (`#FFD489 → --brd-lamp 38% → #E9942F`) with legend-dark ink
  (`#21160A`), 700 weight at 92% width.
- **Hover:** `brightness(1.06)`, cast and amber bloom both grow.
- **Active:** travels down 3px and spends its seated edge.
- **Motion:** 120ms `cubic-bezier(0.2, 0.8, 0.25, 1)`.

#### Aluminium ghost control (`.wd-board-button-ghost`)

The secondary action is hardware, not a second lamp: dark enamel gradient
(`#273028 → #1A221D`), 1px `--brd-alu-lo` stroke, board ink, 660 weight at 92% width.
Hover brightens the stroke to `--brd-alu`; active travels 1px.

#### Board (`.wd-board` + `.wd-board-frame` inside `.wd-board-mount`)

The container primitive. Three instances ship: the crew board, the lamp key, the status
plate. Always `.wd-board-mount` (ambient bloom) wrapping `.wd-board overflow-hidden`
with a `.wd-board-frame` span as its first child. Header rail = a
`border-b border-[var(--brd-rule-strong)]` row with a `.wd-board-screw` at each outer
corner and a `.wd-board-legend` label. Internal dividers are `--brd-rule`.

#### Station row (`.wd-board-station` / `-channel` / `-plate` / `-lamp` / `-pool`)

The signature component. A routed channel holds a bone plate (with a drilled hole at its
left edge), a lamp, and a tabular time-on readout, over a lamplight pool. A plate with
`data-state="out"` keeps the same laminate form in a cooler grey and sits lower. Lamp
state is carried by `data-lamp="on|around|off"` and is always duplicated in an `sr-only`
phrase — the colour is never the only carrier.

#### Paper ledger strip (`.wd-board-paper`)

Bone stock clipped to the bottom of the board, its own ink family, a hard top shadow
line and the same grain tile. Carries tonight's arrivals as honest chrome.

#### Inspection window (`.wd-board-window`)

The product screenshot is a cut-out in the enamel with an aluminium bezel and an enamel
return — never a mock browser chrome, never a floating card.

#### Navigation (`.wd-board-rail`)

Fixed 64px rail, enamel gradient with a lit top inset and a hard bottom edge; it declares
board ink so its contents read as part of the hardware. Links are legends; signed-in CTA
is `--brd-lamp-ink`. Theme toggle is a 32px circle on a `--brd-hairline` stroke. Mobile
drawer is the same rail surface, full-screen.

#### Browser surfaces

Themed, not defaulted: `::selection` is amber on `#1A1206`, caret is amber, the scrollbar
is an aluminium thumb on deep enamel with a 3px enamel border, `:focus-visible` is a 2px
amber outline at 3px offset with a 2px radius, and links use
`text-underline-offset: 0.22em` with `text-decoration-thickness: from-font`.

### Motion

**One authored moment, on first paint.** `wd-board-seat` slides each plate home in its
channel (`translateX(-9%) → 0`, 760ms `cubic-bezier(0.16, 1, 0.3, 1)`) and `wd-lamp-warm`
brings each lamp up on a filament curve (920ms `cubic-bezier(0.32, 0, 0.18, 1)`:
brightness 0.2 → 0.62 → 0.44 → 1, a surge and a dip, not a cross-fade). Both stagger off
a single per-row delay, `220ms + index × 110ms`, exposed to CSS as `--lamp-delay`. Lamps
are lit one animation frame after mount so the visitor sees the board switch on.

**The Never From Zero Rule.** The plate animation moves position only. Opacity is never
animated from 0: the name is legible in the first frame, with or without motion. Under
`prefers-reduced-motion: reduce`, both keyframe animations are set to `none` and the
button, lamp and pool transitions collapse to 1ms — the board simply starts lit.

### Do's and Don'ts

#### Do:

- **Do** write `var(--brd-fg)` / `--brd-fg-dim` / `--brd-fg-faint` for text and let the
  surface decide the ink, and **do** declare the full `--brd-fg*` + `--brd-hairline` +
  `--brd-lamp-ink` set on any new board-class surface.
- **Do** build depth from a lit edge, a shaded edge and a real cast — `.wd-board-mount`
  wrapping `.wd-board` with `.wd-board-frame` is the whole pattern.
- **Do** set register with `font-stretch` on the 86/90/94/96% ramp.
- **Do** keep every board radius in the 3–7px machined range and every circle a real
  circle.
- **Do** duplicate any lamp state in text for screen readers and keep every readout in
  tabular numerals.
- **Do** gate any new motion on `prefers-reduced-motion` and animate from an
  already-legible state.

#### Don't:

- **Don't** add a `.dark` variant to the board. Only the wall themes.
- **Don't** introduce a third lamp colour or any chroma that is not lamplight — no brand
  purple, no den amber from `--wd-*`, no status palette.
- **Don't** use the uppercase legend voice as a kicker or eyebrow above a heading, and
  don't set a sentence in it.
- **Don't** put `--brd-*` tokens inside `/app` or `--wd-*` tokens on `/`.
- **Don't** replace a built layer with a blur — no accent blobs, no backdrop-filter
  glass, no blurred gradient behind the board. The spill glow is the board's own
  silhouette and nothing else fills that role.
- **Don't** wrap the product screenshot in mock browser chrome or a floating card; it is
  a cut-out in the enamel.
- **Don't** add a second type family. Archivo's width axis is the second family.
