import { describe, it, expect } from 'vitest';
import {
  classifyQuality,
  lossPercent,
  worseQuality,
} from './webrtcStatsUtils';

describe('lossPercent', () => {
  it('returns 0 when nothing was expected', () => {
    expect(lossPercent(0, 0)).toBe(0);
  });

  it('returns 0 when total is non-positive (guards bad deltas)', () => {
    expect(lossPercent(-5, 0)).toBe(0);
  });

  it('computes loss over the interval total (lost + received)', () => {
    expect(lossPercent(10, 90)).toBeCloseTo(10);
    expect(lossPercent(1, 99)).toBeCloseTo(1);
    expect(lossPercent(5, 5)).toBeCloseTo(50);
  });
});

describe('classifyQuality', () => {
  it('good only when both RTT and loss are low', () => {
    expect(classifyQuality(80, 0)).toBe('good');
    expect(classifyQuality(149, 1.9)).toBe('good');
  });

  it('drops to fair on moderate RTT or loss', () => {
    expect(classifyQuality(200, 0)).toBe('fair'); // RTT alone
    expect(classifyQuality(80, 3)).toBe('fair'); // loss alone
    expect(classifyQuality(299, 4.9)).toBe('fair');
  });

  it('poor when either crosses the high threshold', () => {
    expect(classifyQuality(350, 0)).toBe('poor'); // RTT alone
    expect(classifyQuality(80, 6)).toBe('poor'); // loss alone
    expect(classifyQuality(500, 20)).toBe('poor');
  });

  it('matches the historical thresholds at the boundaries', () => {
    // 2% / 150ms is the good→fair edge; 5% / 300ms is fair→poor
    expect(classifyQuality(149, 1.99)).toBe('good');
    expect(classifyQuality(150, 0)).toBe('fair');
    expect(classifyQuality(0, 2)).toBe('fair');
    expect(classifyQuality(0, 5)).toBe('poor');
    expect(classifyQuality(300, 0)).toBe('poor');
  });
});

describe('worseQuality', () => {
  it('returns the second value when the first is undefined', () => {
    expect(worseQuality(undefined, 'good')).toBe('good');
    expect(worseQuality(undefined, 'poor')).toBe('poor');
  });

  it('keeps the worse of the two', () => {
    expect(worseQuality('good', 'fair')).toBe('fair');
    expect(worseQuality('fair', 'good')).toBe('fair');
    expect(worseQuality('fair', 'poor')).toBe('poor');
    expect(worseQuality('poor', 'good')).toBe('poor');
    expect(worseQuality('good', 'good')).toBe('good');
  });

  it('the core slice-C guarantee: bad audio sinks healthy video', () => {
    const audio = classifyQuality(40, 9); // 9% audio loss → poor
    const video = classifyQuality(40, 0.5); // healthy video → good
    expect(worseQuality(audio, video)).toBe('poor');
  });

  it('healthy audio does not rescue bad video', () => {
    const audio = classifyQuality(40, 0); // good
    const video = classifyQuality(40, 8); // poor
    expect(worseQuality(audio, video)).toBe('poor');
  });
});
