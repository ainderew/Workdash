import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./platform', () => ({ isMac: true }));

import { matchShortcut } from './shortcutRegistry';

function focusTextarea(): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);
  textarea.focus();
  return textarea;
}

describe('matchShortcut while typing', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('still switches modes with Cmd+D from a focused text field', () => {
    focusTextarea();
    const event = new KeyboardEvent('keydown', { key: 'd', metaKey: true });

    expect(matchShortcut(event)?.id).toBe('toggle-interaction-mode');
  });

  it('leaves other shortcuts to the text field', () => {
    focusTextarea();
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

    expect(matchShortcut(event)).toBeUndefined();
  });
});
