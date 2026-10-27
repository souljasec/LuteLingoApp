import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { review } from '../../lib/srs.ts';
import { isLearning, type Learning } from '../../lib/terms.ts';
import { XP, award } from '../../lib/xp.ts';

// Flashcard answer: POST {term, correct}. Moves the term up a level (5 → known) or back to 1.
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const body = (await request.json().catch(() => ({}))) as { term?: string; correct?: boolean; translation?: string };
  const term = String(body.term ?? '').trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT status, due_at FROM saved_words WHERE user_id = ? AND term = ?')
    .bind(user.id, term)
    .first<{ status: number; due_at: number }>();
  if (!row || !isLearning(row.status)) return new Response('{"error":"not found"}', { status: 404 });
  // Only due cards can be answered: otherwise one card could be answered forever for XP (THREATS.md X1).
  if (row.due_at > now) return new Response('{"error":"not due"}', { status: 409 });
  const next = review(row.status as Learning, !!body.correct, now);
  // A card revealed with a freshly looked-up meaning keeps it (only if none was saved).
  const translation = String(body.translation ?? '').trim().slice(0, 500);
  await env.DB.prepare(
    `UPDATE saved_words SET status = ?, due_at = ?, translation = CASE WHEN translation = '' THEN ? ELSE translation END
     WHERE user_id = ? AND term = ?`,
  )
    .bind(next.status, next.due, translation, user.id, term)
    .run();
  const xp = await award(user, body.correct ? XP.reviewGood : XP.reviewAgain, 'reviews');
  return new Response(JSON.stringify({ ...next, xp }), { headers: { 'content-type': 'application/json' } });
};
