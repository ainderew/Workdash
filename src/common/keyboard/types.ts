export type ModifierKey = 'mod' | 'meta' | 'ctrl' | 'alt' | 'shift';

export interface KeyboardShortcut {
  id: string;
  label: string;
  /** The `KeyboardEvent.key` value to match (case-insensitive). */
  key: string;
  /** Base modifier keys required for this shortcut. */
  modifiers?: ModifierKey[];
  /**
   * Platform-specific modifier overrides.
   * When set, these take precedence over `modifiers` on the matching platform.
   * Use when Mac and Windows need entirely different modifiers (e.g. Cmd vs Alt).
   */
  platformOverrides?: {
    mac?: ModifierKey[];
    other?: ModifierKey[];
  };
  /** Skip this shortcut when focused on INPUT/TEXTAREA/contentEditable. Default: `true`. */
  ignoreWhenTyping?: boolean;
  /** Guard — shortcut only fires when this returns `true`. */
  when?: () => boolean;
  handler: (event: KeyboardEvent) => void;
  /** Call `event.preventDefault()` on match. Default: `true`. */
  preventDefault?: boolean;
  /** Call `event.stopPropagation()` on match. Default: `false`. */
  stopPropagation?: boolean;
}
