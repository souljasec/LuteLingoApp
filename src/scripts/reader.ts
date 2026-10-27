// Reader: word/phrase selection, Lute-style term statuses, and the translation sheet (translation,
// pronunciation with word highlighting, Tatoeba examples). Sheet ported from
// lute-custom/custom/vi.html; selection and statuses follow Lute: long-press the first word, tap
// the last; statuses in lib/terms.ts, words without a status are new.
// Text from outside sources is only ever set via textContent.

import { pickVoice } from './voice.ts';
import { brand } from '../brand/brand';
import { locale } from '../brand/locale';
import { baseForms } from '../lib/lemma.ts';
import { exampleBold, googleText, isShortQuery, myMemoryResult, tatoebaExamples, type Example } from '../lib/meanings.ts';
import { newParent, parentChoice, savedTerm, scrollFor, sourceSentence, spokenAt, wordParts, type WordPart } from '../lib/sheet.ts';
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

/** The user's saved term for a word or phrase as shown, if any. */
const known = (q: string): Term | undefined => config.terms[q.toLowerCase()];
/** Its level; a term saved by linking a base word starts at 1. */
const levelOf = (q: string) => known(q)?.s ?? 1;

// ---- speech ---------------------------------------------------------------

/** Render text as one span per word so speech can highlight the word being spoken. */
function words(el: HTMLElement, text: string, isBold: (t: string) => boolean = () => false) {
  el.replaceChildren(...wordParts(text).map((p) => (p.word ? wordSpan(p, isBold(p.text)) : p.text)));
}

function wordSpan(p: WordPart, bold: boolean) {
  const w = document.createElement(bold ? 'b' : 'span');
  w.className = 'tw';
  w.dataset.start = String(p.start);
  w.textContent = p.text;
  return w;
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
  u.onboundary = (e) => markSpoken(spans, e);
  u.onend = u.onerror = unmark;
  unmark();
  s.cancel();
  s.speak(u);
}

/** Marks the word being spoken (word boundaries only; some voices also report sentences). */
function markSpoken(spans: HTMLElement[], e: SpeechSynthesisEvent) {
  if (e.name && e.name !== 'word') return;
  unmark();
  spans[spokenAt(spans.map((x) => Number(x.dataset.start)), e.charIndex)]?.classList.add('now');
}

const unmark = () => document.querySelectorAll('.tw.now').forEach((x) => x.classList.remove('now'));

// ---- translation & examples ---------------------------------------------

// Direct lookups from the phone: used when the server's sources refuse Cloudflare's shared IPs (429).
// Each phone has its own IP, like the Lute panel had. Results are not written to the shared cache.
async function translateHere(q: string): Promise<{ vi: string; alts: string[] }> {
  const g = await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=' + locale.translateTo + '&q=' + encodeURIComponent(q))
    .then(async (r) => googleText(await r.json()))
    .catch(() => ''); // blocked, offline or not JSON: try MyMemory
  if (g) return { vi: g, alts: [] };
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|' + locale.translateTo + '&q=' + encodeURIComponent(q));
  return { vi: myMemoryResult(await r.json()).main, alts: [] };
}

/** The server's translation, or null when it refused or failed. Not logged in: off to the login page. */
async function serverTranslation(q: string): Promise<{ vi?: string; alts?: string[] } | null> {
  const r = await fetch('/api/translate?q=' + encodeURIComponent(q)).catch(() => null);
  if (r?.status === 401) location.assign('/login');
  return r?.ok ? r.json() : null;
}

const saveTerm = (body: { term: string; translation: string; status: Status; parent?: string; sentence?: string }) =>
  fetch('/api/words', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** Server first; when its sources refuse Cloudflare's IPs, straight from this phone. Null when both fail. */
async function lookUp(q: string) {
  const j = await serverTranslation(q);
  return j?.vi ? j : translateHere(q).catch(() => null);
}

async function translate(q: string) {
  const own = showOwn(q);
  const j = await lookUp(q);
  if (q === current) showResult(j, own); // else the user already tapped another word
}

/** The looked-up meaning, unless the term's own is already shown; an error only when there is nothing to show. */
function showResult(j: { vi?: string; alts?: string[] } | null, own: string) {
  if (j?.vi) showMeaning(j.vi, j.alts ?? [], !own);
  else if (!own) showFailed();
}

/** A saved term shows its own translation at once (as in Lute); the lookup only adds alternatives. Returns it. */
function showOwn(q: string) {
  const own = known(q)?.t || '';
  $('vi').className = isShortQuery(q) ? 'vi' : 'vi long';
  $('vi').textContent = own || '…';
  $('alts').textContent = '';
  currentVi = own;
  return own;
}

function showMeaning(meaning: string, alts: string[], replace: boolean) {
  if (replace) {
    $('vi').textContent = meaning;
    currentVi = meaning;
  }
  if (alts.length) $('alts').textContent = config.i18n.other + ': ' + alts.join(', ');
}

function showFailed() {
  $('vi').className = 'vi err';
  $('vi').textContent = config.i18n.failed;
}

const TATOEBA = { vi: 'vie', id: 'ind' }[locale.translateTo];

async function examples(q: string) {
  const box = $('ex');
  box.hidden = true;
  $('ex-list').replaceChildren();
  if (!isShortQuery(q)) return;
  const items = await tatoeba(q);
  if (q !== current || !items.length) return;
  const isBold = exampleBold(q);
  $('ex-list').replaceChildren(...items.map((x) => exampleRow(x, isBold)));
  box.hidden = false;
}

/** Example sentences for a word; none when Tatoeba is unreachable (examples are optional). */
const tatoeba = (q: string): Promise<Example[]> =>
  fetch('https://api.tatoeba.org/unstable/sentences?lang=eng&sort=relevance&limit=20&trans:lang=' + TATOEBA + '&q=' + encodeURIComponent(q))
    .then(async (r) => tatoebaExamples((await r.json()).data, TATOEBA))
    .catch(() => []);

/** One example: a speaker button, the English sentence (looked-up words in bold) and its translation. */
function exampleRow(x: Example, isBold: (t: string) => boolean) {
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
  tr.textContent = x.tr;
  const col = document.createElement('div');
  col.append(en, tr);
  row.append(b, col);
  return row;
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
  if (term.includes(' ')) recolourPhrase(term, s);
  else recolourWord(term, s);
}

function recolourPhrase(term: string, s: number | undefined) {
  document.querySelectorAll<HTMLElement>('#text .mw').forEach((m) => m.dataset.term === term && paint(m, s));
  // A phrase saved just now has no .mw wrapper until reload: colour the selected words.
  document.querySelectorAll('#text .w.sel').forEach((w) => !w.closest('.mw') && paint(w, s));
}

/** Single words outside saved phrases (a phrase keeps its own colour). */
function recolourWord(term: string, s: number | undefined) {
  document.querySelectorAll('#text .w').forEach((w) => !w.closest('.mw') && w.textContent!.toLowerCase() === term && paint(w, s));
}

// ---- parent terms (Lute) -----------------------------------------------------
// "went" can be linked to its base word "go": the panel then shows go's meaning too.

function showParent(q: string) {
  const box = $('parent-box');
  box.hidden = q.includes(' ');
  if (box.hidden) return;
  const parent = config.terms[q.toLowerCase()]?.p;
  $('parent-linked').hidden = !parent;
  $('parent-pick').hidden = !!parent;
  ($('parent-form') as HTMLFormElement).hidden = true;
  if (parent) showLinked(parent);
  else showSuggestions(q.toLowerCase());
}

/** The linked base word and its meaning (looked up once if it has none yet). */
function showLinked(parent: string) {
  const el = $('parent-text');
  const b = document.createElement('b');
  b.textContent = parent;
  el.replaceChildren(b);
  const meaning = config.terms[parent]?.t;
  if (meaning) el.append(' · ' + meaning);
  else fillParentMeaning(parent);
}

/** One chip per suggested base word; a tap links it. */
function showSuggestions(term: string) {
  $('parent-chips').replaceChildren(
    ...baseForms(term).map((base) => {
      const c = document.createElement('button');
      c.className = 'chip';
      c.textContent = base;
      c.onclick = () => linkParent(base);
      return c;
    }),
  );
}

/** A parent created by linking has no meaning yet: look it up once and save it with the parent. */
async function fillParentMeaning(parent: string) {
  const j = await serverTranslation(parent);
  if (!j?.vi) return;
  config.terms[parent] = savedTerm(known(parent), j.vi, levelOf(parent));
  await saveTerm({ term: parent, translation: j.vi, status: config.terms[parent].s });
  if (known(current)?.p === parent) showParent(current);
}

async function linkParent(input: string | null) {
  const term = current.toLowerCase();
  const p = parentChoice(term, input);
  if (p === null) return;
  const status = levelOf(term);
  const r = await saveTerm({ term, translation: currentVi, status, parent: p, sentence: sourceSentence(term, sentence) });
  if (!r.ok) return;
  const j = await r.json();
  xpFeedback(j.xp);
  config.terms[term] = savedTerm(config.terms[term], currentVi, status, p);
  recolour(term, status); // a word linked before it had a level gets one
  const added = newParent(p, j.parent, config.terms);
  if (added) {
    config.terms[p] = added;
    recolour(p, added.s);
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

async function setStatus(s: Status) {
  const term = current.toLowerCase();
  const r = await saveTerm({ term, translation: currentVi, status: s, sentence: sourceSentence(term, sentence) });
  if (!r.ok) return;
  xpFeedback((await r.json()).xp);
  config.terms[term] = savedTerm(config.terms[term], currentVi, s); // keeps its base word, as the server does
  recolour(term, s);
  showStatus(current);
}

async function removeTerm() {
  const term = current.toLowerCase();
  const r = await fetch('/api/words?term=' + encodeURIComponent(term), { method: 'DELETE' });
  if (!r.ok) return;
  delete config.terms[term];
  recolour(term, undefined);
  showStatus(current);
}

$('status-box').addEventListener('click', (e) => {
  const s = Number((e.target as HTMLElement).closest<HTMLElement>('[data-s]')?.dataset.s);
  if (isStatus(s)) setStatus(s);
});
$('remove').addEventListener('click', removeTerm);

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
  show(q, isShortQuery(q));
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
  const by = scrollFor(top, bottom, header, limit);
  if (by) scrollBy({ top: by, behavior: 'smooth' });
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
