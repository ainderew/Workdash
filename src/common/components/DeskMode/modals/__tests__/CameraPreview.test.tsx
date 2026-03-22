import React from 'react';
import { render, screen } from '@testing-library/react';
import CameraPreview from '../settings-primitives/CameraPreview';
import { createMockMediaStream } from './media-test-utils';

describe('CameraPreview', () => {
  it('shows placeholder when no stream', () => {
    render(<CameraPreview stream={null} isActive={false} />);
    expect(screen.getByText('Camera preview')).toBeInTheDocument();
    expect(screen.queryByRole('video')).not.toBeInTheDocument();
  });

  it('shows placeholder when stream provided but not active', () => {
    const stream = createMockMediaStream();
    render(<CameraPreview stream={stream} isActive={false} />);
    expect(screen.getByText('Camera preview')).toBeInTheDocument();
  });

  it('shows video element when stream provided and active', () => {
    const stream = createMockMediaStream();
    const { container } = render(<CameraPreview stream={stream} isActive={true} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(screen.queryByText('Camera preview')).not.toBeInTheDocument();
  });

  it('video element has autoPlay, muted, playsInline', () => {
    const stream = createMockMediaStream();
    const { container } = render(<CameraPreview stream={stream} isActive={true} />);
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveAttribute('playsinline');
  });

  it('video has scaleX(-1) transform for mirroring', () => {
    const stream = createMockMediaStream();
    const { container } = render(<CameraPreview stream={stream} isActive={true} />);
    const video = container.querySelector('video');
    expect(video?.className).toContain('[transform:scaleX(-1)]');
  });
});
