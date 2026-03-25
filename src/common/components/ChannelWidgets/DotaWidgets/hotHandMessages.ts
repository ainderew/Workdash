/**
 * Banter-style message templates for hot/cold streaks and clutch/choke.
 * {name} is replaced with the player's display name.
 * {score} is replaced with the hot hand score.
 * {slot} is replaced with the time slot name.
 * {day} is replaced with the day of week.
 * {wr} is replaced with win rate %.
 */

export const HOT_HAND_MESSAGES: Record<string, string[]> = {
  "ON FIRE": [
    "{name} is COOKING right now — don't queue without them",
    "Everything {name} touches turns to MMR gold",
    "{name} is in the zone. Pure, unstoppable heat",
    "Get on {name}'s team while the streak lasts",
  ],
  "ICE COLD": [
    "{name} is frozen solid. Maybe tomorrow's their day",
    "Somebody thaw out {name} — they're glacial right now",
    "{name} is colder than the Frostivus map right now",
    "Don't queue with {name} unless you like losing",
  ],
};

export const CLUTCH_MESSAGES: Record<string, string[]> = {
  "Clutch Gene": [
    "{name} performs BETTER when it matters — built different",
    "When the game gets tight, {name} turns it on",
    "{name} has ice in their veins in close games",
  ],
  "Choke Artist": [
    "{name} crumbles when the pressure's on... certified choker",
    "Close game? {name} has already mentally checked out",
    "{name} plays worse the more the game matters. Tragic",
  ],
};

export const TIME_PATTERN_MESSAGES: string[] = [
  "{name}'s secret weapon: playing on {day} ({wr}% WR). Their kryptonite: {worstDay}",
  "{name} should ONLY play during {slot} — {wr}% win rate speaks for itself",
  "Note to {name}: stop queueing at {worstSlot}. You're literally griefing yourself",
  "{name} peaks during {slot} and faceplants during {worstSlot}",
];

export function pickHotHandMessage(
  label: string,
  dotaAccountId: number,
): string {
  const templates = HOT_HAND_MESSAGES[label] ?? [];
  if (templates.length === 0) return "";
  const index = Math.abs(dotaAccountId * 31) % templates.length;
  return templates[index]!;
}

export function pickClutchMessage(
  label: string,
  dotaAccountId: number,
): string {
  const templates = CLUTCH_MESSAGES[label] ?? [];
  if (templates.length === 0) return "";
  const index = Math.abs(dotaAccountId * 31) % templates.length;
  return templates[index]!;
}

export function pickTimePatternMessage(dotaAccountId: number): string {
  const index = Math.abs(dotaAccountId * 31) % TIME_PATTERN_MESSAGES.length;
  return TIME_PATTERN_MESSAGES[index]!;
}
