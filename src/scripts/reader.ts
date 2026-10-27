// Reader: word/phrase selection, Lute-style term statuses, and the translation sheet (translation,
// pronunciation with word highlighting, Tatoeba examples). Sheet ported from
// lute-custom/custom/vi.html; selection and statuses follow Lute: long-press the first word, tap
// the last; statuses in lib/terms.ts, words without a status are new.
// Text from outside sources is only ever set via textContent.

import { pickVoice } from './voice.ts';
import { brand } from '../brand/brand';
import { locale } from '../brand/locale';
import { baseForms } from '../lib/lemma.ts';
import { LEARNING, MAX_PHRASE, isStatus, statusClass, type Status, type Term } from '../lib/terms.ts';
import { celebrate, xpFeedback } from './celebrate.ts';

const $ = (id: string) => document.getElementById(id)!;
const SPEAKER = $('say').innerHTML; // reuse the server-rendered icon for example buttons
const config = JSON.parse($('sheet').dataset.config!) as {
  rate: number;
  textId: number;
  terms: Record<string, Term>; // the user's terms in this text (+ their parents)
  i18n: Record<'failed' | 'other' | 'listenSentence' | 'textDone', string>;
};
let current = '';
let currentVi = ''; // translation shown for `current`, saved along with a status
let sentence = '';
let acrossSentences = false; // a selection spanning two sentences is never saved

// ---- speech ---------------------------------------------------------------

/** Render text as one span per word so speech can highlight the word being spoken. */
function words(el: HTMLElement, text: string, isBold: (t: string) => boolean = () => false) {
  el.replaceChildren();
  let pos = 0;
  for (const part of text.split(/(\s+)/)) {
    if (part.trim()) {
      const w = document.createElement(isBold(part) ? 'b' : 'span');
      w.className = 'tw';
      w.dataset.start = String(pos);
      w.textContent = part;
      el.append(w);
    } else el.append(part);
    pos += part.length;
  }
}

function say(text: string, el: HTMLElement) {
  const s = window.speechSynthesis;
  if (!s || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = config.rate;
  // The voice chosen in Settings on this device, else an offline US voice (they report word boundaries).
  const v = pickVoice();
  if (v) u.voice = v;
  const spans = [...el.querySelectorAll<HTMLElement>('.tw')];
  const clear = () => spans.forEach((x) => x.classList.remove('now'));
  u.onboundary = (e) => {
    if (e.name && e.name !== 'word') return;
    const cur = spans.filter((x) => Number(x.dataset.start) <= e.charIndex).pop();
    clear();
    cur?.classList.add('now');
  };
  u.onend = u.onerror = clear;
  document.querySelectorAll('.tw.now').forEach((x) => x.classList.remove('now'));
  s.cancel();
  s.speak(u);
}

// ---- translation & examples ---------------------------------------------

// Direct lookups from the phone: used when the server's sources refuse Cloudflare's shared IPs (429).
// Each phone has its own IP, like the Lute panel had. Results are not written to the shared cache.
async function translateHere(q: string): Promise<{ vi: string; alts: string[] }> {
  try {
    const r = await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=' + locale.translateTo + '&q=' + encodeURIComponent(q));
    const j: any = await r.json();
    const vi = Array.isArray(j[0]) ? j[0][0] : j[0];
    if (vi) return { vi, alts: [] };
  } catch {}
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|' + locale.translateTo + '&q=' + encodeURIComponent(q));
  const j: any = await r.json();
  return { vi: j.responseData?.translatedText ?? '', alts: [] };
}

async function translate(q: string) {
  const vi = $('vi');
  vi.className = q.split(/\s+/).length > 3 ? 'vi long' : 'vi';
  // A saved term shows its own translation at once (as in Lute); the lookup only adds alternatives.
  const own = config.terms[q.toLowerCase()]?.t;
  vi.textContent = own || '…';
  currentVi = own || '';
  $('alts').textContent = '';
  try {
    const r = await fetch('/api/translate?q=' + encodeURIComponent(q));
    if (r.status === 401) return location.assign('/login');
    let j = r.ok ? await r.json() : null;
    if (!j?.vi) j = await translateHere(q);
    if (q !== current) return; // user already tapped another word
    if (!j.vi) throw new Error();
    if (!own) {
      vi.textContent = j.vi;
      currentVi = j.vi;
    }
    if (j.alts?.length) $('alts').textContent = config.i18n.other + ': ' + j.alts.join(', ');
  } catch {
    if (q !== current || own) return;
    vi.className = 'vi err';
    vi.textContent = config.i18n.failed;
  }
}

const TATOEBA = { vi: 'vie', id: 'ind' }[locale.translateTo];

async function examples(q: string) {
  const box = $('ex');
  const list = $('ex-list');
  box.hidden = true;
  list.replaceChildren();
  if (q.split(/\s+/).length > 3) return;
  try {
    const r = await fetch(
      'https://api.tatoeba.org/unstable/sentences?lang=eng&sort=relevance&limit=20&trans:lang=' + TATOEBA + '&q=' + encodeURIComponent(q),
    );
    const data: any[] = (await r.json()).data ?? [];
    const items = data
      .map((s) => ({ en: String(s.text), vi: (s.translations ?? []).flat().find((t: any) => t.lang === TATOEBA)?.text as string | undefined }))
      .filter((x) => x.vi && x.en.split(/\s+/).length >= 4)
      .slice(0, 3);
    if (q !== current || !items.length) return;
    const qw = q.toLowerCase().split(/\s+/);
    const isBold = (t: string) => qw.includes(t.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ''));
    for (const x of items) {
      const row = document.createElement('div');
      row.className = 'exi';
      const en = document.createElement('div');
      en.className = 'en';
      words(en, x.en, isBold);
      const b = document.createElement('button');
      b.className = 'icon-btn small';
      b.innerHTML = SPEAKER;
      b.setAttribute('aria-label', config.i18n.listenSentence);
      b.onclick = () => say(x.en, en);
      const tr = document.createElement('div');
      tr.className = 'tr';
      tr.textContent = x.vi!;
      const col = document.createElement('div');
      col.append(en, tr);
      row.append(b, col);
      list.append(row);
    }
    box.hidden = false;
  } catch {
    /* examples are optional */
  }
}

// ---- statuses -------------------------------------------------------------

const STATUS_CLASSES = ['st0', ...LEARNING.map((n) => `st${n}`)];

function paint(el: Element, s: number | undefined) {
  el.classList.remove(...STATUS_CLASSES);
  const c = statusClass(s);
  if (c) el.classList.add(c);
}

/** Recolour every occurrence of a term in the text. */
function recolour(term: string, s: number | undefined) {
  if (term.includes(' ')) {
    document.querySelectorAll<HTMLElement>('#text .mw').forEach((m) => m.dataset.term === term && paint(m, s));
    // A phrase saved just now has no .mw wrapper until reload: colour the selected words.
    document.querySelectorAll('#text .w.sel').forEach((w) => !w.closest('.mw') && paint(w, s));
  } else {
    document.querySelectorAll('#text .w').forEach((w) => !w.closest('.mw') && w.textContent!.toLowerCase() === term && paint(w, s));
  }
}

// ---- parent terms (Lute) -----------------------------------------------------
// "went" can be linked to its base word "go": the panel then shows go's meaning too.

function showParent(q: string) {
  const term = q.toLowerCase();
  const box = $('parent-box');
  box.hidden = q.includes(' ');
  if (box.hidden) return;
  const parent = config.terms[term]?.p;
  $('parent-linked').hidden = !parent;
  $('parent-pick').hidden = !!parent;
  ($('parent-form') as HTMLFormElement).hidden = true;
  if (parent) {
    const el = $('parent-text');
    el.replaceChildren();
    const b = document.createElement('b');
    b.textContent = parent;
    el.append(b);
    const pt = config.terms[parent]?.t;
    if (pt) el.append(' · ' + pt);
    else fillParentMeaning(parent);
    return;
  }
  const chips = $('parent-chips');
  chips.replaceChildren();
  for (const base of baseForms(term)) {
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = base;
    c.onclick = () => linkParent(base);
    chips.append(c);
  }
}

/** A parent created by linking has no meaning yet: look it up once and save it with the parent. */
async function fillParentMeaning(parent: string) {
  const r = await fetch('/api/translate?q=' + encodeURIComponent(parent)).catch(() => null);
  const j = r?.ok ? await r.json() : null;
  if (!j?.vi) return;
  const s = config.terms[parent]?.s ?? 1;
  config.terms[parent] = { ...config.terms[parent], t: j.vi, s };
  await fetch('/api/words', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ term: parent, translation: j.vi, status: s }),
  });
  if (config.terms[current.toLowerCase()]?.p === parent) showParent(current);
}

async function linkParent(parent: string | null) {
  const term = current.toLowerCase();
  const p = parent?.trim().toLowerCase() ?? '';
  if (p === term) return;
  const status = config.terms[term]?.s ?? 1;
  const r = await fetch('/api/words', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ term, translation: currentVi, status, parent: p, sentence: term === sentence.toLowerCase() ? '' : sentence }),
  });
  if (!r.ok) return;
  const j = await r.json();
  xpFeedback(j.xp);
  const had = term in config.terms;
  config.terms[term] = { t: currentVi || config.terms[term]?.t || '', s: status, ...(p ? { p } : {}) };
  if (!had) recolour(term, status);
  if (p && j.parent && !(p in config.terms)) {
    config.terms[p] = j.parent;
    recolour(p, j.parent.s);
  }
  showStatus(current);
  showParent(current);
}

$('parent-unlink').addEventListener('click', () => linkParent(null));
$('parent-other').addEventListener('click', () => {
  ($('parent-form') as HTMLFormElement).hidden = false;
  ($('parent-input') as HTMLInputElement).focus();
});
$('parent-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = ($('parent-input') as HTMLInputElement).value;
  if (v.trim()) linkParent(v);
});

function showStatus(q: string) {
  const term = q.toLowerCase();
  const box = $('status-box');
  box.hidden = acrossSentences || q.split(' ').length > MAX_PHRASE; // sentences are not vocabulary
  const s = config.terms[term]?.s;
  box.querySelectorAll<HTMLElement>('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === s)));
  $('remove').hidden = s === undefined;
}

async function setStatus(s: Status | null) {
  const term = current.toLowerCase();
  const r =
    s === null
      ? await fetch('/api/words?term=' + encodeURIComponent(term), { method: 'DELETE' })
      : await fetch('/api/words', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ term, translation: currentVi, status: s, sentence: term === sentence.toLowerCase() ? '' : sentence }),
        });
  if (!r.ok) return;
  if (s !== null) xpFeedback((await r.json()).xp);
  if (s === null) delete config.terms[term];
  else config.terms[term] = { t: currentVi || config.terms[term]?.t || '', s };
  recolour(term, s ?? undefined);
  showStatus(current);
}

$('status-box').addEventListener('click', (e) => {
  const s = Number((e.target as HTMLElement).closest<HTMLElement>('[data-s]')?.dataset.s);
  if (isStatus(s)) setStatus(s);
});
$('remove').addEventListener('click', () => setStatus(null));

// ---- sheet ----------------------------------------------------------------

function show(q: string, withExamples: boolean) {
  current = q;
  const term = $('term');
  words(term, q);
  say(q, term); // first: must run inside the tap for iOS to allow audio
  showStatus(q);
  showParent(q);
  translate(q);
  if (withExamples) examples(q);
  else $('ex').hidden = true;
}

const clearMarks = () => document.querySelectorAll('.sel, .w.start').forEach((x) => x.classList.remove('sel', 'start'));

/** Open the sheet for the words from `a` to `b` (same word for a single tap). */
function openSheet(a: HTMLElement, b: HTMLElement = a) {
  if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) [a, b] = [b, a];
  clearMarks();
  const all = [...document.querySelectorAll<HTMLElement>('#text .w')];
  all.slice(all.indexOf(a), all.indexOf(b) + 1).forEach((x) => x.classList.add('sel'));
  // Range text keeps the original spacing and punctuation between the words.
  const r = document.createRange();
  r.setStartBefore(a);
  r.setEndAfter(b);
  const q = r.toString().replace(/\s+/g, ' ').trim();
  sentence = (a.closest('.s')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  acrossSentences = a.closest('.s') !== b.closest('.s');
  $('whole').hidden = !sentence || sentence === q;
  $('sheet').hidden = false;
  show(q, q.split(' ').length <= 3);
  requestAnimationFrame(() => keepVisible(a, b));
}

// ---- dock layout ----------------------------------------------------------
// The sheet docks at the bottom without covering the text with a backdrop. The page gets bottom
// padding equal to the sheet so the last lines can still be scrolled above it, and a tapped word
// hidden behind the sheet is scrolled into view.

const panel = document.querySelector<HTMLElement>('#sheet .panel')!;
// Computer: the sheet is a side panel instead of a bottom dock (CSS media query in read/[id]).
const side = matchMedia('(min-width: 60rem) and (pointer: fine)');
const dockHeight = () => ($('sheet').hidden || side.matches ? 0 : panel.offsetHeight);
new ResizeObserver(() => {
  document.body.style.paddingBottom = dockHeight() ? dockHeight() + 'px' : '';
}).observe(panel);

function keepVisible(a: HTMLElement, b: HTMLElement) {
  const top = a.getBoundingClientRect().top;
  const bottom = b.getBoundingClientRect().bottom;
  const header = document.querySelector('.top')?.getBoundingClientRect().bottom ?? 0;
  // Examples load a moment later and grow the sheet, so keep clear of its full height (56vh).
  const limit = innerHeight - (side.matches ? 0 : Math.max(dockHeight(), innerHeight * 0.56)) - 16;
  if (bottom > limit) scrollBy({ top: Math.min(bottom - limit, top - header - 16), behavior: 'smooth' });
  else if (top < header + 8) scrollBy({ top: top - header - 16, behavior: 'smooth' });
}

/** A tap inside a saved phrase opens the whole phrase, as in Lute. */
function openAt(w: HTMLElement) {
  const mw = w.closest<HTMLElement>('.mw');
  if (!mw) return openSheet(w);
  const ws = mw.querySelectorAll<HTMLElement>('.w');
  openSheet(ws[0], ws[ws.length - 1]);
  mw.classList.add('sel');
}

function close() {
  $('sheet').hidden = true;
  document.body.style.paddingBottom = '';
  window.speechSynthesis?.cancel();
  clearMarks();
}

// ---- gestures -------------------------------------------------------------
//
// Touch:
//   tap                      one word (handled on click, below)
//   sweep sideways           select the words under the finger; lift to translate + speak
//   hold, then move          same, in any direction (for multi-line selections)
//   hold, lift, tap another  Lute's two-step phrase selection
//   move up/down first       ordinary scrolling
// Mouse: drag across words.

const LONG_PRESS_MS = 500; // same as Lute's lute.js
const MOVE_PX = 8; // movement that turns a press into a sweep or a scroll
let start: HTMLElement | null = null; // first word of a two-step phrase pick
let timer = 0;
let skipClick = false; // the click that follows a long-press or a sweep
let held = false; // long-press fired during this touch
let touch: { el: HTMLElement; x: number; y: number } | null = null;
let sweep: { from: HTMLElement; to: HTMLElement } | null = null;

function setStart(el: HTMLElement | null) {
  clearMarks();
  start = el;
  el?.classList.add('start');
  $('pick').hidden = !el;
}

/** Live highlight of the words from a to b while the finger (or mouse) moves. */
function markRange(a: HTMLElement, b: HTMLElement) {
  if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) [a, b] = [b, a];
  clearMarks();
  const all = [...document.querySelectorAll<HTMLElement>('#text .w')];
  all.slice(all.indexOf(a), all.indexOf(b) + 1).forEach((x) => x.classList.add('sel'));
}

const wordAt = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.w');
  return el && text.contains(el) ? el : null;
};

const text = $('text');
text.addEventListener('contextmenu', (e) => e.preventDefault()); // Android long-press menu

text.addEventListener(
  'touchstart',
  (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.w');
    if (!el || e.touches.length > 1) return;
    touch = { el, x: e.touches[0].clientX, y: e.touches[0].clientY };
    held = false;
    sweep = null;
    timer = window.setTimeout(() => {
      held = true;
      skipClick = true;
      navigator.vibrate?.(15);
      setStart(el);
    }, LONG_PRESS_MS);
  },
  { passive: true },
);

// Not passive: once a sweep has started, scrolling must be blocked so the finger can select.
text.addEventListener(
  'touchmove',
  (e) => {
    if (!touch) return;
    const p = e.touches[0];
    const dx = p.clientX - touch.x;
    const dy = p.clientY - touch.y;
    if (!sweep) {
      if (Math.hypot(dx, dy) < MOVE_PX) return;
      clearTimeout(timer);
      // Up/down first is a scroll; sideways first, or moving after a hold, is a selection.
      if (!held && Math.abs(dy) > Math.abs(dx)) {
        touch = null;
        return;
      }
      setStart(null);
      sweep = { from: touch.el, to: touch.el };
    }
    e.preventDefault();
    const el = wordAt(p.clientX, p.clientY);
    if (el) {
      sweep.to = el;
      markRange(sweep.from, el);
    }
  },
  { passive: false },
);

text.addEventListener('touchend', (e) => {
  clearTimeout(timer);
  if (sweep) {
    // touchend counts as a user gesture, so speech is allowed to start here (iOS too).
    e.preventDefault(); // no click after a sweep
    skipClick = true;
    openSheet(sweep.from, sweep.to);
  }
  touch = null;
  sweep = null;
});

text.addEventListener('touchcancel', () => {
  clearTimeout(timer);
  if (sweep) clearMarks();
  touch = null;
  sweep = null;
});

// Mouse: drag across words, highlighted live.
let mouse: HTMLElement | null = null;
text.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') mouse = (e.target as HTMLElement).closest<HTMLElement>('.w');
});
text.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !mouse || !(e.buttons & 1)) return;
  const el = wordAt(e.clientX, e.clientY);
  if (el && el !== mouse) markRange(mouse, el);
});
text.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse' || !mouse) return;
  const el = wordAt(e.clientX, e.clientY);
  if (el && el !== mouse) {
    skipClick = true;
    openSheet(mouse, el);
  }
  mouse = null;
});

// Taps are handled on click: it is the event every phone accepts for starting speech.
text.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('.w');
  if (skipClick) {
    skipClick = false;
    return;
  }
  if (!el) return;
  if (start) {
    const a = start;
    setStart(null);
    openSheet(a, el);
  } else openAt(el);
});

$('pick-cancel').addEventListener('click', () => setStart(null));

$('say').addEventListener('click', () => say(current, $('term')));
$('whole').addEventListener('click', () => {
  $('whole').hidden = true;
  acrossSentences = false;
  show(sentence, false);
});
$('sheet').addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-close]')) close();
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

// ---- finishing ------------------------------------------------------------

async function post(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

function showFinished(on: boolean) {
  $('finished-label').hidden = !on;
  $('unfinish').hidden = !on;
  $('finish-actions').hidden = on;
}

$('finish').addEventListener('click', async () => {
  const r = await post('/api/progress', { text_id: config.textId, finished: true });
  if (!r.ok) return;
  showFinished(true);
  await celebrate(config.i18n.textDone, (await r.json()).xp);
});
$('unfinish').addEventListener('click', async () => {
  if ((await post('/api/progress', { text_id: config.textId, finished: false })).ok) showFinished(false);
});

// ---- reading progress bar and remembered position -------------------------
// The scroll position is kept per text on this device, so reopening a text (e.g. from the
// library's "continue" card) continues where the student stopped.

const bar = $('progress');
const POS_KEY = `${brand.storagePrefix}.pos.${config.textId}`;
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
let saveTimer = 0;
const savePosition = () => {
  try {
    const max = maxScroll();
    localStorage.setItem(POS_KEY, String(max > 0 ? scrollY / max : 0));
  } catch {}
};
const onScroll = () => {
  const max = maxScroll();
  bar.style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 100) + '%';
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(savePosition, 400);
};
addEventListener('scroll', onScroll, { passive: true });
addEventListener('pagehide', savePosition);
try {
  const ratio = Number(localStorage.getItem(POS_KEY));
  if (ratio > 0) scrollTo(0, ratio * maxScroll());
} catch {}
savePosition();
onScroll();

// ---- text size and side panel width (this device) -------------------------

const root = document.documentElement;
const pref = (key: string, fallback: number) => {
  try {
    return Number(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
const store = (key: string, v: number) => {
  try {
    localStorage.setItem(key, String(v));
  } catch {}
};

let zoom = pref(`${brand.storagePrefix}.zoom`, 1);
const setZoom = (z: number) => {
  zoom = Math.min(2, Math.max(0.8, Math.round(z * 10) / 10));
  root.style.setProperty('--zoom', String(zoom));
  store(`${brand.storagePrefix}.zoom`, zoom);
};
setZoom(zoom);
$('zoom-out').addEventListener('click', () => setZoom(zoom - 0.1));
$('zoom-in').addEventListener('click', () => setZoom(zoom + 0.1));

const setSide = (px: number) => {
  // Panel 300px..60% of the window, and the text always keeps at least ~480px.
  const w = Math.round(Math.max(300, Math.min(px, innerWidth * 0.6, innerWidth - 560)));
  root.style.setProperty('--side', w + 'px');
  return w;
};
setSide(pref(`${brand.storagePrefix}.side`, 416));
const measureTop = () => root.style.setProperty('--top-h', (document.querySelector('.top')?.getBoundingClientRect().height ?? 72) + 'px');
measureTop();
addEventListener('resize', () => {
  measureTop();
  setSide(pref(`${brand.storagePrefix}.side`, 416));
});

const resizer = document.querySelector<HTMLElement>('.resizer')!;
resizer.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  resizer.setPointerCapture(e.pointerId);
  resizer.classList.add('drag');
  const move = (ev: PointerEvent) => setSide(innerWidth - ev.clientX);
  const up = (ev: PointerEvent) => {
    store(`${brand.storagePrefix}.side`, setSide(innerWidth - ev.clientX));
    resizer.classList.remove('drag');
    resizer.removeEventListener('pointermove', move);
    resizer.removeEventListener('pointerup', up);
  };
  resizer.addEventListener('pointermove', move);
  resizer.addEventListener('pointerup', up);
});
