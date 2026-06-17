// Profile effects — cosmetic animations that play over a profile card when it
// opens. CSS-driven (see `.wd-profile-fx` in globals.css); the id is stored on
// the user's profile (ChatV2UserProfile.user.profileEffect).

export const PROFILE_EFFECTS = [
  { id: 'none', label: 'None', icon: '∅' },
  { id: 'embers', label: 'Embers', icon: '🔥' },
  { id: 'sparkles', label: 'Sparkles', icon: '✨' },
  { id: 'snow', label: 'Snow', icon: '❄️' },
  { id: 'confetti', label: 'Confetti', icon: '🎉' },
] as const;

export type ProfileEffectId = (typeof PROFILE_EFFECTS)[number]['id'];

const KNOWN_EFFECT_IDS = new Set<string>(PROFILE_EFFECTS.map((e) => e.id));

/** Returns the effect id if it's a known, renderable (non-"none") effect. */
export function resolveProfileEffect(
  value: string | null | undefined,
): ProfileEffectId | null {
  if (!value || value === 'none') return null;
  return KNOWN_EFFECT_IDS.has(value) ? (value as ProfileEffectId) : null;
}
