// School-time day helpers (locale.utcOffset), pure so they can be unit-tested.
import { locale } from '../brand/locale.ts';

const OFFSET = locale.utcOffset * 3600 * 1000;
/** For Intl.DateTimeFormat. Etc/GMT signs are inverted: UTC+8 is "Etc/GMT-8". */
export const TIME_ZONE = `Etc/GMT${locale.utcOffset > 0 ? '-' : '+'}${Math.abs(locale.utcOffset)}`;

/** YYYY-MM-DD at the school, `daysAgo` days back. */
export const localDay = (daysAgo = 0, now = Date.now()) => new Date(now + OFFSET - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** First school date loaded to compute a streak: a year back is plenty. */
export const streakStart = (now = Date.now()) => localDay(400, now);

/** Monday of the current school week. */
export function weekStart(now = Date.now()) {
  const d = new Date(now + OFFSET);
  const back = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return localDay(back, now);
}

/** Days in a row with XP, ending today, or yesterday if today has none yet (the streak is still alive). */
export function streakFrom(days: Set<string>, now = Date.now()) {
  let start = days.has(localDay(0, now)) ? 0 : 1;
  let n = 0;
  while (days.has(localDay(start + n, now))) n++;
  return n;
}

/** Monday of last week through Sunday of this week (14 school dates), so the class chart lines up with the weekly reset. */
export function twoWeeks(now = Date.now()) {
  const mon = Date.parse(weekStart(now) + 'T00:00:00Z') - 7 * 86_400_000;
  return Array.from({ length: 14 }, (_, i) => new Date(mon + i * 86_400_000).toISOString().slice(0, 10));
}
