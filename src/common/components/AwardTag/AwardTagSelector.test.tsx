import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AwardTagSelector from './AwardTagSelector';
import type { AwardTagData } from '@/communication/chatV2/_types';

const mockAwards: AwardTagData[] = [
  { type: 'MVP', label: 'MVP' },
  { type: 'HOT_HAND', label: 'Hot Hand' },
];

describe('AwardTagSelector', () => {
  it('shows empty state when no awards available', () => {
    render(
      <AwardTagSelector
        availableAwards={[]}
        selectedType={null}
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    expect(screen.getByText(/no active awards/i)).toBeInTheDocument();
  });

  it('renders Auto option and all available awards', () => {
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('MVP')).toBeInTheDocument();
    expect(screen.getByText('Hot Hand')).toBeInTheDocument();
  });

  it('marks Auto as active when selectedType is null', () => {
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    const autoButton = screen.getByText('Auto').closest('button');
    expect(autoButton).toHaveTextContent('Active');
  });

  it('calls onSelect with award type when clicked', () => {
    const onSelect = vi.fn();
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={false}
        onSelect={onSelect}
        onToggleHidden={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('MVP').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('MVP');
  });

  it('calls onSelect with null when Auto is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType="MVP"
        hidden={false}
        onSelect={onSelect}
        onToggleHidden={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Auto').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onToggleHidden when toggle is clicked', () => {
    const onToggleHidden = vi.fn();
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={onToggleHidden}
      />,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggleHidden).toHaveBeenCalledWith(true);
  });

  it('shows Active label on selected award', () => {
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType="HOT_HAND"
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    const hotHandButton = screen.getByText('Hot Hand').closest('button');
    expect(hotHandButton).toHaveTextContent('Active');
    const autoButton = screen.getByText('Auto').closest('button');
    expect(autoButton).not.toHaveTextContent('Active');
  });

  it('switch has aria-checked=true when hidden is false (tag visible)', () => {
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={false}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('switch has aria-checked=false when hidden is true', () => {
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={true}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onToggleHidden(false) when toggle is clicked while hidden=true', () => {
    const onToggleHidden = vi.fn();
    render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={true}
        onSelect={vi.fn()}
        onToggleHidden={onToggleHidden}
      />,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggleHidden).toHaveBeenCalledWith(false);
  });

  it('applies opacity class to selector section when hidden=true', () => {
    const { container } = render(
      <AwardTagSelector
        availableAwards={mockAwards}
        selectedType={null}
        hidden={true}
        onSelect={vi.fn()}
        onToggleHidden={vi.fn()}
      />,
    );
    const selectorDiv = container.querySelector('.opacity-40');
    expect(selectorDiv).toBeInTheDocument();
  });
});
