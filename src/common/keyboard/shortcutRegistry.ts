import useUiStore from '@/common/store/uiStore';
import { isMac } from './platform';
import type { KeyboardShortcut, ModifierKey } from './types';

export const shortcuts: KeyboardShortcut[] = [
  {
    id: 'toggle-interaction-mode',
    label: 'Toggle Desk/World mode',
    key: 'd',
    platformOverrides: { mac: ['meta'], other: ['alt'] },
    handler: () => {
      useUiStore.getState().toggleInteractionMode();
    },
  },
  {
    id: 'open-command-palette',
    label: 'Open Command Palette',
    key: 'Enter',
    modifiers: ['shift'],
    when: () => !useUiStore.getState().isCommandPaletteOpen,
    stopPropagation: true,
    handler: () => {
      useUiStore.getState().openCommandPalette();
    },
  },
];

function isTypingTarget(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return (element as HTMLElement).isContentEditable === true;
}

function resolveModifiers(shortcut: KeyboardShortcut): ModifierKey[] {
  if (shortcut.platformOverrides) {
    const overrides = isMac
      ? shortcut.platformOverrides.mac
      : shortcut.platformOverrides.other;
    if (overrides) return overrides;
  }
  return shortcut.modifiers ?? [];
}

function modifiersMatch(
  event: KeyboardEvent,
  required: ModifierKey[],
): boolean {
  const needs = {
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
  };

  for (const mod of required) {
    if (mod === 'mod') {
      if (isMac) needs.meta = true;
      else needs.ctrl = true;
    } else {
      needs[mod] = true;
    }
  }

  return (
    event.metaKey === needs.meta &&
    event.ctrlKey === needs.ctrl &&
    event.altKey === needs.alt &&
    event.shiftKey === needs.shift
  );
}

export function matchShortcut(
  event: KeyboardEvent,
): KeyboardShortcut | undefined {
  for (const shortcut of shortcuts) {
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

    const required = resolveModifiers(shortcut);
    if (!modifiersMatch(event, required)) continue;

    const ignoreTyping = shortcut.ignoreWhenTyping ?? true;
    if (ignoreTyping && isTypingTarget(document.activeElement)) continue;

    if (shortcut.when && !shortcut.when()) continue;

    return shortcut;
  }

  return undefined;
}
