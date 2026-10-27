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
test('School days, week start and streaks', async () => {
  const { localDay, weekStart, streakFrom, twoWeeks, TIME_ZONE } = await import('../src/lib/xp-dates.ts');
  const { locale } = await import('../src/brand/locale.ts');
  assert.equal(TIME_ZONE, `Etc/GMT${locale.utcOffset > 0 ? '-' : '+'}${Math.abs(locale.utcOffset)}`); // Etc/GMT signs are inverted
  const now = Date.UTC(2026, 9, 23, 18, 0); // Fri 23 Oct 18:00 UTC = Sat 24 Oct at UTC+6 to UTC+9
  assert.equal(localDay(0, now), '2026-10-24');
  assert.equal(localDay(1, now), '2026-10-23');
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

import { KNOWN, IGNORED, LEARNING, isStatus, statusClass, statusSql } from '../src/lib/terms.ts';

test('word levels: valid statuses, reader colours, SQL conditions', () => {
  assert.deepEqual([...LEARNING, IGNORED, KNOWN].map(isStatus), [true, true, true, true, true, true, true]);
  assert.deepEqual([0, 6, 97, 100, '1', undefined].map(isStatus), [false, false, false, false, false, false]);
  assert.deepEqual([undefined, 1, 5, IGNORED, KNOWN].map(statusClass), ['st0', 'st1', 'st5', '', '']);
  const w = statusSql('w.status');
  assert.deepEqual([w.learning, w.known, w.notIgnored], ['w.status BETWEEN 1 AND 5', 'w.status = 99', 'w.status != 98']);
  assert.equal(statusSql().known, 'status = 99');
});

import { parsePrefs } from '../src/lib/prefs.ts';

test('settings form: only listed choices are accepted', () => {
  const form = (o: Record<string, string>) => new Map(Object.entries(o));
  const ok = { ui_lang: 'en', text_size: 'large', speech_rate: 'slow', daily_goal: '30', theme: 'dim' };
  assert.deepEqual(parsePrefs(form(ok)), { ui_lang: 'en', text_size: 'large', speech_rate: 0.7, daily_goal: 30, theme: 'dim' });
  for (const [k, bad] of [['ui_lang', 'xx'], ['text_size', 'huge'], ['speech_rate', '2'], ['speech_rate', 'toString'], ['daily_goal', '25'], ['theme', 'neon']]) {
    assert.equal(parsePrefs(form({ ...ok, [k]: bad })), null, `${k}=${bad} refused`);
  }
  assert.equal(parsePrefs(form({})), null);
});

import { tryJoinCodes } from '../src/lib/crypto.ts';

test('join codes: retried on collision, given up after 5 tries', async () => {
  const seen: string[] = [];
  const got = await tryJoinCodes(async (code) => (seen.push(code) < 3 ? null : `class with ${code}`));
  assert.equal(seen.length, 3);
  assert.equal(got, `class with ${seen[2]}`);
  let tries = 0;
  assert.equal(await tryJoinCodes(async () => (tries++, null)), null);
  assert.equal(tries, 5);
});

import { cleanMeaning, otherMeanings } from '../src/lib/meanings.ts';

test('translation clean-up: markup, list dashes, final stops, accents', () => {
  assert.equal(cleanMeaning('<g id="1">thủ đô</g>'), 'thủ đô');
  assert.equal(cleanMeaning('- Anh đã bay.'), 'Anh đã bay');
  assert.equal(cleanMeaning('  bến   cảng  '), 'bến cảng');
  assert.equal(cleanMeaning('a > b'), 'a b', 'stray brackets go');
  const decomposed = 'cà phê'; // "cà" with a combining accent
  assert.equal(cleanMeaning(decomposed), 'cà phê', 'NFC: the same accents compare equal');
});

test('other meanings: split lists, drop the main meaning, repeats, English echoes and non-words', () => {
  const alts = ['thủ đô, tiền vốn', 'Thủ đô', 'vốn; tiền vốn', 'He flew', '123', 'trung tâm/thủ phủ', 'a', 'b', 'c', 'd'];
  assert.deepEqual(otherMeanings(alts, 'thủ đô', 'he flew'), ['tiền vốn', 'vốn', 'trung tâm', 'thủ phủ', 'a', 'b']);
  assert.deepEqual(otherMeanings([], 'x', 'y'), []);
});

import { pickGameWords } from '../src/lib/games.ts';

test('game words: one answer per question, sized per game', () => {
  const row = (term: string, translation = `nghĩa ${term}`, sentence = '') => ({ term, translation, sentence });
  const rows = (n: number, f = (i: number) => row(`w${i}`)) => Array.from({ length: n }, (_, i) => f(i));
  // Shared terms or meanings are skipped; the first meaning is used, long ones are cut.
  const picked = pickGameWords([row('a', 'một; thứ nhất'), row('A', 'khác'), row('b', 'một'), row('c', 'x'.repeat(60)), row('d', '')], 'listen');
  assert.deepEqual(picked, [], 'fewer than 5 usable words: no listen game');
  const five = pickGameWords([row('a', 'một; thứ nhất'), row('A', 'khác'), row('b', 'một'), row('c', 'x'.repeat(60)), row('d', ''), ...rows(3)], 'listen');
  assert.deepEqual(five.map((w) => w.t), ['a', 'c', 'w0', 'w1', 'w2']);
  assert.equal(five[0].m, 'một');
  assert.equal(five[1].m, 'x'.repeat(47) + '…');
  // match: a multiple of 5, at most 15. listen: at most 15.
  assert.equal(pickGameWords(rows(14), 'match').length, 10);
  assert.equal(pickGameWords(rows(40), 'match').length, 15);
  assert.equal(pickGameWords(rows(4), 'match').length, 0);
  assert.equal(pickGameWords(rows(40), 'listen').length, 15);
  // fill: words found in their sentence come first (up to 10 questions, at least 5), then wrong choices.
  const withSentence = (i: number) => row(`s${i}`, '', `I see s${i} here.`);
  assert.deepEqual(pickGameWords([...rows(10), ...rows(4, withSentence)], 'fill'), [], 'fewer than 5 questions');
  const fill = pickGameWords([...rows(10), ...rows(12, withSentence)], 'fill');
  assert.equal(fill.length, 15);
  assert.ok(fill.slice(0, 10).every((w) => w.s), 'questions first');
  assert.deepEqual(fill[0].s, ['I see ', 's0', ' here.']);
  assert.ok(fill.slice(10).every((w) => !w.s), 'then wrong choices');
});

import { canEdit, ownerFor, parseTextForm, textError, visibilityOptions } from '../src/lib/text-policy.ts';

const student = { id: 7, role: 'student' as const };
const teacher = { id: 1, role: 'admin' as const };

test('who may edit a text', () => {
  assert.equal(canEdit(student, { owner_id: 7, visibility: 'private' }), true, 'own text');
  assert.equal(canEdit(student, { owner_id: null, visibility: 'all' }), false, 'school text');
  assert.equal(canEdit(student, { owner_id: 8, visibility: 'classes' }), false, "a classmate's text");
  assert.equal(canEdit(teacher, { owner_id: null, visibility: 'all' }), true, 'admin: school text');
  assert.equal(canEdit(teacher, { owner_id: 8, visibility: 'classes' }), true, "admin: a student's class-shared text");
  assert.equal(canEdit(teacher, { owner_id: 8, visibility: 'private' }), false, "admin: never a student's private text");
});

test('text form: bounded fields, allowed audience only', () => {
  const form = (pairs: [string, string][]) => new URLSearchParams(pairs);
  const base: [string, string][] = [['title', '  T  '], ['body', 'a\r\nb  '], ['category', ' Kids '], ['level', '9']];
  const asStudent = { visibility: visibilityOptions(false), classIds: new Set([3, 4]), foreign: false, current: { visibility: 'private', classIds: [] } };
  const v = parseTextForm(form([...base, ['visibility', 'all'], ['class', '3'], ['class', '99']]), asStudent);
  assert.deepEqual(v, { title: 'T', body: 'a\nb', visibility: 'private', classIds: [3], category: 'Kids', level: 3 });
  assert.equal(parseTextForm(form([['title', 'x'.repeat(300)], ...base.slice(1)]), asStudent).title.length, 200);
  assert.equal(parseTextForm(form([...base.slice(0, 3), ['level', 'abc']]), asStudent).level, 0);
  // An admin moderating a student's text changes only the content, never owner or audience.
  const moderating = { ...asStudent, visibility: visibilityOptions(true), foreign: true, current: { visibility: 'classes', classIds: [4] } };
  const m = parseTextForm(form([...base, ['visibility', 'all'], ['class', '3']]), moderating);
  assert.deepEqual([m.visibility, m.classIds], ['classes', [4]]);
  assert.deepEqual(visibilityOptions(true), ['all', 'classes', 'private']);
  assert.deepEqual(visibilityOptions(false), ['private', 'classes']);
});

test('text checks, in order', () => {
  const ok = { title: 'T', body: 'B', visibility: 'private', classIds: [] as number[] };
  const none = { isNew: false, isAdmin: false, ownTexts: 0 };
  assert.equal(textError(ok, none), null);
  assert.equal(textError({ ...ok, title: '' , body: '' }, none), 'texts.errTitle');
  assert.equal(textError({ ...ok, body: '' }, none), 'texts.errBody');
  assert.equal(textError({ ...ok, body: 'x'.repeat(20_001) }, none), 'texts.errLong');
  assert.equal(textError({ ...ok, body: 'x'.repeat(20_000) }, none), null);
  assert.equal(textError({ ...ok, visibility: 'classes' }, none), 'texts.errClasses');
  assert.equal(textError(ok, { isNew: true, isAdmin: false, ownTexts: 200 }), 'texts.errTooMany');
  assert.equal(textError(ok, { isNew: true, isAdmin: false, ownTexts: 199 }), null);
  assert.equal(textError(ok, { isNew: true, isAdmin: true, ownTexts: 500 }), null, 'no limit for admins');
  assert.equal(textError(ok, { isNew: false, isAdmin: false, ownTexts: 200 }), null, 'editing is always allowed');
});

test('who owns a saved text', () => {
  assert.equal(ownerFor(student, 'classes', null), 7);
  assert.equal(ownerFor(teacher, 'all', null), null, 'school texts have no owner');
  assert.equal(ownerFor(teacher, 'classes', null), null);
  assert.equal(ownerFor(teacher, 'private', null), 1, "an admin's private text is theirs");
  assert.equal(ownerFor(teacher, 'classes', 8), 8, 'moderating keeps the student as owner');
});
