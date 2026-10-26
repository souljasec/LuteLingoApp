// Game sounds, made in code (no audio files), and vibration where the phone has it (Android).

let ctx: AudioContext | null = null;

function tone(freq: number, at: number, len: number, type: OscillatorType, vol: number) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume(); // iOS starts audio only after a tap
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + len + 0.05);
  } catch {
    /* no audio: fine */
  }
}

/** Right answer: a two-note ding that climbs a little with each combo step. */
export function sound(combo = 1) {
  const up = 2 ** (Math.min(combo - 1, 6) / 12);
  tone(880 * up, 0, 0.18, 'sine', 0.14);
  tone(1318.5 * up, 0.08, 0.25, 'sine', 0.12);
}

/** Wrong answer: a short low buzz. */
export function buzz() {
  tone(150, 0, 0.22, 'square', 0.05);
  tone(110, 0.06, 0.2, 'square', 0.05);
}

export const vibrate = (pattern: number | number[]) => navigator.vibrate?.(pattern);
