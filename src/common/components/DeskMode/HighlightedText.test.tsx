import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import HighlightedText from './HighlightedText';

describe('HighlightedText', () => {
  it('wraps each matched token in a <mark>', () => {
    const { getByText } = render(
      <HighlightedText text="the deploy is green" query="deploy green" />,
    );
    expect(getByText('deploy').tagName).toBe('MARK');
    expect(getByText('green').tagName).toBe('MARK');
  });

  it('renders no <mark> elements for an empty query', () => {
    const { container } = render(
      <HighlightedText text="the deploy is green" query="" />,
    );
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('the deploy is green');
  });

  it('renders no <mark> elements when nothing matches', () => {
    const { container } = render(
      <HighlightedText text="all clear" query="deploy" />,
    );
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('all clear');
  });

  it('does not throw on regex-special queries and matches literally', () => {
    const { getByText } = render(
      <HighlightedText text="value is c++ today" query="c++" />,
    );
    expect(getByText('c++').tagName).toBe('MARK');
  });

  it('applies className to a wrapping span when provided', () => {
    const { container } = render(
      <HighlightedText text="hi" query="" className="custom" />,
    );
    expect(container.querySelector('span.custom')?.textContent).toBe('hi');
  });
});
