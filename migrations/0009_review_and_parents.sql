-- Flashcard scheduling and Lute-style parent terms.
-- due_at: when the term is next due for review (0 = due now).
-- parent: the base form this term belongs to ("went" → "go"), lowercased; '' = none.
ALTER TABLE saved_words ADD COLUMN due_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE saved_words ADD COLUMN parent TEXT NOT NULL DEFAULT '';
CREATE INDEX saved_words_due ON saved_words(user_id, due_at) WHERE status BETWEEN 1 AND 5;
