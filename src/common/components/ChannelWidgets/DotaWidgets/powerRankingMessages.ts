/**
 * Banter-style message templates for weekly power rankings.
 * {name} is replaced with the player's display name.
 * {rank} is replaced with the player's rank position.
 * {score} is replaced with the impact score.
 * {delta} is replaced with the rank change amount.
 */

export const FIRST_PLACE_MESSAGES: string[] = [
  "Bow down to {name}, the undisputed champion this week",
  "{name} sits on the throne. All others are mere peasants",
  "Nobody could touch {name} this week — absolute dominance",
  "{name} is running the show. Everyone else is just along for the ride",
  "This is {name}'s world, you're just feeding in it",
  "{name} hit different this week. Respect the crown",
  "Clear eyes, full MMR — {name} reigns supreme",
  "The gap between {name} and the rest? Embarrassing",
];

export const LAST_PLACE_MESSAGES: string[] = [
  "{name} is bringing up the rear... someone get them a coach",
  "Last place for {name}. Bold strategy, let's see if it pays off next week",
  "{name} finished dead last. At least they're consistent?",
  "Rough week for {name}. Rock bottom is a solid foundation to build on",
  "{name} is in the shadow realm this week. Time to grind",
  "Someone pour one out for {name} — last place hits different",
  "{name} is just sandbagging for the comeback arc. Right? ...Right?",
  "The only way is up for {name}. Can't get any worse than this",
];

export const MOST_IMPROVED_MESSAGES: string[] = [
  "{name} leveled up this week — climbed {delta} spots!",
  "Training arc complete: {name} moved up {delta} ranks",
  "{name} heard y'all talking and answered with a {delta}-rank jump",
  "Main character energy from {name} — up {delta} this week",
  "{name} went sicko mode and climbed {delta} ranks",
  "Somebody gave {name} a Hyperbolic Time Chamber — up {delta} spots",
];

export const BIGGEST_DROP_MESSAGES: string[] = [
  "{name} fell {delta} spots... the mighty have fallen",
  "{name} dropped {delta} ranks. Were they even trying?",
  "Freefall for {name} — down {delta} positions this week",
  "{name} took the express elevator down {delta} floors",
];

export function pickRankingMessage(
  category: "first" | "last" | "improved" | "drop",
  dotaAccountId: number,
  weekSeed: number,
): string {
  const templates =
    category === "first"
      ? FIRST_PLACE_MESSAGES
      : category === "last"
        ? LAST_PLACE_MESSAGES
        : category === "improved"
          ? MOST_IMPROVED_MESSAGES
          : BIGGEST_DROP_MESSAGES;

  const index = Math.abs(
    (dotaAccountId * 31 + weekSeed * 17) % templates.length,
  );
  return templates[index]!;
}
