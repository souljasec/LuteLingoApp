// Vietnam-time day helpers (UTC+7), pure so they can be unit-tested.

const VN_OFFSET = 7 * 3600 * 1000;

/** YYYY-MM-DD in Vietnam, `daysAgo` days back. */
export const vnDay = (daysAgo = 0, now = Date.now()) => new Date(now + VN_OFFSET - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** Monday of the current Vietnam week. */
export function weekStart(now = Date.now()) {
  const d = new Date(now + VN_OFFSET);
  const back = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return vnDay(back, now);
}

/** Days in a row with XP, ending today, or yesterday if today has none yet (the streak is still alive). */
export function streakFrom(days: Set<string>, now = Date.now()) {
  let start = days.has(vnDay(0, now)) ? 0 : 1;
  let n = 0;
  while (days.has(vnDay(start + n, now))) n++;
  return n;
}

/** Monday of last week through Sunday of this week (14 Vietnam dates), so the class chart lines up with the weekly reset. */
export function twoWeeks(now = Date.now()) {
  const mon = Date.parse(weekStart(now) + 'T00:00:00Z') - 7 * 86_400_000;
  return Array.from({ length: 14 }, (_, i) => new Date(mon + i * 86_400_000).toISOString().slice(0, 10));
}
