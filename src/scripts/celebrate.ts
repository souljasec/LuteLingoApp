// Duolingo-style feedback: a small "+N XP" toast, and a celebration overlay (confetti + chime) when a
// daily goal is reached, a text is finished or a review session ends. Strings come from the
// #fx-i18n JSON the layout renders. Everything is set with textContent.

type Xp = { gained: number; xp: number; goal: number; streak: number };
type Strings = Record<'xpToday' | 'streak' | 'goalReached' | 'continue' | 'keep', string>;

const S = (): Strings => JSON.parse(document.getElementById('fx-i18n')?.textContent || '{}');
const COLORS = ['#438e83', '#5274ca', '#d99190', '#e6cc86', '#306e65'];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function chime() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* no audio: fine */
  }
}

function confetti(host: HTMLElement) {
  if (calm()) return;
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = COLORS[i % COLORS.length];
    p.style.animationDelay = Math.random() * 0.4 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.setProperty('--drift', (Math.random() - 0.5) * 160 + 'px');
    p.style.setProperty('--spin', Math.random() * 720 - 360 + 'deg');
    host.append(p);
  }
}

/** Full-screen celebration. Resolves when the student taps Continue. */
export function celebrate(title: string, xp?: Xp, extra?: string): Promise<void> {
  const s = S();
  const wrap = document.createElement('div');
  wrap.className = 'celebrate';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'celebrate-box';
  const h = document.createElement('h2');
  h.textContent = title;
  box.append(h);
  if (xp) {
    const stats = document.createElement('div');
    stats.className = 'celebrate-stats';
    const tile = (big: string, small: string) => {
      const d = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = big;
      const sm = document.createElement('span');
      sm.textContent = small;
      d.append(b, sm);
      return d;
    };
    stats.append(tile(`🔥 ${xp.streak}`, s.streak), tile(`${xp.xp}/${xp.goal}`, s.xpToday));
    box.append(stats);
  }
  const p = document.createElement('p');
  p.textContent = extra ?? s.keep;
  const btn = document.createElement('button');
  btn.className = 'btn block';
  btn.textContent = s.continue;
  box.append(p, btn);
  wrap.append(box);
  document.body.append(wrap);
  confetti(wrap);
  chime();
  navigator.vibrate?.([20, 40, 20]);
  btn.focus();
  return new Promise((resolve) => {
    btn.onclick = () => {
      wrap.remove();
      resolve();
    };
  });
}

/** After any XP-earning action: a toast for the XP, and a celebration if the daily goal was just crossed. */
export async function xpFeedback(xp: Xp | undefined) {
  if (!xp || xp.gained <= 0) return;
  const t = document.createElement('div');
  t.className = 'xp-toast';
  t.textContent = `+${xp.gained} XP`;
  document.body.append(t);
  setTimeout(() => t.remove(), 1400);
  if (xp.xp >= xp.goal && xp.xp - xp.gained < xp.goal) await celebrate(S().goalReached, xp);
}
