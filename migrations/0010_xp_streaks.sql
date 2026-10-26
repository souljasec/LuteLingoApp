-- Duolingo-style motivation: XP per user per day (Vietnam date), daily XP goal.
-- Streaks and weekly leaderboards are computed from activity.
CREATE TABLE activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                     -- YYYY-MM-DD in Asia/Ho_Chi_Minh (UTC+7)
  xp INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX activity_day ON activity(day);
ALTER TABLE users ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 20 CHECK (daily_goal IN (10, 20, 30, 50));
-- XP for finishing a text is paid once per text, even if it is un-finished and finished again.
ALTER TABLE progress ADD COLUMN rewarded INTEGER NOT NULL DEFAULT 0;
