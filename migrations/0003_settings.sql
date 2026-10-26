-- Per-user settings: interface language, reading text size, speech speed.
ALTER TABLE users ADD COLUMN ui_lang TEXT NOT NULL DEFAULT 'vi';
ALTER TABLE users ADD COLUMN text_size TEXT NOT NULL DEFAULT 'medium' CHECK (text_size IN ('small', 'medium', 'large'));
ALTER TABLE users ADD COLUMN speech_rate REAL NOT NULL DEFAULT 0.9;
