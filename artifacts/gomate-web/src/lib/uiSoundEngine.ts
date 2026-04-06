/**
 * Lightweight UI tones via Web Audio API — no external assets, tiny CPU cost.
 * Call `resumeAudioContext()` after a user gesture so playback works across browsers.
 */

let sharedCtx: AudioContext | null = null;

function getCtor(): (typeof AudioContext) | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

export function getAudioContext(): AudioContext | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

export async function resumeAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** ~45ms soft tick — primary taps */
export function playUiClickSound(ctx: AudioContext, masterGain = 0.09): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(920, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.004);
  g.gain.linearRampToValueAtTime(0.0001, t0 + 0.048);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.055);
}

/** Optional ~70ms air / sheet when a dialog surfaces — very quiet */
export function playModalOpenSound(ctx: AudioContext, masterGain = 0.028): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(420, t0);
  f.frequency.linearRampToValueAtTime(1280, t0 + 0.055);
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.012);
  g.gain.linearRampToValueAtTime(0.0001, t0 + 0.075);
  osc.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.08);
}

/** ~380ms soft two-tone success — trip created / request sent */
export function playUiSuccessSound(ctx: AudioContext, masterGain = 0.065): void {
  const base = ctx.currentTime;
  const freqs = [523.25, 659.25];
  freqs.forEach((hz, i) => {
    const t0 = base + i * 0.1;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(masterGain, t0 + 0.018);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 0.32);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.34);
  });
}
