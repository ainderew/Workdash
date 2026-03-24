/**
 * Banter-style message templates for tilt detection and comfort pick roasting.
 * {name} is replaced with the player's display name.
 * {streak} is replaced with the loss streak count.
 * {hero} is replaced with the hero name (comfort picks only).
 * {wr} is replaced with win rate % (comfort picks only).
 * {games} is replaced with games played (comfort picks only).
 */

export const TILT_MESSAGES: Record<
  "warning" | "danger" | "critical",
  string[]
> = {
  warning: [
    "{name} has dropped {streak} in a row... might wanna take a breather",
    "{name} is on a {streak} game skid. Time for a turbo palate cleanser?",
    "Someone check on {name} — {streak}L streak and counting",
    "{name} lost {streak} straight. The MMR gods are not pleased",
    "Rough patch for {name}... {streak} losses. We've all been there",
    "{name} is {streak} deep. Might be time to switch roles",
    "{name} just casually donating {streak} games worth of MMR",
    "Plot twist: {name} has lost {streak} in a row. Nobody saw that coming",
  ],
  danger: [
    "{name} has lost {streak} games. Someone take their mouse away",
    "{name} is {streak} losses deep — this is no longer a bad day, it's a lifestyle",
    "Breaking: {name} speedrunning MMR loss with a {streak} game streak",
    "{name} lost {streak} in a row. Uninstall jokes aside... maybe unranked?",
    "Alert: {name} is down {streak} games. We're entering tilt territory",
    "{name} has {streak} straight losses. Even their teammates are concerned",
    "At {streak} losses, {name} should legally be required to play bots",
    "{name} dropped {streak} straight. The real enemy was queue anxiety all along",
  ],
  critical: [
    "{name} has lost {streak} GAMES STRAIGHT. This is not a drill. Touch grass immediately",
    "DEFCON 1: {name} is {streak} losses deep. Someone physically remove them from their PC",
    "{name} lost {streak} in a row. At this point it's performance art",
    "Genuinely worried about {name} — {streak} loss streak. Is everything ok at home?",
    "{name} has lost {streak} consecutive games. The Geneva Convention prohibits this",
    "{name} is down {streak} games. This isn't tilting, this is geological erosion",
    "Emergency intervention needed: {name} has dropped {streak} straight. Dota is not the answer right now",
    "HOW is {name} still queueing after {streak} losses?? The dedication is... concerning",
  ],
};

export const COMFORT_PICK_ROASTS: string[] = [
  "{name} is {wr}% on {hero} across {games} games... maybe try a different hero?",
  "{hero} is NOT it for {name}. {wr}% in {games} games tells the whole story",
  "Somebody tell {name} that {hero} doesn't love them back ({wr}% WR)",
  "{name} keeps picking {hero} despite {wr}% over {games} games. Definition of insanity",
  "{name}'s {hero}: {games} games, {wr}% win rate. Sometimes you gotta let go",
  "{hero} griefing {name}'s MMR — {wr}% across {games} games",
  "Hot take: {name} should never pick {hero} again ({wr}% in {games}g)",
  "{name} losing {games} games on {hero} at {wr}% is a cry for help",
];

/**
 * Deterministically select a message template based on player ID and context.
 * Same player + same context always gets the same message (stable across re-renders).
 */
export function pickTiltMessage(
  severity: "warning" | "danger" | "critical",
  dotaAccountId: number,
  lossStreak: number,
): string {
  const templates = TILT_MESSAGES[severity];
  const index = Math.abs(
    (dotaAccountId * 31 + lossStreak * 17) % templates.length,
  );
  return templates[index]!;
}

export function pickComfortRoast(
  dotaAccountId: number,
  heroId: number,
): string {
  const index = Math.abs(
    (dotaAccountId * 31 + heroId * 13) % COMFORT_PICK_ROASTS.length,
  );
  return COMFORT_PICK_ROASTS[index]!;
}

/**
 * Interpolate template variables into a message string.
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replaceAll(`{${key}}`, String(val)),
    template,
  );
}
