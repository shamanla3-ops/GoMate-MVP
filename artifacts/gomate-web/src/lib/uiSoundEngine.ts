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
  if (ctx.state === "suspended" || ctx.state === "interrupted") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Premium “system awake” welcome — layered rise + airy band, ~0.95s.
 * Light stereo image; tuned for clarity on small speakers without harshness.
 */
export function playWelcomeOpenSound(ctx: AudioContext, masterGain = 0.048): void {
  const t0 = ctx.currentTime;
  const tail = 0.95;

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(1, t0);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(72, t0);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(520, t0);
  lp.frequency.exponentialRampToValueAtTime(8200, t0 + 0.11);
  lp.frequency.exponentialRampToValueAtTime(3000, t0 + 0.62);
  lp.Q.setValueAtTime(0.55, t0);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(masterGain, t0 + 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + tail);

  mix.connect(hp);
  hp.connect(lp);
  lp.connect(env);

  try {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(0.07, t0);
    env.connect(pan);
    pan.connect(ctx.destination);
  } catch {
    env.connect(ctx.destination);
  }

  type Layer = { hz: number; delay: number; level: number; type: OscillatorType };
  const layers: Layer[] = [
    { hz: 196, delay: 0, level: 0.2, type: "sine" },
    { hz: 392, delay: 0.038, level: 0.4, type: "sine" },
    { hz: 493.88, delay: 0.085, level: 0.36, type: "sine" },
    { hz: 659.25, delay: 0.13, level: 0.26, type: "triangle" },
    { hz: 987.77, delay: 0.19, level: 0.16, type: "sine" },
  ];

  layers.forEach(({ hz, delay, level, type }, i) => {
    const start = t0 + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz * 0.988, start);
    osc.frequency.exponentialRampToValueAtTime(hz, start + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.038 + i * 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.74);
    osc.connect(g);
    try {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(i % 2 === 0 ? -0.22 : 0.22, start);
      g.connect(p);
      p.connect(mix);
    } catch {
      g.connect(mix);
    }
    osc.start(start);
    osc.stop(start + 0.8);
  });

  const n = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.2;
  }
  const air = ctx.createBufferSource();
  air.buffer = buf;
  const ag = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1200, t0 + 0.015);
  bp.frequency.exponentialRampToValueAtTime(6800, t0 + 0.1);
  bp.Q.setValueAtTime(0.9, t0);
  ag.gain.setValueAtTime(0, t0 + 0.015);
  ag.gain.linearRampToValueAtTime(0.1, t0 + 0.055);
  ag.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  air.connect(bp);
  bp.connect(ag);
  ag.connect(mix);
  air.start(t0 + 0.015);
  air.stop(t0 + 0.22);
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

/** Outgoing chat — brief, bright, minimal */
export function playChatSendSound(ctx: AudioContext, masterGain = 0.055): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1180, t0);
  osc.frequency.exponentialRampToValueAtTime(1560, t0 + 0.038);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.06);
}

/** Incoming chat — warmer, lower than send */
export function playChatReceiveSound(ctx: AudioContext, masterGain = 0.048): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, t0);
  osc.frequency.exponentialRampToValueAtTime(680, t0 + 0.045);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

/** Soft ignition / engine settle — not a rev, ~500–650ms */
export function playCarEngineStartSound(ctx: AudioContext, masterGain = 0.036): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = "lowpass";
  f.frequency.setValueAtTime(240, t0);
  f.frequency.exponentialRampToValueAtTime(480, t0 + 0.38);
  osc.type = "sine";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(52, t0);
  osc.frequency.exponentialRampToValueAtTime(78, t0 + 0.42);
  osc2.frequency.setValueAtTime(104, t0);
  osc2.frequency.exponentialRampToValueAtTime(156, t0 + 0.42);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.028);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58);
  osc.connect(f);
  osc2.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc2.start(t0);
  osc.stop(t0 + 0.62);
  osc2.stop(t0 + 0.62);
}

/** Short soft acceleration / roll-off */
export function playCarDriveAwaySound(ctx: AudioContext, masterGain = 0.03): void {
  const t0 = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(280, t0);
  f.frequency.exponentialRampToValueAtTime(1400, t0 + 0.12);
  f.Q.setValueAtTime(0.65, t0);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + 0.2);
}

/** Light arrival / slow roll */
export function playCarArrivalSound(ctx: AudioContext, masterGain = 0.026): void {
  const t0 = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * 0.16);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.32;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(820, t0);
  f.frequency.exponentialRampToValueAtTime(320, t0 + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.035);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + 0.16);
}

/** Driver: subtle “someone is interested” — airy, not alarm-like */
export function playNewRideRequestSound(ctx: AudioContext, masterGain = 0.042): void {
  const base = ctx.currentTime;
  const freqs = [740, 990];
  freqs.forEach((hz, i) => {
    const t0 = base + i * 0.055;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(2200, t0);
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(masterGain * (1 - i * 0.15), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
    osc.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  });
}

/** Passenger: warm “you’re in” confirmation */
export function playRequestApprovedSound(ctx: AudioContext, masterGain = 0.05): void {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(392, t0);
  osc.frequency.exponentialRampToValueAtTime(523.25, t0 + 0.07);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(masterGain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.17);
}

/** Match moment: soft elegant triad, slightly more presence than default success */
export function playRideMatchSound(ctx: AudioContext, masterGain = 0.046): void {
  const base = ctx.currentTime;
  const freqs = [392, 493.88, 587.33];
  freqs.forEach((hz, i) => {
    const t0 = base + i * 0.072;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(masterGain * (1 - i * 0.08), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  });
}
