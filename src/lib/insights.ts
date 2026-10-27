// Class dashboard data: per-student progress, weekly totals, daily activity, popular texts.
import { env } from 'cloudflare:workers';
import { streakStart, twoWeeks, weekStart } from './xp-dates.ts';
import { summarizeClass } from './class-summary.ts';
import { locale } from '../brand/locale.ts';
import { statusSql } from './terms.ts';
import { COUNTS } from './admin.ts';

const W = statusSql('w.status');

/** Unix seconds of a school date at 00:00. */
const localMidnight = (day: string) => Date.parse(day + 'T00:00:00Z') / 1000 - locale.utcOffset * 3600;

export async function classInsights(classId: number) {
  const week = weekStart();
  const weekTs = localMidnight(week);
  const [students, activity, topTexts] = await env.DB.batch<any>([
    env.DB.prepare(
      `SELECT u.id, u.name, u.last_active_at, ${COUNTS},
         (SELECT coalesce(sum(a.xp), 0) FROM activity a WHERE a.user_id = u.id AND a.day >= ?2) AS xp_week,
         (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND ${W.notIgnored} AND w.created_at >= ?3) AS words_week,
         (SELECT count(*) FROM progress p WHERE p.user_id = u.id AND p.finished_at >= ?3) AS finished_week
       FROM class_members m JOIN users u ON u.id = m.user_id WHERE m.class_id = ?1`,
    ).bind(classId, week, weekTs),
    // Active days for streaks and daily XP for the chart.
    env.DB.prepare(
      `SELECT a.user_id, a.day, a.xp FROM activity a JOIN class_members m ON m.user_id = a.user_id
       WHERE m.class_id = ? AND a.xp > 0 AND a.day >= ?`,
    ).bind(classId, streakStart()),
    env.DB.prepare(
      `SELECT t.title, count(*) AS n FROM progress p
       JOIN class_members m ON m.user_id = p.user_id JOIN texts t ON t.id = p.text_id
       WHERE m.class_id = ? AND p.finished_at IS NOT NULL AND t.visibility != 'private'
       GROUP BY t.id ORDER BY n DESC, t.title LIMIT 5`,
    ).bind(classId),
  ]);

  const days14 = twoWeeks();
  return {
    ...summarizeClass(students.results, activity.results, days14),
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
