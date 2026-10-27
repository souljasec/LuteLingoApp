// Security and logic tests against a running app (default http://localhost:4330, local D1).
// Each test names the threat it covers in THREATS.md. Run: npm run test:e2e (dev server must be up).
//   BASE=http://localhost:4330 node --test 'test/e2e/*.e2e.ts'
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const RUN = Date.now().toString(36);
let n = 0;

/** Run SQL on the local D1 (setup only: promote admin, time-travel cards). */
function sql(command: string): any[] {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--json', '--command', command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(out).flatMap((r: any) => r.results ?? []);
}

/** A browser-like client: keeps cookies, sends a same-origin Origin header, never follows redirects. */
class Client {
  cookies = new Map<string, string>();
  email: string;
  password: string;
  constructor(email = '', password = 'pass-word-123') {
    this.email = email;
    this.password = password;
  }
  async req(path: string, init: RequestInit & { origin?: string; form?: Record<string, string>; json?: unknown } = {}) {
    const headers = new Headers(init.headers);
    headers.set('origin', init.origin ?? BASE);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    let body = init.body;
    if (init.form) {
      body = new URLSearchParams(init.form);
      headers.set('content-type', 'application/x-www-form-urlencoded');
    }
    if (init.json !== undefined) {
      body = JSON.stringify(init.json);
      headers.set('content-type', 'application/json');
    }
    const method = init.method ?? (body ? 'POST' : 'GET');
    const send = () => fetch(BASE + path, { ...init, method, headers, body, redirect: 'manual' });
    // The tests pause for synchronous `wrangler` setup calls; the dev server may close the idle
    // keep-alive socket meanwhile. That request never reached the server, so one retry is safe.
    const stale = (e: any) => ['UND_ERR_SOCKET', 'ECONNRESET'].includes(e?.cause?.code);
    const res = await send().catch((e) => (stale(e) ? send() : Promise.reject(e)));
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const [k, v] = kv.split('=');
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || v === '') this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    return res;
  }
  text = async (path: string) => (await this.req(path)).text();
  json = async (path: string, json: unknown, method = 'POST') => {
    const r = await this.req(path, { method, json });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  async signup(name = 'Student', extra: Record<string, string> = {}) {
    this.email = `${name.toLowerCase().replace(/\W/g, '')}.${RUN}.${n++}@test.example`;
    const r = await this.req('/signup', { form: { name, email: this.email, password: this.password, consent: 'on', ...extra } });
    assert.equal(r.status, 302, 'sign-up redirects');
    return this;
  }
  login = (password = this.password) => this.req('/login', { form: { email: this.email, password } });
  id = () => sql(`SELECT id FROM users WHERE email = '${this.email}'`)[0].id as number;
}

const location = (r: Response) => new URL(r.headers.get('location') ?? '', BASE).pathname;
const alert = async (r: Response) => (await r.text()).match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? '';

// Checked before the tests are declared, so `skip` sees the real answer.
const up = await fetch(BASE + '/login').then((r) => r.ok, () => false);
if (!up) console.warn(`[e2e] ${BASE} is not reachable: start the dev server first (npm run dev). Skipping.`);

const admin = new Client();
const alice = new Client(); // student in class A
const bob = new Client(); // student, no class
let classA = 0;
let classCode = '';

describe('security', { concurrency: false }, () => {
  before(async (t) => {
    if (!up) return;
    await admin.signup('Admin');
    sql(`UPDATE users SET role = 'admin' WHERE email = '${admin.email}'`);
    const r = await admin.req('/admin', { form: { name: `Class ${RUN}` } });
    classA = Number(location(r).split('/').pop());
    classCode = (await admin.text(`/admin/classes/${classA}`)).match(/<code[^>]*>([A-Z0-9]{6})</)![1];
    await alice.signup('Alice', { code: classCode });
    await bob.signup('Bob');
  });

  test('A1 unauthenticated users get no pages or API data', { skip: !up && 'dev server not running' }, async () => {
    const anon = new Client();
    assert.equal(location(await anon.req('/')), '/login');
    assert.equal(location(await anon.req('/words')), '/login');
    assert.equal(location(await anon.req('/admin')), '/login');
    assert.equal((await anon.req('/api/translate?q=cat')).status, 401);
    assert.equal((await anon.json('/api/words', { term: 'x', status: 1 })).status, 401);
  });

  test('A2 login error is the same for unknown email and wrong password', { skip: !up && 'dev server not running' }, async () => {
    const unknown = await alert(await new Client(`nobody.${RUN}@test.example`).login());
    const wrong = await alert(await new Client(bob.email).login('wrong-password'));
    assert.ok(unknown.length > 0);
    assert.equal(unknown, wrong);
  });

  test('A3 ten wrong passwords lock that account only; admin reset unlocks', { skip: !up && 'dev server not running' }, async () => {
    const victim = await new Client().signup('Victim');
    const attacker = new Client(victim.email);
    for (let i = 0; i < 10; i++) await attacker.login('wrong-password');
    const locked = await new Client(victim.email, victim.password).login();
    assert.equal(locked.status, 200, 'correct password refused while locked');
    assert.notEqual(await alert(locked), '');
    // A classmate on the same network is not affected.
    assert.equal(location(await new Client(bob.email).login()), '/');
    // Admin reset: shows a temporary password once, unlocks, logs out old sessions.
    const page = await (await admin.req(`/admin/students/${victim.id()}`, { form: { action: 'reset' } })).text();
    const temp = page.match(/<code[^>]*>([A-Za-z0-9]{10})</)![1];
    assert.equal(location(await victim.req('/')), '/login', 'old session revoked');
    assert.equal(location(await new Client(victim.email, temp).login()), '/');
  });

  test('A4 logout revokes the session server-side', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Leaver');
    const stolen = c.cookies.get('sid')!;
    await c.req('/logout', { method: 'POST' });
    const replay = new Client();
    replay.cookies.set('sid', stolen);
    assert.equal(location(await replay.req('/')), '/login');
  });

  test('A5 session cookie is HttpOnly, SameSite=Lax, path /', { skip: !up && 'dev server not running' }, async () => {
    const r = await new Client(bob.email).login();
    const c = r.headers.getSetCookie().find((x) => x.startsWith('sid='))!;
    assert.match(c, /HttpOnly/i);
    assert.match(c, /SameSite=Lax/i);
    assert.match(c, /Path=\//i);
  });

  test('C1 cross-site form and text/plain posts are rejected', { skip: !up && 'dev server not running' }, async () => {
    const evil = 'https://evil.example';
    assert.equal((await bob.req('/login', { origin: evil, form: { email: bob.email, password: bob.password } })).status, 403);
    assert.equal((await bob.req('/texts/edit', { origin: evil, form: { title: 'x', body: 'y', action: 'save' } })).status, 403);
    const plain = await bob.req('/api/words', {
      origin: evil,
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{"term":"csrf","status":1}',
    });
    assert.equal(plain.status, 403);
  });

  test('Z1 students cannot open admin pages', { skip: !up && 'dev server not running' }, async () => {
    for (const p of ['/admin', '/admin/students', '/admin/texts', `/admin/classes/${classA}`, `/admin/students/${admin.id()}`]) {
      assert.equal(location(await bob.req(p)), '/', p);
    }
    // Nor perform admin actions by posting directly.
    await bob.req(`/admin/students/${bob.id()}`, { form: { action: 'role' } });
    assert.equal(sql(`SELECT role FROM users WHERE email = '${bob.email}'`)[0].role, 'student');
  });

  test('Z2 private texts: other students and admins cannot read, edit or delete', { skip: !up && 'dev server not running' }, async () => {
    const r = await alice.req('/texts/edit', { form: { title: `Diary ${RUN}`, body: 'My secret.', action: 'save' } });
    const id = Number(location(r).split('/').pop());
    assert.ok(id > 0);
    assert.equal((await bob.req(`/read/${id}`)).status, 404);
    assert.equal(location(await bob.req(`/texts/edit?id=${id}`)), '/');
    await bob.req(`/texts/edit?id=${id}`, { form: { action: 'delete' } });
    assert.equal(sql(`SELECT count(*) AS n FROM texts WHERE id = ${id}`)[0].n, 1, 'still exists');
    assert.equal((await admin.req(`/read/${id}`)).status, 404, 'admin cannot read it');
    assert.ok(!(await admin.text('/')).includes(`Diary ${RUN}`), 'not in admin library');
    assert.ok(!(await admin.text(`/admin/students/${alice.id()}`)).includes(`Diary ${RUN}`), 'title hidden on student page');
    assert.equal((await alice.req(`/read/${id}`)).status, 200);
  });

  test('Z3 class texts are visible to members only, and stop when removed', { skip: !up && 'dev server not running' }, async () => {
    const r = await admin.req('/texts/edit', {
      form: { title: `Class only ${RUN}`, body: 'For class A.', visibility: 'classes', class: String(classA), action: 'save' },
    });
    const id = Number(location(r).split('/').pop());
    assert.equal((await alice.req(`/read/${id}`)).status, 200);
    assert.equal((await bob.req(`/read/${id}`)).status, 404);
    const extra = await new Client().signup('Leaving', { code: classCode });
    assert.equal((await extra.req(`/read/${id}`)).status, 200);
    await admin.req(`/admin/classes/${classA}`, { form: { action: 'remove', user: String(extra.id()) } });
    assert.equal((await extra.req(`/read/${id}`)).status, 404);
  });

  test('Z4 progress refuses texts the user cannot see', { skip: !up && 'dev server not running' }, async () => {
    const hidden = sql(`SELECT id FROM texts WHERE visibility = 'classes' AND title = 'Class only ${RUN}'`)[0].id;
    assert.equal((await bob.json('/api/progress', { text_id: hidden, finished: true })).status, 404);
  });

  test('Z5 leaderboard shows only your own classes', { skip: !up && 'dev server not running' }, async () => {
    const page = await bob.text(`/leaderboard?class=${classA}`);
    assert.ok(!page.includes('Alice'), 'bob (no class) sees no names from class A');
  });

  test('Z6 a student cannot publish a text to everyone', { skip: !up && 'dev server not running' }, async () => {
    const r = await bob.req('/texts/edit', { form: { title: `Spam ${RUN}`, body: 'Hello.', visibility: 'all', action: 'save' } });
    const id = Number(location(r).split('/').pop());
    const row = sql(`SELECT visibility, owner_id FROM texts WHERE id = ${id}`)[0];
    assert.equal(row.visibility, 'private');
    assert.equal(row.owner_id, bob.id());
    assert.equal((await alice.req(`/read/${id}`)).status, 404);
  });

  test('Z6b a student shares a text with their own class; admin can moderate it', { skip: !up && 'dev server not running' }, async () => {
    const r = await alice.req('/texts/edit', {
      form: { title: `Song ${RUN}`, body: 'La la la.', visibility: 'classes', class: '999999', category: 'Music', action: 'save' },
    });
    const id = Number(location(r).split('/').pop());
    // A class she is not in is dropped, so the form asks for a class instead of saving.
    assert.equal(id, 0);
    const ok = await alice.req('/texts/edit', {
      form: { title: `Song ${RUN}`, body: 'La la la.', visibility: 'classes', class: String(classA), category: 'Music', action: 'save' },
    });
    const sid = Number(location(ok).split('/').pop());
    const row = sql(`SELECT visibility, owner_id, category FROM texts WHERE id = ${sid}`)[0];
    assert.deepEqual([row.visibility, row.owner_id, row.category], ['classes', alice.id(), 'Music']);
    const mate = await new Client().signup('Mate', { code: classCode });
    assert.equal((await mate.req(`/read/${sid}`)).status, 200);
    assert.equal((await bob.req(`/read/${sid}`)).status, 404);
    // Classmates cannot edit it; an admin can, keeping the author and audience.
    await mate.req(`/texts/edit?id=${sid}`, { form: { title: 'Hacked', body: 'x', action: 'save' } });
    await admin.req(`/texts/edit?id=${sid}`, { form: { title: `Fixed ${RUN}`, body: 'Clean.', visibility: 'all', action: 'save' } });
    const after = sql(`SELECT title, visibility, owner_id FROM texts WHERE id = ${sid}`)[0];
    assert.deepEqual([after.title, after.visibility, after.owner_id], [`Fixed ${RUN}`, 'classes', alice.id()]);
    await admin.req(`/texts/edit?id=${sid}`, { form: { action: 'delete' } });
    assert.equal(sql(`SELECT id FROM texts WHERE id = ${sid}`).length, 0);
  });

  test('Z6d an admin adds a class text to the library as a credited copy; students cannot', { skip: !up && 'dev server not running' }, async () => {
    const r = await alice.req('/texts/edit', { form: { title: `Poem ${RUN}`, body: 'Roses are red.', visibility: 'classes', class: String(classA), action: 'save' } });
    const sid = Number(location(r).split('/').pop());
    // A classmate's promote is refused (canEdit), and the student herself has no promote.
    await alice.req(`/texts/edit?id=${sid}`, { form: { title: `Poem ${RUN}`, body: 'Roses are red.', visibility: 'classes', class: String(classA), action: 'promote' } });
    assert.equal(sql(`SELECT count(*) AS n FROM texts WHERE owner_id IS NULL AND body = 'Roses are red.'`)[0].n, 0);
    const p = await admin.req(`/texts/edit?id=${sid}`, { form: { title: `Poem ${RUN}`, body: 'Roses are red!', category: 'Poems', level: '1', action: 'promote' } });
    const pid = Number(location(p).split('/').pop());
    const copy = sql(`SELECT title, body, visibility, owner_id, category, level FROM texts WHERE id = ${pid}`)[0];
    assert.deepEqual(copy, { title: `Poem ${RUN} (by Alice)`, body: 'Roses are red!', visibility: 'all', owner_id: null, category: 'Poems', level: 1 });
    assert.equal(sql(`SELECT body FROM texts WHERE id = ${sid}`)[0].body, 'Roses are red.');
    assert.equal((await bob.req(`/read/${pid}`)).status, 200);
    sql(`DELETE FROM texts WHERE id IN (${sid}, ${pid})`);
  });

  test('W1 language switch never redirects to another site', { skip: !up && 'dev server not running' }, async () => {
    const c = new Client();
    for (const back of ['//evil.example', '/\\evil.example', 'https://evil.example', '/%2F%2Fevil.example']) {
      const r = await c.req(`/lang?to=en&back=${encodeURIComponent(back)}`);
      const to = new URL(r.headers.get('location')!, BASE);
      assert.equal(to.host, new URL(BASE).host, back);
    }
    assert.equal(location(await c.req('/lang?to=en&back=/signup')), '/signup');
  });

  test('S1 user text and saved translations are rendered as text, never HTML', { skip: !up && 'dev server not running' }, async () => {
    const r = await bob.req('/texts/edit', {
      form: { title: `<script>alert(1)</script>${RUN}`, body: 'Hello <img src=x onerror=alert(1)> world.', action: 'save' },
    });
    const id = Number(location(r).split('/').pop());
    await bob.json('/api/words', { term: 'hello', translation: '"><img src=x onerror=alert(2)>', status: 1 });
    const page = await bob.text(`/read/${id}`);
    assert.ok(!page.includes('<script>alert(1)'), 'title escaped');
    // Translations travel to the reader inside a quoted data-config attribute, where "<" is inert text.
    // What matters: the quote is escaped so nothing can break out, and no <img> exists outside attributes.
    assert.ok(!page.includes('"><img'), 'quote in translation is escaped (&quot;)');
    const outsideAttributes = page.replace(/="[^"]*"/g, '=""');
    assert.ok(!/<img src=x/i.test(outsideAttributes), 'no live <img> from body or translation');
    assert.ok(page.includes('&lt;script&gt;') || page.includes('&lt;script'), 'title shown as text');
    assert.ok(!(await bob.text('/')).includes('<script>alert(1)'));
  });

  test('X1 flashcards: a card can only be answered when due', { skip: !up && 'dev server not running' }, async () => {
    await bob.json('/api/words', { term: 'harbour', translation: 'bến cảng', status: 1 });
    const first = await bob.json('/api/review', { term: 'harbour', correct: false });
    assert.equal(first.status, 200);
    const again = await bob.json('/api/review', { term: 'harbour', correct: false });
    assert.equal(again.status, 409, 'not due again for 10 minutes');
  });

  test('X2 new-word XP is capped per day', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Farmer');
    let total = 0;
    for (let i = 0; i < 55; i++) total += (await c.json('/api/words', { term: `farm${i}`, status: 1 })).body.xp.gained;
    assert.equal(total, 50);
    // Re-marking an existing word or ignoring a new one earns nothing.
    assert.equal((await c.json('/api/words', { term: 'farm1', status: 3 })).body.xp.gained, 0);
  });

  test('X2b caps and first-save XP hold when requests arrive at the same time', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Racer');
    const burst = await Promise.all(Array.from({ length: 60 }, (_, i) => c.json('/api/words', { term: `race${i}`, status: 1 })));
    assert.equal(burst.reduce((n, r) => n + r.body.xp.gained, 0), 50, 'reported XP stops at the cap');
    assert.equal(sql(`SELECT xp_words FROM activity a JOIN users u ON u.id = a.user_id WHERE u.email = '${c.email}'`)[0].xp_words, 50, 'stored XP stops at the cap');
    const d = await new Client().signup('Twin');
    const same = await Promise.all(Array.from({ length: 5 }, () => d.json('/api/words', { term: 'twin', status: 1 })));
    assert.equal(same.reduce((n, r) => n + r.body.xp.gained, 0), 1, 'one new word pays once');
  });

  test('X3 finishing a text pays XP once, however often it is toggled', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Toggler');
    const gains = [];
    for (const finished of [true, false, true]) gains.push((await c.json('/api/progress', { text_id: 1, finished })).body.xp.gained);
    assert.deepEqual(gains, [10, 0, 0]);
  });

  test('X4 ignoring a word earns no XP', { skip: !up && 'dev server not running' }, async () => {
    assert.equal((await bob.json('/api/words', { term: `name${RUN}`, status: 98 })).body.xp.gained, 0);
  });

  test('G1 games: need 5 words, skip ignored words, +5 XP per round capped at 30/day, levels unchanged', { skip: !up && 'dev server not running' }, async () => {
    const c = new Client();
    await c.signup('Gamer');
    assert.ok(!(await c.text('/play/match')).includes('id="left"'), 'no board without words');
    for (let i = 0; i < 6; i++) await c.json('/api/words', { term: `game${i}${RUN}`, translation: `nghĩa ${i}`, status: 1 });
    await c.json('/api/words', { term: `hidden${RUN}`, translation: 'bỏ qua', status: 98 });
    const page = await c.text('/play/match');
    assert.ok(page.includes('id="left"'), 'board with 5+ words');
    assert.ok(!page.includes(`hidden${RUN}`), 'ignored words never appear');
    assert.ok((await c.text('/play/listen')).includes('id="choices"'), 'listen game with 5+ words');
    assert.ok(!(await c.text('/play/fill')).includes('id="choices"'), 'fill needs words saved with sentences');
    for (let i = 0; i < 5; i++) await c.json('/api/words', { term: `fillword${i}${RUN}`, translation: `từ ${i}`, status: 1, sentence: `We saw fillword${i}${RUN} today.` });
    assert.ok((await c.text('/play/fill')).includes('id="choices"'), 'fill game once 5 sentences exist');
    assert.equal((await c.json('/api/games', { game: 'nope' })).status, 400);
    const gains = [];
    for (let i = 0; i < 7; i++) gains.push((await c.json('/api/games', { game: 'match' })).body.xp.gained);
    assert.deepEqual(gains, [5, 5, 5, 5, 5, 5, 0]);
    assert.equal((await c.json('/api/games', { game: 'fill' })).body.xp.gained, 0, 'one cap shared by all games');
    assert.equal(sql(`SELECT count(*) AS n FROM saved_words w JOIN users u ON u.id = w.user_id WHERE u.email = '${c.email}' AND w.status = 1`)[0].n, 11, 'levels unchanged');
  });

  test('I1 invalid term input is rejected or bounded', { skip: !up && 'dev server not running' }, async () => {
    assert.equal((await bob.json('/api/words', { term: 'x', status: 7 })).status, 400);
    assert.equal((await bob.json('/api/words', { term: 'go', status: 1, parent: 'go' })).status, 400);
    assert.equal((await bob.json('/api/words', { term: '', status: 1 })).status, 400);
    await bob.json('/api/words', { term: 'a'.repeat(5000), status: 1 });
    assert.equal(sql(`SELECT max(length(term)) AS n FROM saved_words WHERE user_id = ${bob.id()}`)[0].n <= 200, true);
  });

  test('I2 sign-up validation: duplicate email and password length', { skip: !up && 'dev server not running' }, async () => {
    const dup = await new Client().req('/signup', { form: { name: 'Dup', email: bob.email.toUpperCase(), password: 'pass-word-123', consent: 'on' } });
    assert.equal(dup.status, 200);
    assert.notEqual(await alert(dup), '');
    const long = await new Client().req('/signup', {
      form: { name: 'Long', email: `long.${RUN}@test.example`, password: 'x'.repeat(201), consent: 'on' },
    });
    assert.notEqual(await alert(long), '');
  });

  test('D2 a student can keep at most 200 own texts', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Hoarder');
    const id = c.id();
    sql(`WITH RECURSIVE k(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM k WHERE i < 200)
         INSERT INTO texts (title, body, visibility, owner_id) SELECT 't' || i, 'b', 'private', ${id} FROM k`);
    const r = await c.req('/texts/edit', { form: { title: 'one more', body: 'b', action: 'save' } });
    assert.equal(r.status, 200);
    assert.notEqual(await alert(r), '');
  });

  test('D3 admin "add to class" with an unknown class does not crash', { skip: !up && 'dev server not running' }, async () => {
    const r = await admin.req(`/admin/students/${bob.id()}`, { form: { action: 'join', class: '999999' } });
    assert.equal(r.status, 302);
  });

  test('J1 an existing student joins a class with its code; a wrong code is refused', { skip: !up && 'dev server not running' }, async () => {
    const c = await new Client().signup('Joiner');
    const classText = sql(`SELECT id FROM texts WHERE title = 'Class only ${RUN}'`)[0].id;
    assert.equal((await c.req(`/read/${classText}`)).status, 404);
    const bad = await c.req('/account?join', { form: { code: 'ZZZZZZ' } });
    assert.notEqual(await alert(bad), '');
    const ok = await (await c.req('/account?join', { form: { code: classCode.toLowerCase() } })).text();
    assert.match(ok, /role="status"/);
    assert.equal((await c.req(`/read/${classText}`)).status, 200);
  });

  test('J5 a new join code replaces the old one', { skip: !up && 'dev server not running' }, async () => {
    const r = await admin.req('/admin', { form: { name: `Rotating ${RUN}` } });
    const id = Number(location(r).split('/').pop());
    const code = () => sql(`SELECT join_code FROM classes WHERE id = ${id}`)[0].join_code as string;
    const old = code();
    assert.equal(location(await admin.req(`/admin/classes/${id}`, { form: { action: 'code' } })), `/admin/classes/${id}`);
    const fresh = code();
    assert.match(fresh, /^[A-HJKMNP-Z2-9]{6}$/);
    assert.notEqual(fresh, old);
    const c = await new Client().signup('Rotator');
    assert.notEqual(await alert(await c.req('/account?join', { form: { code: old } })), '', 'old code refused');
    assert.match(await (await c.req('/account?join', { form: { code: fresh } })).text(), /role="status"/, 'new code works');
  });

  test('J2 the class dashboard is for admins only and lists the class', { skip: !up && 'dev server not running' }, async () => {
    const page = await admin.text(`/admin/classes/${classA}`);
    assert.ok(page.includes('Alice'), 'admin sees members');
    assert.ok(page.includes('id="xp-chart"') && page.includes('class="heat"'), 'daily XP heatmap');
    assert.ok(page.includes(`/admin/students/${alice.id()}`), 'heatmap rows link to the student');
    assert.equal(location(await alice.req(`/admin/classes/${classA}`)), '/');
  });

  test('J4 the admin student page shows numbers only, not words saved or texts read', { skip: !up && 'dev server not running' }, async () => {
    const c = new Client();
    await c.signup('Carol');
    await c.json('/api/words', { term: `secretword${RUN}`, translation: `bí mật ${RUN}`, status: 1 });
    await c.json('/api/progress', { text_id: 1, finished: true });
    const title = sql('SELECT title FROM texts WHERE id = 1')[0].title;
    const page = await admin.text(`/admin/students/${c.id()}`);
    assert.ok(!page.includes(`secretword${RUN}`) && !page.includes(`bí mật ${RUN}`), 'no saved words');
    assert.ok(!page.includes(title), 'no text titles');
    assert.match(page, /<dt[^>]*>1<\/dt><dd[^>]*>(texts finished|bài đã đọc xong|bacaan selesai)/, 'finished count shown');
  });

  test('J3 class categories limit the library; any unlimited class shows everything', { skip: !up && 'dev server not running' }, async () => {
    const kids = sql(`SELECT id FROM texts WHERE category = 'Kids' AND owner_id IS NULL LIMIT 1`)[0].id;
    const other = sql(`SELECT id FROM texts WHERE category = 'World' AND owner_id IS NULL LIMIT 1`)[0].id;
    const r = await admin.req('/admin', { form: { name: `Class ${RUN}` } });
    const k = Number(location(r).split('/').pop());
    const code = (await admin.text(`/admin/classes/${k}`)).match(/<code[^>]*>([A-Z0-9]{6})</)![1];
    const kid = await new Client().signup('Kid', { code });
    const shows = async (id: number) => (await kid.text('/')).includes(`href="/read/${id}"`);
    assert.ok(await shows(other), 'no categories ticked = everything');
    await admin.req(`/admin/classes/${k}`, { form: { action: 'cats', cat: 'Kids' } });
    assert.ok(await shows(kids));
    assert.ok(!(await shows(other)), 'limited to Kids');
    await kid.req('/account?join', { form: { code: classCode } });
    assert.ok(await shows(other), 'second, unlimited class adds everything');
  });

  test('P1 phrases: at most 5 words, and the source sentence is kept for flashcards', { skip: !up && 'dev server not running' }, async () => {
    const six = await alice.req('/api/words', { json: { term: 'one two three four five six', status: 1 } });
    assert.equal(six.status, 400);
    const ok = await alice.req('/api/words', { json: { term: "it's up to you", status: 1, sentence: "Well, it's up to you." } });
    assert.equal(ok.status, 200);
    assert.equal(sql(`SELECT sentence FROM saved_words WHERE user_id = ${alice.id()} AND term = 'it''s up to you'`)[0].sentence, "Well, it's up to you.");
    assert.match(await alice.text('/review'), /Well, it&#39;s up to you\.|Well, it's up to you\./);
  });

  test('T1 theme is saved per account and only known themes are accepted', { skip: !up && 'dev server not running' }, async () => {
    const form = { ui_lang: 'en', text_size: 'medium', speech_rate: 'normal', daily_goal: '20' };
    await bob.req('/account', { form: { ...form, theme: 'dim' } });
    assert.match(await bob.text('/'), /data-theme="dim"/);
    assert.match(await alice.text('/'), /data-theme="light"/);
    await bob.req('/account', { form: { ...form, theme: 'neon' } });
    assert.match(await bob.text('/'), /data-theme="dim"/, 'unknown theme ignored');
    const odd = await bob.req('/account', { form: { ...form, speech_rate: 'toString', theme: 'light' } });
    assert.equal(odd.status, 200, 'a built-in property name is refused, not a server error');
    assert.match(await bob.text('/'), /data-theme="dim"/, 'nothing saved');
  });

  test('K1 a category typed in other capitals reuses the existing spelling', { skip: !up && 'dev server not running' }, async () => {
    const title = `Cat case ${RUN}`;
    await admin.req('/texts/edit', { form: { title, body: 'A kids text.', visibility: 'all', category: 'kids', level: '1', action: 'save' } });
    const row = sql(`SELECT category FROM texts WHERE title = '${title}'`)[0];
    sql(`DELETE FROM texts WHERE title = '${title}'`);
    assert.equal(row.category, 'Kids');
  });

  test('L1 a student may set a level and category on their own text; it stays private by default', { skip: !up && 'dev server not running' }, async () => {
    await bob.req('/texts/edit', { form: { title: `Own level ${RUN}`, body: 'My text.', level: '2', category: 'sport', action: 'save' } });
    const row = sql(`SELECT level, category, visibility FROM texts WHERE owner_id = ${bob.id()} AND title = 'Own level ${RUN}'`)[0];
    assert.deepEqual([row.level, row.category, row.visibility], [2, 'Sport', 'private']);
  });

  after(() => {
    if (!up) return;
    // Remove everything this run created.
    sql(`DELETE FROM users WHERE email LIKE '%.${RUN}.%@test.example'`);
    sql(`DELETE FROM classes WHERE name = 'Class ${RUN}'`);
    sql(`DELETE FROM texts WHERE owner_id IS NULL AND title = 'Class only ${RUN}'`);
  });
});
