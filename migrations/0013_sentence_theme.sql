-- The sentence a term was first saved from (flashcard hint), and the per-account colour theme.
ALTER TABLE saved_words ADD COLUMN sentence TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dim'));
