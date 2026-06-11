import { describe, it, expect } from 'vitest';
import { decideLoungeNudge, type LoungeNudgeInput } from './loungeNudge';
import {
  DEFAULT_LOUNGE_HOURS,
  isWithinLoungeHours,
  nightKeyFor,
} from './loungePrefs';

const baseInput: LoungeNudgeInput = {
  nudgesEnabled: true,
  isInAnyCall: false,
  myStatusId: 'online',
  isSnoozed: false,
  liveParticipantCount: 0,
  callStartedAt: null,
  lastLiveNudgeCallStart: null,
  onlineCount: 0,
  withinLoungeHours: true,
  currentNightKey: '2026-06-11',
  lastQuorumNightKey: null,
};

describe('decideLoungeNudge', () => {
  it('fires the live nudge for a new lounge call', () => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        liveParticipantCount: 2,
        callStartedAt: '2026-06-11T20:00:00Z',
      }),
    ).toBe('live');
  });

  it('fires the live nudge outside lounge hours', () => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        liveParticipantCount: 1,
        callStartedAt: '2026-06-11T10:00:00Z',
        withinLoungeHours: false,
      }),
    ).toBe('live');
  });

  it('does not repeat the live nudge for the same call', () => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        liveParticipantCount: 2,
        callStartedAt: '2026-06-11T20:00:00Z',
        lastLiveNudgeCallStart: '2026-06-11T20:00:00Z',
      }),
    ).toBeNull();
  });

  it('fires the quorum nudge with 2+ friends online inside hours', () => {
    expect(decideLoungeNudge({ ...baseInput, onlineCount: 2 })).toBe('quorum');
  });

  it('suppresses the quorum nudge outside lounge hours', () => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        onlineCount: 3,
        withinLoungeHours: false,
      }),
    ).toBeNull();
  });

  it('suppresses the quorum nudge twice in one night', () => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        onlineCount: 3,
        lastQuorumNightKey: '2026-06-11',
      }),
    ).toBeNull();
  });

  it.each([
    ['in a call', { isInAnyCall: true }],
    ['focused', { myStatusId: 'focus' }],
    ['snoozed', { isSnoozed: true }],
    ['nudges disabled', { nudgesEnabled: false }],
  ] as const)('stays quiet when %s', (_label, overrides) => {
    expect(
      decideLoungeNudge({
        ...baseInput,
        liveParticipantCount: 2,
        callStartedAt: '2026-06-11T20:00:00Z',
        onlineCount: 3,
        ...overrides,
      }),
    ).toBeNull();
  });
});

describe('isWithinLoungeHours', () => {
  it('handles a window crossing midnight (19→1)', () => {
    const at = (h: number) => new Date(2026, 5, 11, h, 30);
    expect(isWithinLoungeHours(at(19), DEFAULT_LOUNGE_HOURS)).toBe(true);
    expect(isWithinLoungeHours(at(23), DEFAULT_LOUNGE_HOURS)).toBe(true);
    expect(isWithinLoungeHours(at(0), DEFAULT_LOUNGE_HOURS)).toBe(true);
    expect(isWithinLoungeHours(at(1), DEFAULT_LOUNGE_HOURS)).toBe(false);
    expect(isWithinLoungeHours(at(12), DEFAULT_LOUNGE_HOURS)).toBe(false);
  });

  it('handles a same-day window (9→17)', () => {
    const hours = { startHour: 9, endHour: 17 };
    expect(isWithinLoungeHours(new Date(2026, 5, 11, 10), hours)).toBe(true);
    expect(isWithinLoungeHours(new Date(2026, 5, 11, 18), hours)).toBe(false);
  });
});

describe('nightKeyFor', () => {
  it('groups past-midnight hours with the previous evening', () => {
    expect(nightKeyFor(new Date(2026, 5, 11, 23, 0))).toBe('2026-06-11');
    expect(nightKeyFor(new Date(2026, 5, 12, 0, 30))).toBe('2026-06-11');
    expect(nightKeyFor(new Date(2026, 5, 12, 5, 59))).toBe('2026-06-11');
    expect(nightKeyFor(new Date(2026, 5, 12, 6, 0))).toBe('2026-06-12');
  });
});
