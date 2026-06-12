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
