// XP, daily goal, streak and weekly leaderboard (Duolingo-style). Days are Vietnam dates (UTC+7).
import { env } from 'cloudflare:workers';
import { streakFrom, vnDay, weekStart } from './xp-dates.ts';

export { streakFrom, vnDay, weekStart };

export const XP = { newWord: 1, reviewGood: 2, reviewAgain: 1, textFinished: 10, gameRound: 5 } as const;
/** Daily XP caps per source (anti-farming; see THREATS.md X1-X3). */
export const CAPS = { words: 50, reviews: 100, texts: 50, games: 30 } as const;
export type Source = keyof typeof CAPS;
export const GOALS = [10, 20, 30, 50] as const;
export type Today = { xp: number; goal: number; streak: number };

export async function today(user: { id: number }): Promise<Today> {
  const [{ results }, u] = await env.DB.batch<any>([
    // A year back is plenty for a streak.
    env.DB.prepare('SELECT day, xp FROM activity WHERE user_id = ? AND day >= ? AND xp > 0').bind(user.id, vnDay(400)),
    env.DB.prepare('SELECT daily_goal FROM users WHERE id = ?').bind(user.id),
  ]);
  const days = new Set<string>(results.map((r: { day: string }) => r.day));
  const xp = results.find((r: { day: string }) => r.day === vnDay())?.xp ?? 0;
  return { xp, goal: u.results[0]?.daily_goal ?? 20, streak: streakFrom(days) };
}

/**
 * Add XP for today from one source, capped per day, and return the new totals
 * (the client celebrates when the goal is crossed). `gained` is what was actually added.
 */
export async function award(user: { id: number }, amount: number, source: Source): Promise<Today & { gained: number }> {
  let gained = 0;
  if (amount > 0) {
    const col = `xp_${source}`; // from a fixed set, never user input
    const day = vnDay();
    const row = await env.DB.prepare(`SELECT ${col} AS n FROM activity WHERE user_id = ? AND day = ?`)
      .bind(user.id, day)
      .first<{ n: number }>();
    gained = Math.max(0, Math.min(amount, CAPS[source] - (row?.n ?? 0)));
    if (gained > 0) {
      await env.DB.prepare(
        `INSERT INTO activity (user_id, day, xp, ${col}) VALUES (?1, ?2, ?3, ?3)
         ON CONFLICT (user_id, day) DO UPDATE SET xp = xp + ?3, ${col} = ${col} + ?3`,
      )
        .bind(user.id, day, gained)
        .run();
    }
  }
  return { ...(await today(user)), gained };
}

/** This week's XP for every member of a class, highest first. */
export async function leaderboard(classId: number) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.name, coalesce(sum(a.xp), 0) AS xp
     FROM class_members m JOIN users u ON u.id = m.user_id
     LEFT JOIN activity a ON a.user_id = u.id AND a.day >= ?2
     WHERE m.class_id = ?1 GROUP BY u.id ORDER BY xp DESC, u.name`,
  )
    .bind(classId, weekStart())
    .all<{ id: number; name: string; xp: number }>();
  return results;
}
