import React from 'react';
import { render, screen } from '@testing-library/react';
import MicLevelMeter from '../settings-primitives/MicLevelMeter';

describe('MicLevelMeter', () => {
  it('renders with zero level (no bars active)', () => {
    render(<MicLevelMeter level={0} isActive={true} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');

    // All 20 bars should use the unlit background class
    const bars = meter.querySelectorAll('div > div');
    expect(bars).toHaveLength(20);
    bars.forEach((bar) => {
      expect(bar.className).toContain('bg-[var(--wd-surface-elevated)]');
    });
  });

  it('renders mid-level with some bars active', () => {
    // level=50 -> activeBars = Math.round((50/100)*20) = 10
    render(<MicLevelMeter level={50} isActive={true} />);
    const meter = screen.getByRole('meter');
    const bars = meter.querySelectorAll('div > div');

    // First 10 bars should be lit (bars 0-9)
    // Bars 0-9: positions 0/20..9/20 = 0..0.45 => all < 0.5 => accent color
    for (let i = 0; i < 10; i++) {
      expect(bars[i].className).toContain('bg-[var(--wd-accent)]');
    }
    // Remaining bars should be unlit
    for (let i = 10; i < 20; i++) {
      expect(bars[i].className).toContain('bg-[var(--wd-surface-elevated)]');
    }
  });

  it('high level shows danger color', () => {
    // level=100 -> activeBars = 20, all lit
    render(<MicLevelMeter level={100} isActive={true} />);
    const meter = screen.getByRole('meter');
    const bars = meter.querySelectorAll('div > div');

    // Bar at position 17/20 = 0.85 -> danger threshold
    expect(bars[17].className).toContain('bg-[var(--wd-danger)]');
    // Bar at position 18/20 = 0.9 -> also danger
    expect(bars[18].className).toContain('bg-[var(--wd-danger)]');
    // Bar at position 10/20 = 0.5 -> mid (success)
    expect(bars[10].className).toContain('bg-[var(--wd-success)]');
  });

  it('inactive state shows no lit bars even with high level', () => {
    render(<MicLevelMeter level={100} isActive={false} />);
    const meter = screen.getByRole('meter');
    const bars = meter.querySelectorAll('div > div');

    bars.forEach((bar) => {
      expect(bar.className).toContain('bg-[var(--wd-surface-elevated)]');
    });
  });
});
