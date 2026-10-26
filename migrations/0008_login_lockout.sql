-- Per-account brute-force protection: 10 wrong passwords lock the account for 15 minutes.
-- Per account, not per IP, so a class sharing one school Wi-Fi never blocks itself.
ALTER TABLE users ADD COLUMN failed_logins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0;
