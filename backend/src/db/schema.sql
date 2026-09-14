-- ============================================================================
-- Fizika Lab — схема базы данных (Cloudflare D1 / SQLite)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Пользователи (ученики и учительница)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  middle_name   TEXT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  status        TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  class_id      TEXT REFERENCES classes(id) ON DELETE SET NULL, -- null для учительницы
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
-- Единственная учётная запись с правами учительницы во всей платформе.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_teacher
  ON users(role) WHERE role = 'teacher';

-- ----------------------------------------------------------------------------
-- Сессии (cookie-based авторизация)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY, -- значение сессионной cookie
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ----------------------------------------------------------------------------
-- Классы (7–11)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id          TEXT PRIMARY KEY,
  grade       INTEGER NOT NULL CHECK (grade BETWEEN 7 AND 11),
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- ----------------------------------------------------------------------------
-- История классов ученика. Нужна для сохранения доступа к материалам прошлых
-- лет после перевода в следующий класс.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_class_history (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  moved_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_student_class_history_student
  ON student_class_history(student_id);

-- Защита от повторного массового перевода в одном учебном году.
CREATE TABLE IF NOT EXISTS class_promotion_runs (
  id             TEXT PRIMARY KEY,
  school_year    TEXT NOT NULL UNIQUE,
  promoted_count INTEGER NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Разделы внутри класса
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id          TEXT PRIMARY KEY,
  class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sections_class_id ON sections(class_id);

-- ----------------------------------------------------------------------------
-- Уроки
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id                     TEXT PRIMARY KEY,
  section_id             TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  order_index            INTEGER NOT NULL,
  paragraph_symbol       TEXT,             -- например "§12"
  title                  TEXT NOT NULL,
  video_url              TEXT NOT NULL,    -- видеоурок (YouTube)
  conspect_instructions  TEXT NOT NULL,    -- что писать в конспект
  test_url               TEXT NOT NULL,    -- ссылка на google-документ с тестом
  review_video_url       TEXT NOT NULL,    -- видеоразбор теста (YouTube)
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_section_id ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(section_id, order_index);

-- ----------------------------------------------------------------------------
-- Отправленные конспекты (фото хранятся в R2, здесь — только ключи объектов)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conspect_submissions (
  id              TEXT PRIMARY KEY,
  lesson_id       TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_keys      TEXT NOT NULL,   -- JSON-массив ключей объектов в R2
  status          TEXT NOT NULL CHECK (status IN ('pending', 'success', 'fail')) DEFAULT 'pending',
  teacher_comment TEXT,
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_conspects_lesson_id ON conspect_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_conspects_student_id ON conspect_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_conspects_status ON conspect_submissions(status);
-- Не более одной активной или уже принятой отправки по уроку у ученика.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conspects_one_active_or_success
  ON conspect_submissions(lesson_id, student_id)
  WHERE status IN ('pending', 'success');

-- Один ученик может отправлять несколько попыток на один урок (при провале
-- пересдаёт), поэтому уникальности по (lesson_id, student_id) намеренно нет.

-- ----------------------------------------------------------------------------
-- Push-подписки (для уведомлений учительницы о новых заявках/конспектах)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- Начальные данные: классы 7–11
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO classes (id, grade, title, order_index) VALUES
  ('class-7',  7,  '7 класс',  1),
  ('class-8',  8,  '8 класс',  2),
  ('class-9',  9,  '9 класс',  3),
  ('class-10', 10, '10 класс', 4),
  ('class-11', 11, '11 класс', 5);
