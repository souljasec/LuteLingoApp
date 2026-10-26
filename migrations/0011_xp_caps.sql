-- Daily XP per source, so the leaderboard can't be farmed (threat X1-X3 in THREATS.md):
-- new words ≤ 50, reviews ≤ 100, finished texts ≤ 50 XP per day.
ALTER TABLE activity ADD COLUMN xp_words INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN xp_reviews INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN xp_texts INTEGER NOT NULL DEFAULT 0;
