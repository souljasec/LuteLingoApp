-- Lute-style term status per saved word/phrase: 1-5 learning, 99 well known, 98 ignored.
-- Rows with status 99/98 may have an empty translation (e.g. "mark rest as known").
ALTER TABLE saved_words ADD COLUMN status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3, 4, 5, 98, 99));
CREATE INDEX saved_words_status ON saved_words(user_id, status);
