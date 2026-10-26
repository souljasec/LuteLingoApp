import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { firstReward, getText } from '../../lib/texts.ts';
import { XP, award } from '../../lib/xp.ts';

// Mark a text finished or not: POST {text_id, finished}.
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const body = (await request.json().catch(() => ({}))) as { text_id?: number; finished?: boolean };
  const text = await getText(user, Number(body.text_id));
  if (!text) return new Response('{"error":"not found"}', { status: 404 });
  await env.DB.prepare(
    `INSERT INTO progress (user_id, text_id, finished_at) VALUES (?1, ?2, ?3)
     ON CONFLICT (user_id, text_id) DO UPDATE SET finished_at = ?3`,
  )
    .bind(user.id, text.id, body.finished ? Math.floor(Date.now() / 1000) : null)
    .run();
  // XP once per text: the first time it is finished.
  const xp = await award(user, body.finished && (await firstReward(user, text.id)) ? XP.textFinished : 0, 'texts');
  return new Response(JSON.stringify({ ok: true, xp }), { headers: { 'content-type': 'application/json' } });
};
