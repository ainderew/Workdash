/**
 * Synthesised ready-check chimes — no audio asset required.
 *
 * The summon is a warm two-note hearth bell (a rising perfect fifth) that says
 * "gather round" without alarming anyone mid-match. The locked-in flourish is a
 * brighter ascending major arpeggio for the moment the whole squad commits.
 *
 * Built on the Web Audio API so the timbre stays consistent with the den's warm
 * voice and can never drift out of sync with a swapped-out mp3.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  // Autoplay policy may leave the context suspended until a gesture; try anyway.
  if (sharedCtx.state === "suspended") void sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

interface ToneOptions {
  freq: number;
  /** Seconds after `ctx.currentTime` to begin. */
  delay: number;
  /** Total ring length in seconds. */
  dur: number;
  /** Peak gain (0–1). */
  peak: number;
  /** Low-pass cutoff in Hz — lower is rounder/warmer. */
  cutoff: number;
  type?: OscillatorType;
}

/** One bell partial: oscillator → low-pass → percussive exponential envelope. */
function tone(ctx: AudioContext, master: GainNode, opts: ToneOptions): void {
  const { freq, delay, dur, peak, cutoff, type = "triangle" } = opts;
  const t0 = ctx.currentTime + delay;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  filter.Q.value = 0.6;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.012); // soft, fast attack
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // long bell release

  osc.connect(filter).connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function withMaster(ctx: AudioContext): GainNode {
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return master;
}

/** Warm rising fifth — plays when a ready check opens. */
export function playSummonChime(): void {
  if (prefersReducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const master = withMaster(ctx);
  // G4 → D5, each with a quiet octave-up shimmer for warmth.
  tone(ctx, master, { freq: 392.0, delay: 0, dur: 1.1, peak: 0.32, cutoff: 1800 });
  tone(ctx, master, { freq: 784.0, delay: 0, dur: 0.9, peak: 0.08, cutoff: 2600, type: "sine" });
  tone(ctx, master, { freq: 587.33, delay: 0.16, dur: 1.4, peak: 0.34, cutoff: 2000 });
  tone(ctx, master, { freq: 1174.66, delay: 0.16, dur: 1.0, peak: 0.07, cutoff: 3200, type: "sine" });
}

/** Bright ascending major arpeggio — plays when everyone has locked in. */
export function playLockedInChime(): void {
  if (prefersReducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const master = withMaster(ctx);
  // C5 · E5 · G5 · C6 staggered, the top note ringing longest with a shimmer.
  const notes: Array<[number, number]> = [
    [523.25, 0.0],
    [659.25, 0.08],
    [783.99, 0.16],
    [1046.5, 0.26],
  ];
  for (const [freq, delay] of notes) {
    tone(ctx, master, { freq, delay, dur: 1.3, peak: 0.3, cutoff: 3000 });
  }
  tone(ctx, master, { freq: 2093.0, delay: 0.26, dur: 1.6, peak: 0.06, cutoff: 5000, type: "sine" });
}
