import { describe, it, expect, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';
import { mediaErrorMessage, surfaceMediaDeviceError } from './mediaErrors';

const domError = (name: string) => new DOMException('x', name);

describe('mediaErrorMessage', () => {
  it('permission errors tell the user to allow access', () => {
    expect(mediaErrorMessage(domError('NotAllowedError'), 'microphone')).toMatch(
      /blocked|allow/i,
    );
    expect(mediaErrorMessage(domError('SecurityError'), 'camera')).toMatch(
      /blocked|allow/i,
    );
  });

  it('missing-device errors mention no device found', () => {
    expect(mediaErrorMessage(domError('NotFoundError'), 'camera')).toMatch(
      /no camera found/i,
    );
    expect(
      mediaErrorMessage(domError('OverconstrainedError'), 'microphone'),
    ).toMatch(/no microphone found/i);
  });

  it('device-busy errors mention another app', () => {
    expect(mediaErrorMessage(domError('NotReadableError'), 'camera')).toMatch(
      /another app/i,
    );
    expect(mediaErrorMessage(domError('AbortError'), 'microphone')).toMatch(
      /another app/i,
    );
  });

  it('unknown / non-DOMException errors get a generic fallback', () => {
    expect(mediaErrorMessage(new Error('boom'), 'microphone')).toMatch(
      /couldn't start your microphone/i,
    );
    expect(mediaErrorMessage('not-an-error', 'camera')).toMatch(
      /couldn't start your camera/i,
    );
  });

  it('names the correct device', () => {
    expect(mediaErrorMessage(domError('NotAllowedError'), 'microphone')).toMatch(
      /microphone/i,
    );
    expect(mediaErrorMessage(domError('NotAllowedError'), 'camera')).toMatch(
      /camera/i,
    );
  });
});

describe('surfaceMediaDeviceError', () => {
  it('routes the mapped message to a toast', () => {
    surfaceMediaDeviceError(domError('NotReadableError'), 'microphone');
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/another app/i),
    );
  });
});
