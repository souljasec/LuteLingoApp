import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { dueFor } from '../../lib/srs.ts';
import { json } from '../../lib/http.ts';
import { XP, award } from '../../lib/xp.ts';
import { cleanTerm, isTooLong, parseTermInput, paysNewWordXp, type TermInput } from '../../lib/terms.ts';


/**
 * Set a term: POST {term, translation, status, parent?}.
 * - Choosing a status schedules its next flashcard review.
 * - parent links a base form ("went" → "go"); the parent is created if missing (as in Lute).
 *   parent "" unlinks; parent omitted leaves it as is.
 * Returns the parent's {t, s} when linked, so the sheet can show it.
 * Remove a term: DELETE ?term=.
 */
const exists = (userId: number, term: string) => env.DB.prepare('SELECT 1 FROM saved_words WHERE user_id = ? AND term = ?').bind(userId, term);

/** New phrases are capped; long terms saved before the cap can still be changed or removed. */
const tooLongToAdd = async (userId: number, term: string) => isTooLong(term) && !(await exists(userId, term).first());

/** The batch that saves a term: [does it exist yet?, the upsert, then the parent's insert and read when linking]. */
function saveStatements(userId: number, v: TermInput, now: number) {
  const due = dueFor(v.status, now);
  return [
    // XP only for a term marked for the first time, so changing levels back and forth earns nothing.
    // Checked inside the batch (one transaction), so parallel saves of a new word pay once.
    exists(userId, v.term),
    // An empty translation never overwrites one we already have.
    env.DB.prepare(
      `INSERT INTO saved_words (user_id, term, translation, status, due_at, parent, sentence) VALUES (?1, ?2, ?3, ?4, ?5, coalesce(?6, ''), ?7)
       ON CONFLICT (user_id, term) DO UPDATE SET
         translation = CASE WHEN ?3 = '' THEN saved_words.translation ELSE ?3 END,
         due_at = CASE WHEN saved_words.status = ?4 THEN saved_words.due_at ELSE ?5 END,
         status = ?4,
         parent = coalesce(?6, saved_words.parent),
         sentence = CASE WHEN saved_words.sentence = '' THEN ?7 ELSE saved_words.sentence END`,
    ).bind(userId, v.term, v.translation, v.status, due, v.parent, v.sentence),
    ...(v.parent
      ? [
          env.DB.prepare(`INSERT OR IGNORE INTO saved_words (user_id, term, translation, status, due_at) VALUES (?, ?, '', ?, ?)`)
            .bind(userId, v.parent, v.status, due),
          env.DB.prepare('SELECT translation AS t, status AS s FROM saved_words WHERE user_id = ? AND term = ?').bind(userId, v.parent),
        ]
      : []),
  ];
}

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const v = parseTermInput(await request.json().catch(() => null));
  if (!v) return json({ error: 'invalid' }, 400);
  if (await tooLongToAdd(user.id, v.term)) return json({ error: 'too long' }, 400);
  const results = await env.DB.batch<{ t: string; s: number }>(saveStatements(user.id, v, Math.floor(Date.now() / 1000)));
  const xp = await award(user, paysNewWordXp(results[0].results.length > 0, v.status) ? XP.newWord : 0, 'words');
  return json({ ok: true, parent: v.parent ? results[3].results[0] : null, xp });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const term = cleanTerm(url.searchParams.get('term'));
  await env.DB.prepare('DELETE FROM saved_words WHERE user_id = ? AND term = ?').bind(locals.user!.id, term).run();
  return json({ ok: true });
};
