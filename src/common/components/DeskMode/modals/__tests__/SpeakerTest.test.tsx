import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SpeakerTest from '../settings-primitives/SpeakerTest';

describe('SpeakerTest', () => {
  it('renders "Test Speaker" text', () => {
    render(<SpeakerTest onTest={vi.fn()} isTesting={false} />);
    expect(screen.getByRole('button', { name: /Test Speaker/ })).toBeInTheDocument();
  });

  it('calls onTest on click', () => {
    const onTest = vi.fn().mockResolvedValue(undefined);
    render(<SpeakerTest onTest={onTest} isTesting={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Speaker/ }));
    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it('shows "Playing..." when isTesting', () => {
    render(<SpeakerTest onTest={vi.fn()} isTesting={true} />);
    expect(screen.getByRole('button', { name: /Playing/ })).toBeInTheDocument();
    expect(screen.queryByText('Test Speaker')).not.toBeInTheDocument();
  });

  it('button is disabled during test', () => {
    render(<SpeakerTest onTest={vi.fn()} isTesting={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
