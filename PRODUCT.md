# Workdash — Product Context

## Register

product — app UI (desk mode chat/calls + world mode 2D spaces). Design serves the product.

## What it is

A hangout platform that fuses Discord (channels, voice calls, threads) with Gather
(2D sprite world, proximity audio). The flagship real-world use: a friend group of
ex-coworkers who keep a voice call open while playing Dota 2 together at night.

## Target users

- Friend groups of gamers who live in a voice call between and during matches
- "Locked-in" software engineers co-working with ambient presence
- Small communities (≤ ~20 people) where everyone knows everyone — not mass servers

## Desired outcome

Opening Workdash at night should feel like walking into your friends' living room:
zero friction to join (one click into the Lounge), always aware of who's around,
never nagged when nobody is.

## Brand personality: Cozy gamer den

Warm woods and lamplight. The app is a den, not a dashboard:

- **Warm, tactile surfaces** — deep warm charcoals and browns over blue-grays
- **Amber lamplight accents** — glow signals life (a live call, a friend arriving)
- **Soft, generous radii** — furniture, not panels
- **Friendly, first-person copy** — "Brett's on the couch", "Sit down", "Not tonight"
- **Playfulness in moments, comfort in chrome** — emotes, soundboard, achievements
  bring the energy; the shell stays calm and warm

## Anti-references

- **Generic SaaS dashboard** — default shadcn gray-on-gray, Tailwind-template look
- Sterile enterprise chat (Teams) energy
- Notification-spam gamification — nudges are rare, warm, and snoozable by design

## Accessibility

Solid AA baseline: ≥4.5:1 body contrast, keyboard navigation, visible focus rings,
`prefers-reduced-motion` respected on all pulses/glows. Don't sacrifice the warm
palette's contrast for vibe — bump ink toward cream-white when in doubt.

## Strategic design principles

1. **Presence is the product.** Who's here, who's talking, who just arrived — always
   glanceable, never buried.
2. **One click to togetherness.** Joining friends must never take more than one action.
3. **Quiet by default, warm when alive.** Empty states are calm; live states glow.
4. **The chrome whispers, the moments sing.** Reactions, achievements, and the world
   carry personality; layout and typography stay restrained.
