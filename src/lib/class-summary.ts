// Class dashboard numbers from the rows insights.ts loads (pure, so they can be tested).
import { streakFrom } from './xp-dates.ts';

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
type StudentRow = Omit<StudentInsight, 'streak' | 'daily' | 'inactive'>;

/** Each student's streak, daily chart and inactivity, most XP this week first, plus class totals. */
export function summarizeClass(rows: StudentRow[], activity: { user_id: number; day: string; xp: number }[], days: string[], now = Date.now()) {
  const active = new Map<number, Set<string>>();
  const xpOn = new Map<string, number>();
  for (const r of activity) {
    if (!active.has(r.user_id)) active.set(r.user_id, new Set());
    active.get(r.user_id)!.add(r.day);
    xpOn.set(`${r.user_id}|${r.day}`, r.xp);
  }
  const weekAgo = now / 1000 - 7 * 86_400;
  const students: StudentInsight[] = rows
    .map((s) => ({
      ...s,
      streak: streakFrom(active.get(s.id) ?? new Set(), now),
      daily: days.map((d) => xpOn.get(`${s.id}|${d}`) ?? 0),
      inactive: !s.last_active_at || s.last_active_at < weekAgo,
    }))
    .sort((a, b) => b.xp_week - a.xp_week || a.name.localeCompare(b.name));

  const sum = (k: keyof StudentInsight) => students.reduce((n, s) => n + Number(s[k]), 0);
  return {
    students,
    totals: {
      students: students.length,
      active: students.filter((s) => s.xp_week > 0).length,
      xp: sum('xp_week'),
      words: sum('words_week'),
      texts: sum('finished_week'),
    },
  };
}
