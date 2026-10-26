-- App schema v1. Times are unix seconds.

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,            -- stored lowercased
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_active_at INTEGER
);

-- id is the SHA-256 of the cookie token; the token itself is never stored.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE classes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE class_members (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX class_members_user ON class_members(user_id);

-- owner_id NULL = school text (admin). visibility: all | classes (see text_classes) | private (owner only).
CREATE TABLE texts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'classes', 'private')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX texts_owner ON texts(owner_id);

CREATE TABLE text_classes (
  text_id INTEGER NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (text_id, class_id)
);
CREATE INDEX text_classes_class ON text_classes(class_id);

CREATE TABLE progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_id INTEGER NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
  finished_at INTEGER,
  PRIMARY KEY (user_id, text_id)
);

CREATE TABLE saved_words (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,                    -- lowercased
  translation TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, term)
);

-- Shared by everyone: each word is fetched from the translation service once.
CREATE TABLE translation_cache (
  term TEXT PRIMARY KEY,                 -- lowercased, ≤ 3 words
  vi TEXT NOT NULL,
  alts TEXT NOT NULL DEFAULT '[]',       -- JSON array
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
