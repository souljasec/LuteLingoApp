import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { dueFor } from '../../lib/srs.ts';
import { XP, award } from '../../lib/xp.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const STATUSES = new Set([1, 2, 3, 4, 5, 98, 99]);
export const MAX_PHRASE = 5; // words; longer selections are sentences, not vocabulary
const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 200);

/**
 * Set a term: POST {term, translation, status, parent?}.
 * - Choosing a status schedules its next flashcard review.
 * - parent links a base form ("went" → "go"); the parent is created if missing (as in Lute).
 *   parent "" unlinks; parent omitted leaves it as is.
 * Returns the parent's {t, s} when linked, so the sheet can show it.
 * Remove a term: DELETE ?term=.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const body = (await request.json().catch(() => ({}))) as { term?: string; translation?: string; status?: number; parent?: string; sentence?: string };
  const term = clean(body.term);
  const translation = String(body.translation ?? '').trim().slice(0, 500);
  const sentence = String(body.sentence ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const status = Number(body.status ?? 1);
  const parent = body.parent === undefined ? null : clean(body.parent);
  if (!term || !STATUSES.has(status) || parent === term) return json({ error: 'invalid' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const exists = env.DB.prepare('SELECT 1 FROM saved_words WHERE user_id = ? AND term = ?').bind(user.id, term);
  // New phrases are capped; long terms saved before the cap can still be changed or removed.
  if (term.split(' ').length > MAX_PHRASE && !(await exists.first())) return json({ error: 'too long' }, 400);

  const stmts = [
    // XP only for a term marked for the first time, so changing levels back and forth earns nothing.
    // Checked inside the batch (one transaction), so parallel saves of a new word pay once.
    exists,
    // An empty translation never overwrites one we already have.
    env.DB.prepare(
      `INSERT INTO saved_words (user_id, term, translation, status, due_at, parent, sentence) VALUES (?1, ?2, ?3, ?4, ?5, coalesce(?6, ''), ?7)
       ON CONFLICT (user_id, term) DO UPDATE SET
         translation = CASE WHEN ?3 = '' THEN saved_words.translation ELSE ?3 END,
         due_at = CASE WHEN saved_words.status = ?4 THEN saved_words.due_at ELSE ?5 END,
         status = ?4,
         parent = coalesce(?6, saved_words.parent),
         sentence = CASE WHEN saved_words.sentence = '' THEN ?7 ELSE saved_words.sentence END`,
    ).bind(user.id, term, translation, status, dueFor(status, now), parent, sentence),
  ];
  if (parent) {
    stmts.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO saved_words (user_id, term, translation, status, due_at) VALUES (?, ?, '', ?, ?)`,
      ).bind(user.id, parent, status, dueFor(status, now)),
      env.DB.prepare('SELECT translation AS t, status AS s FROM saved_words WHERE user_id = ? AND term = ?').bind(user.id, parent),
    );
  }
  const results = await env.DB.batch<{ t: string; s: number }>(stmts);
  const existed = results[0].results.length > 0;
  // Ignoring a word (98) is not learning it.
  const xp = await award(user, existed || status === 98 ? 0 : XP.newWord, 'words');
  return json({ ok: true, parent: parent ? (results.at(-1)?.results[0] ?? null) : null, xp });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const term = clean(url.searchParams.get('term'));
  await env.DB.prepare('DELETE FROM saved_words WHERE user_id = ? AND term = ?').bind(locals.user!.id, term).run();
  return json({ ok: true });
};
