import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, randomToken, sha256, joinCode } from '../src/lib/crypto.ts';
import { parse, parseParagraph, wordsOf, findPhrases, gapSplit } from '../src/lib/tokenize.ts';

test('password hash verifies only the right password', async () => {
  const h = await hashPassword('correct horse');
  assert.match(h, /^pbkdf2\$100000\$/);
  assert.equal(await verifyPassword('correct horse', h), true);
  assert.equal(await verifyPassword('wrong horse', h), false);
  assert.notEqual(h, await hashPassword('correct horse'), 'salted');
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('tokens and codes', async () => {
  assert.equal(randomToken().length, 43);
  assert.notEqual(randomToken(), randomToken());
  assert.equal((await sha256('abc')).slice(0, 8), 'ba7816bf');
  assert.match(joinCode(), /^[A-HJKMNP-Z2-9]{6}$/);
});

const words = (text: string) => wordsOf(parse(text));
const sentences = (text: string) => parseParagraph(text).map((s) => s.map((t) => t.w).join('').trim());

test('words: Vietnamese names, contractions, curly apostrophes', () => {
  assert.deepEqual(words("Bác Hồ didn’t stop. It's 1945!"), ['bác', 'hồ', "didn't", 'stop', "it's"]);
});

test('sentences split like Lute, abbreviations stay inside', () => {
  assert.deepEqual(sentences('Mr. Smith lives in the U.S. at 9 a.m. with Dr. J. Brown. He is happy! Is he?'), [
    'Mr. Smith lives in the U.S. at 9 a.m. with Dr. J. Brown.',
    'He is happy!',
    'Is he?',
  ]);
  assert.deepEqual(words('Mr. Smith, U.S.'), ['mr.', 'smith', 'u.s.']);
  assert.deepEqual(sentences('Come in. No, thanks.'), ['Come in.', 'No, thanks.']);
  assert.deepEqual(words('Items.'), ['items']);
});

test('paragraphs are lines; text round-trips', () => {
  const text = 'Hi, you...\n\n  Second line.\nThird';
  const p = parse(text);
  assert.equal(p.length, 3);
  assert.equal(p[0].flat().map((t) => t.w).join(''), 'Hi, you…');
});

test('saved phrases are found longest-first without overlap', () => {
  const [s] = parseParagraph('A long time ago, King Le Loi got a magic sword.');
  const got = findPhrases(s, new Set(['long time ago', 'time ago', 'magic sword', 'king le loi']));
  assert.deepEqual(got.map(([a, b]) => s.slice(a, b + 1).map((t) => t.w).join('')), ['long time ago', 'King Le Loi', 'magic sword']);
});

import { baseForms } from '../src/lib/lemma.ts';
import { review, dueFor, INTERVAL } from '../src/lib/srs.ts';

test('base-form suggestions', () => {
  const first = (w: string) => baseForms(w)[0];
  assert.equal(first('went'), 'go');
  assert.equal(first('children'), 'child');
  assert.equal(first('better'), 'good');
  assert.equal(first('cities'), 'city');
  assert.equal(first('studied'), 'study');
  assert.equal(first('boxes'), 'box');
  assert.equal(first('cats'), 'cat');
  assert.equal(first('running'), 'run');
  assert.equal(first('stopped'), 'stop');
  assert.equal(first('walked'), 'walk');
  assert.ok(baseForms('making').includes('make'));
  assert.ok(baseForms('liked').includes('like'));
  assert.equal(first("Tom's"), 'tom');
  assert.deepEqual(baseForms('this'), []);
  assert.deepEqual(baseForms('morning'), []);
  assert.deepEqual(baseForms('go'), []);
});

test('flashcard scheduling', () => {
  const now = 1_000_000;
  assert.deepEqual(review(1, true, now), { status: 2, due: now + INTERVAL[2] });
  assert.deepEqual(review(5, true, now), { status: 99, due: 0 });
  assert.deepEqual(review(4, false, now), { status: 1, due: now + 600 });
  assert.equal(dueFor(1, now), now);
  assert.equal(dueFor(99, now), 0);
});

// xp.ts imports cloudflare:workers only inside functions that touch D1; the date helpers are pure.
test('Vietnam days, week start and streaks', async () => {
  const { vnDay, weekStart, streakFrom, twoWeeks } = await import('../src/lib/xp-dates.ts');
  const now = Date.UTC(2026, 9, 23, 18, 0); // Fri 23 Oct 18:00 UTC = Sat 24 Oct 01:00 in Vietnam
  assert.equal(vnDay(0, now), '2026-10-24');
  assert.equal(vnDay(1, now), '2026-10-23');
  assert.equal(weekStart(now), '2026-10-19'); // Monday
  const two = twoWeeks(now);
  assert.deepEqual([two.length, two[0], two[7], two[13]], [14, '2026-10-12', '2026-10-19', '2026-10-25']);
  const days = new Set(['2026-10-24', '2026-10-23', '2026-10-22', '2026-10-20']);
  assert.equal(streakFrom(days, now), 3);
  days.delete('2026-10-24'); // not active yet today: yesterday's streak is still alive
  assert.equal(streakFrom(days, now), 2);
  assert.equal(streakFrom(new Set(['2026-10-21']), now), 0);
});

test('gapSplit blanks the whole word only, keeping its capitals', () => {
  assert.deepEqual(gapSplit('Going home, I go slowly.', 'go'), ['Going home, I ', 'go', ' slowly.']);
  assert.deepEqual(gapSplit('Harbour lights.', 'harbour'), ['', 'Harbour', ' lights.']);
  assert.deepEqual(gapSplit("Well, it's up to you.", "it's up to you"), ['Well, ', "it's up to you", '.']);
  assert.equal(gapSplit('The cat sat.', 'a'), null);
  assert.deepEqual(gapSplit('Cost (a lot)?', 'lot)?'), ['Cost (a ', 'lot)?', ''], 'regex characters are literal');
});
