// Small synthesized sound effects (Web Audio, no audio files).
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem('cca-muted') === '1';
  } catch {
    return false;
  }
})();

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('cca-muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function noiseBuffer(a: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function burst(a: AudioContext, t: number, dur: number, freq: number, q: number, gain: number) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur);
}

function tone(a: AudioContext, t: number, freq: number, dur: number, type: OscillatorType, gain: number, endFreq?: number) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  o.connect(lp).connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  dice(n = 4) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    const hits = Math.min(10, 4 + n * 2);
    for (let i = 0; i < hits; i++) burst(a, t + i * 0.045 + Math.random() * 0.03, 0.05, 1800 + Math.random() * 2600, 6, 0.18);
  },
  hit() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    tone(a, t, 160, 0.25, 'sine', 0.35, 55);
    burst(a, t, 0.12, 700, 1.2, 0.2);
  },
  clash() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    for (const f of [1180, 1730, 2650]) tone(a, t, f, 0.35, 'triangle', 0.05);
    burst(a, t, 0.08, 4000, 2, 0.12);
  },
  card() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, 0.22);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
  },
  banner() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    [392, 523.3, 659.3].forEach((f, i) => tone(a, t + i * 0.11, f, 0.32 + i * 0.08, 'sawtooth', 0.07));
  },
  march() {
    const a = ac();
    if (!a) return;
    burst(a, a.currentTime, 0.06, 300, 1.5, 0.08);
  },
  victory() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, t + i * 0.16, f, 0.7, 'sawtooth', 0.06));
  },
  defeat() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    [392, 349.2, 311.1, 261.6].forEach((f, i) => tone(a, t + i * 0.22, f, 0.6, 'triangle', 0.08));
  },
  turn() {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    tone(a, t, 440, 0.18, 'triangle', 0.05);
    tone(a, t + 0.12, 587.3, 0.25, 'triangle', 0.05);
  },
};
