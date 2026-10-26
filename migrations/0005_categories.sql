-- Text category (free text, e.g. "Kids", "Travel") and level: 0 not set, 1 beginner,
-- 2 elementary, 3 intermediate.
ALTER TABLE texts ADD COLUMN category TEXT NOT NULL DEFAULT '';
ALTER TABLE texts ADD COLUMN level INTEGER NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3);
CREATE INDEX texts_category ON texts(category);

-- The starter texts.
UPDATE texts SET category = 'Vietnam', level = 2 WHERE owner_id IS NULL AND (title LIKE 'North Vietnam%' OR title LIKE 'Vietnam:%');
UPDATE texts SET category = 'World', level = 2 WHERE owner_id IS NULL AND title LIKE 'World:%';
