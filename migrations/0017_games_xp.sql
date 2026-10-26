-- XP from games (Ghép từ and later games): +5 per finished round, at most 30 per day (THREATS.md X6).
ALTER TABLE activity ADD COLUMN xp_games INTEGER NOT NULL DEFAULT 0;
