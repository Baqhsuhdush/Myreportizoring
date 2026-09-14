-- Сохраняет историю классов при переводе ученика. Для существующих учеников
-- текущий класс остаётся в users.class_id; прошлые классы начнут добавляться
-- при первом переводе через админ-панель.
CREATE TABLE IF NOT EXISTS student_class_history (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  moved_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_student_class_history_student
  ON student_class_history(student_id);
