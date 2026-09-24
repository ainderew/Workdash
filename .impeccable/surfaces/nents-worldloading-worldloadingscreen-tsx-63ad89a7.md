---
version: 1
slug: "nents-worldloading-worldloadingscreen-tsx-63ad89a7"
primary_target: "src/common/components/WorldLoading/WorldLoadingScreen.tsx"
related_targets: ["src/game/scenes/Preloader.ts"]
---

# World loading screen

Scope: the overlay shown while world mode loads (first entry: Phaser boot + asset preload + MainMap build) and, briefly, when switching from desk back to world. Mode: Operate (a wait state inside the app). Extends the established den / "Lamplight" boot splash; no new visual world.

Audience & job: friends arriving in the world. They need to know it is loading, roughly how far along, and that it is their place. Constraint: must never block once the scene is ready; real loader progress only; no presence line (user declined).

Decisions: map lighting up (user choice); desk→world switch gets a short all-lit version (user choice).

## Direction contract

THESIS: Arriving is watching your own world warm up: a dim miniature of the real map where lamps come on place by place as the world loads. Refuses the centered bar on a flat color field.

OWN-WORLD: The Lamplight room: warm near-black radial ground, accent-derived amber light, cream ink, grain, vignette, drifting motes. The map is a darkened pixel-art tabletop model; amber lamp points with soft halos; small cream place names; the splash's comet rail.

STORY: See your world's layout, watch office, park, pond, café, pitch and campfire light up in turn, read the status line, then drop into the live world.

FIRST VIEWPORT: Centered tilted map model filling most of the width (bounded by height), lamps at each place's true position; status line and comet rail centered beneath. Nothing above the model.

FORM: Extension of the incumbent Lamplight splash; no concept-seed (local addition inherits the surface). Signature interaction: lamps ignite on real load thresholds, each revealing its area in color; on ready the model flattens and zooms toward the player, fading into the live canvas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
