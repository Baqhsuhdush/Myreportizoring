-- Не позволяет случайно запустить массовый перевод дважды за учебный год.
CREATE TABLE IF NOT EXISTS class_promotion_runs (
  id             TEXT PRIMARY KEY,
  school_year    TEXT NOT NULL UNIQUE,
  promoted_count INTEGER NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
