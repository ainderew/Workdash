import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceSelector from '../settings-primitives/DeviceSelector';
import { createMockDevice } from './media-test-utils';

const mockDevices = [
  createMockDevice({ deviceId: 'mic-1', label: 'Built-in Mic', kind: 'audioinput' }),
  createMockDevice({ deviceId: 'mic-2', label: 'USB Mic', kind: 'audioinput' }),
];

function renderSelector(overrides: Partial<React.ComponentProps<typeof DeviceSelector>> = {}) {
  const defaultProps: React.ComponentProps<typeof DeviceSelector> = {
    devices: mockDevices,
    selectedDeviceId: 'mic-1',
    onSelect: vi.fn(),
    ...overrides,
  };
  const result = render(<DeviceSelector {...defaultProps} />);
  return { ...result, onSelect: defaultProps.onSelect };
}

describe('DeviceSelector', () => {
  it('renders device list from props', () => {
    renderSelector();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Built-in Mic')).toBeInTheDocument();
    expect(screen.getByText('USB Mic')).toBeInTheDocument();
  });

  it('fires onSelect immediately when not in call', () => {
    const { onSelect } = renderSelector({ isInCall: false });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mic-2' } });
    expect(onSelect).toHaveBeenCalledWith('mic-2');
  });

  it('shows warning with Switch/Cancel when in call and device changed', () => {
    renderSelector({ isInCall: true });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mic-2' } });

    expect(screen.getByText(/Switching devices may briefly interrupt/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('confirm switch fires onSelect with pending deviceId', () => {
    const { onSelect } = renderSelector({ isInCall: true });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mic-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

    expect(onSelect).toHaveBeenCalledWith('mic-2');
  });

  it('cancel reverts select to original value', () => {
    const { onSelect } = renderSelector({ isInCall: true });
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'mic-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByText(/Switching devices may briefly interrupt/)).not.toBeInTheDocument();
  });

  it('shows placeholder when devices array empty', () => {
    renderSelector({ devices: [], placeholder: 'No devices found' });
    expect(screen.getByText('No devices found')).toBeInTheDocument();
  });

  it('disables select in disabled state', () => {
    renderSelector({ disabled: true });
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('renders label when provided', () => {
    renderSelector({ label: 'Input Device' });
    expect(screen.getByText('Input Device')).toBeInTheDocument();
  });
});
