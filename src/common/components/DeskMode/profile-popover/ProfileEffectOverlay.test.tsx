import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProfileEffectOverlay } from './ProfileEffectOverlay';

describe('ProfileEffectOverlay', () => {
  it('renders nothing for missing, "none", or unknown effects', () => {
    const { container, rerender } = render(
      <ProfileEffectOverlay effect={null} />,
    );
    expect(container.querySelector('.wd-profile-fx')).toBeNull();

    rerender(<ProfileEffectOverlay effect="none" />);
    expect(container.querySelector('.wd-profile-fx')).toBeNull();

    rerender(<ProfileEffectOverlay effect="not-a-real-effect" />);
    expect(container.querySelector('.wd-profile-fx')).toBeNull();
  });

  it('renders the effect layer with particles for a known effect', () => {
    const { container } = render(<ProfileEffectOverlay effect="embers" />);
    const layer = container.querySelector('.wd-profile-fx');

    expect(layer).not.toBeNull();
    expect(layer?.getAttribute('data-fx')).toBe('embers');
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    expect(layer?.querySelectorAll('span').length).toBe(10);
  });
});
