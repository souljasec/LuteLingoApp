// Class dashboard data: per-student progress, weekly totals, daily activity, popular texts.
import { env } from 'cloudflare:workers';
import { streakFrom, twoWeeks, localDay, weekStart } from './xp-dates.ts';
import { locale } from '../brand/locale.ts';

/** Unix seconds of a school date at 00:00. */
const localMidnight = (day: string) => Date.parse(day + 'T00:00:00Z') / 1000 - locale.utcOffset * 3600;

export type StudentInsight = {
  id: number;
  name: string;
  last_active_at: number | null;
  known: number;
  learning: number;
  finished: number;
  xp_week: number;
  words_week: number;
  finished_week: number;
  streak: number;
  daily: number[]; // XP per day, Monday last week → Sunday this week (days still to come: 0)
  inactive: boolean; // no activity for 7+ days (or never)
};

export async function classInsights(classId: number) {
  const week = weekStart();
  const weekTs = localMidnight(week);
  const [students, activity, topTexts] = await env.DB.batch<any>([
    env.DB.prepare(
      `SELECT u.id, u.name, u.last_active_at,
         (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND w.status = 99) AS known,
         (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND w.status BETWEEN 1 AND 5) AS learning,
         (SELECT count(*) FROM progress p WHERE p.user_id = u.id AND p.finished_at IS NOT NULL) AS finished,
         (SELECT coalesce(sum(a.xp), 0) FROM activity a WHERE a.user_id = u.id AND a.day >= ?2) AS xp_week,
         (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND w.status != 98 AND w.created_at >= ?3) AS words_week,
         (SELECT count(*) FROM progress p WHERE p.user_id = u.id AND p.finished_at >= ?3) AS finished_week
       FROM class_members m JOIN users u ON u.id = m.user_id WHERE m.class_id = ?1`,
    ).bind(classId, week, weekTs),
    // Active days for streaks (a year back is plenty) and daily XP for the chart.
    env.DB.prepare(
      `SELECT a.user_id, a.day, a.xp FROM activity a JOIN class_members m ON m.user_id = a.user_id
       WHERE m.class_id = ? AND a.xp > 0 AND a.day >= ?`,
    ).bind(classId, localDay(400)),
    env.DB.prepare(
      `SELECT t.title, count(*) AS n FROM progress p
       JOIN class_members m ON m.user_id = p.user_id JOIN texts t ON t.id = p.text_id
       WHERE m.class_id = ? AND p.finished_at IS NOT NULL AND t.visibility != 'private'
       GROUP BY t.id ORDER BY n DESC, t.title LIMIT 5`,
    ).bind(classId),
  ]);

  const days = new Map<number, Set<string>>();
  const xpOn = new Map<string, number>();
  for (const r of activity.results as { user_id: number; day: string; xp: number }[]) {
    if (!days.has(r.user_id)) days.set(r.user_id, new Set());
    days.get(r.user_id)!.add(r.day);
    xpOn.set(`${r.user_id}|${r.day}`, r.xp);
  }
  const days14 = twoWeeks();
  const weekAgo = Date.now() / 1000 - 7 * 86_400;
  const list: StudentInsight[] = (students.results as Omit<StudentInsight, 'streak' | 'daily' | 'inactive'>[])
    .map((s) => ({
      ...s,
      streak: streakFrom(days.get(s.id) ?? new Set()),
      daily: days14.map((d) => xpOn.get(`${s.id}|${d}`) ?? 0),
      inactive: !s.last_active_at || s.last_active_at < weekAgo,
    }))
    .sort((a, b) => b.xp_week - a.xp_week || a.name.localeCompare(b.name));

  const sum = (k: keyof StudentInsight) => list.reduce((n, s) => n + Number(s[k]), 0);
  return {
    students: list,
    totals: {
      students: list.length,
      active: list.filter((s) => s.xp_week > 0).length,
      xp: sum('xp_week'),
      words: sum('words_week'),
      texts: sum('finished_week'),
    },
    days: days14,
    topTexts: topTexts.results as { title: string; n: number }[],
  };
}

/** Members active this week and XP this week, for the class list. */
export async function classSummaries() {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.join_code,
       (SELECT count(*) FROM class_members m WHERE m.class_id = c.id) AS members,
       (SELECT count(DISTINCT a.user_id) FROM activity a JOIN class_members m ON m.user_id = a.user_id
          WHERE m.class_id = c.id AND a.day >= ?1 AND a.xp > 0) AS active,
       (SELECT coalesce(sum(a.xp), 0) FROM activity a JOIN class_members m ON m.user_id = a.user_id
          WHERE m.class_id = c.id AND a.day >= ?1) AS xp
     FROM classes c ORDER BY c.name`,
  )
    .bind(weekStart())
    .all<{ id: number; name: string; join_code: string; members: number; active: number; xp: number }>();
  return results;
}
