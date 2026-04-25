/**
 * Custom emoji token format: <:name:uuid>
 */
const CUSTOM_EMOJI_PATTERN = '<:[a-z0-9_]{2,32}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}>';

/**
 * Unicode emoji pattern covering most common emoji ranges:
 * - Emoticons, dingbats, symbols, flags, skin tone modifiers
 * - Variation selectors and zero-width joiners for composite emoji
 */
export const UNICODE_EMOJI_PATTERN =
  '(?:' +
  '[\\u{1F600}-\\u{1F64F}]' + // Emoticons
  '|[\\u{1F300}-\\u{1F5FF}]' + // Misc symbols & pictographs
  '|[\\u{1F680}-\\u{1F6FF}]' + // Transport & map
  '|[\\u{1F1E0}-\\u{1F1FF}]' + // Flags
  '|[\\u{2600}-\\u{26FF}]' + // Misc symbols
  '|[\\u{2700}-\\u{27BF}]' + // Dingbats
  '|[\\u{FE00}-\\u{FE0F}]' + // Variation selectors
  '|[\\u{1F900}-\\u{1F9FF}]' + // Supplemental symbols
  '|[\\u{1FA00}-\\u{1FA6F}]' + // Chess symbols
  '|[\\u{1FA70}-\\u{1FAFF}]' + // Symbols extended-A
  '|[\\u{200D}]' + // ZWJ
  '|[\\u{20E3}]' + // Combining enclosing keycap
  '|[\\u{FE0F}]' + // Variation selector-16
  '|[\\u{E0020}-\\u{E007F}]' + // Tags
  '|[\\u{23E9}-\\u{23F3}]' + // Misc technical
  '|[\\u{23F8}-\\u{23FA}]' +
  '|[\\u{25AA}-\\u{25AB}]' +
  '|[\\u{25B6}]' +
  '|[\\u{25C0}]' +
  '|[\\u{25FB}-\\u{25FE}]' +
  '|[\\u{2934}-\\u{2935}]' +
  '|[\\u{2B05}-\\u{2B07}]' +
  '|[\\u{2B1B}-\\u{2B1C}]' +
  '|[\\u{2B50}]' +
  '|[\\u{2B55}]' +
  '|[\\u{3030}]' +
  '|[\\u{303D}]' +
  '|[\\u{3297}]' +
  '|[\\u{3299}]' +
  '|[\\u{00A9}]' + // ©
  '|[\\u{00AE}]' + // ®
  '|[\\u{203C}]' +
  '|[\\u{2049}]' +
  '|[\\u{2122}]' + // ™
  '|[\\u{2139}]' +
  '|[\\u{2194}-\\u{2199}]' +
  '|[\\u{21A9}-\\u{21AA}]' +
  '|[\\u{231A}-\\u{231B}]' +
  '|[\\u{2328}]' +
  '|[\\u{23CF}]' +
  '|[\\u{24C2}]' +
  '|[\\u{1F004}]' +
  '|[\\u{1F0CF}]' +
  '|[\\u{1F170}-\\u{1F171}]' +
  '|[\\u{1F17E}-\\u{1F17F}]' +
  '|[\\u{1F18E}]' +
  '|[\\u{1F191}-\\u{1F19A}]' +
  '|[\\u{1F1E6}-\\u{1F1FF}]' +
  '|[\\u{1F201}-\\u{1F202}]' +
  '|[\\u{1F21A}]' +
  '|[\\u{1F22F}]' +
  '|[\\u{1F232}-\\u{1F23A}]' +
  '|[\\u{1F250}-\\u{1F251}]' +
  '|[\\u{1F910}-\\u{1F96B}]' +
  '|[\\u{1F980}-\\u{1F9E0}]' +
  ')';

const EMOJI_ONLY_REGEX = new RegExp(
  `^(?:${CUSTOM_EMOJI_PATTERN}|${UNICODE_EMOJI_PATTERN}|\\s)+$`,
  'u',
);

/** Max number of emojis for the "emoji-only" enlarged rendering. */
const MAX_EMOJI_COUNT = 8;

/**
 * Returns true when `content` contains only emojis (native Unicode or custom)
 * and whitespace, with no more than MAX_EMOJI_COUNT emoji units.
 */
export function isEmojiOnly(content: string): boolean {
  if (!content || content.length > 200) return false;

  if (!EMOJI_ONLY_REGEX.test(content)) return false;

  // Count emoji units (custom emoji tokens + unicode emoji codepoints, ignoring modifiers)
  const customCount = (
    content.match(new RegExp(CUSTOM_EMOJI_PATTERN, 'g')) || []
  ).length;
  const withoutCustom = content.replace(
    new RegExp(CUSTOM_EMOJI_PATTERN, 'g'),
    '',
  );
  // Count unicode emoji (excluding ZWJ, variation selectors, skin tone modifiers)
  const unicodeCount = (
    withoutCustom.match(
      new RegExp(
        '[\\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\\u{1F6FF}]|[\\u{1F1E0}-\\u{1F1FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]|[\\u{1F900}-\\u{1F9FF}]|[\\u{1FA00}-\\u{1FA6F}]|[\\u{1FA70}-\\u{1FAFF}]',
        'gu',
      ),
    ) || []
  ).length;

  return customCount + unicodeCount > 0 && customCount + unicodeCount <= MAX_EMOJI_COUNT;
}
