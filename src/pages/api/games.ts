import type { APIRoute } from 'astro';
import { XP, award } from '../../lib/xp.ts';
import { GAMES } from '../../lib/games.ts';
import { json } from '../../lib/http.ts';

// A finished game round: POST {game}. Pays XP (capped per day); never changes word levels.
export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => ({}))) as { game?: string };
  if (!GAMES.includes(body.game as never)) return json({ error: 'unknown game' }, 400);
  const xp = await award(locals.user!, XP.gameRound, 'games');
  return json({ ok: true, xp });
};
