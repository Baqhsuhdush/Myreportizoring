-- Выполните для уже созданной D1-базы, в которой был старый seed-аккаунт.
-- Если в базе несколько учительниц, сначала оставьте только нужную запись.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_teacher
  ON users(role) WHERE role = 'teacher';
