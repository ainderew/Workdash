import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AwardTag from './AwardTag';

describe('AwardTag', () => {
  it('renders MVP tag with label', () => {
    render(<AwardTag type="MVP" label="MVP" />);
    expect(screen.getByText('MVP')).toBeInTheDocument();
  });

  it('renders Rising tag with label', () => {
    render(<AwardTag type="RISING" label="Rising" />);
    expect(screen.getByText('Rising')).toBeInTheDocument();
  });

  it('renders Best Winrate tag with label', () => {
    render(<AwardTag type="BEST_WINRATE" label="Top WR" />);
    expect(screen.getByText('Top WR')).toBeInTheDocument();
  });

  it('renders Hot Hand tag with label', () => {
    render(<AwardTag type="HOT_HAND" label="Hot Hand" />);
    expect(screen.getByText('Hot Hand')).toBeInTheDocument();
  });

  it('renders unknown award type with derived slug (no crash)', () => {
    // @ts-expect-error — testing runtime safety
    const { container } = render(<AwardTag type="UNKNOWN" label="?" />);
    const tag = container.querySelector('[data-award="unknown"]');
    expect(tag).toBeInTheDocument();
  });

  it.each([
    ['MVP', 'mvp'],
    ['RISING', 'rising'],
    ['BEST_WINRATE', 'best-winrate'],
    ['HOT_HAND', 'hot-hand'],
  ] as const)(
    'derives data-award slug "%s" → "%s"',
    (type, expectedSlug) => {
      render(<AwardTag type={type} label={type} />);
      const tag = screen.getByText(type).closest('span');
      expect(tag).toHaveAttribute('data-award', expectedSlug);
    },
  );

  it('applies xs size classes when size=xs', () => {
    render(<AwardTag type="MVP" label="MVP" size="xs" />);
    const tag = screen.getByText('MVP').closest('span');
    expect(tag?.className).toContain('text-[9px]');
  });

  it('applies sm size classes by default', () => {
    render(<AwardTag type="MVP" label="MVP" />);
    const tag = screen.getByText('MVP').closest('span');
    expect(tag?.className).toContain('text-[11px]');
  });

  it('renders icon span with aria-hidden=true', () => {
    const { container } = render(<AwardTag type="MVP" label="MVP" />);
    const iconSpan = container.querySelector('[aria-hidden="true"]');
    expect(iconSpan).toBeInTheDocument();
  });

  it('applies size-2.5 class for xs icon', () => {
    const { container } = render(<AwardTag type="MVP" label="MVP" size="xs" />);
    const iconSpan = container.querySelector('[aria-hidden="true"]');
    expect(iconSpan?.className).toContain('size-2.5');
  });

  it('applies size-3 class for sm icon', () => {
    const { container } = render(<AwardTag type="MVP" label="MVP" size="sm" />);
    const iconSpan = container.querySelector('[aria-hidden="true"]');
    expect(iconSpan?.className).toContain('size-3');
  });
});
