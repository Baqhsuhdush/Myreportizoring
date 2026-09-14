import type { UserRole, UserRow, UserStatus } from "../../types";

// ---------------------------------------------------------------------------
// Создание пользователя (по умолчанию status = 'pending', ждёт подтверждения
// учительницей)
// ---------------------------------------------------------------------------
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  classId: string | null;
}

export async function createUser(
  db: D1Database,
  input: CreateUserInput
): Promise<UserRow> {
  const id = crypto.randomUUID();
  const status = input.status ?? "pending";

  await db
    .prepare(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, class_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.firstName,
      input.lastName,
      input.email.toLowerCase(),
      input.passwordHash,
      input.role,
      status,
      input.classId
    )
    .run();

  const user = await getUserById(db, id);
  if (!user) {
    throw new Error("Не удалось создать пользователя");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Поиск пользователя
// ---------------------------------------------------------------------------
export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();

  return row ?? null;
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<UserRow>();

  return row ?? null;
}

// В системе допускается только одна учётная запись учительницы.
export async function getTeacher(db: D1Database): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE role = 'teacher' LIMIT 1")
    .first<UserRow>();

  return row ?? null;
}

export async function updateTeacherCredentials(
  db: D1Database,
  id: string,
  email: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE users
       SET email = ?, password_hash = ?, status = 'approved', class_id = NULL
       WHERE id = ? AND role = 'teacher'`
    )
    .bind(email, passwordHash, id)
    .run();
}

export interface UpdateStudentProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

export async function updateStudentProfile(
  db: D1Database,
  id: string,
  input: UpdateStudentProfileInput
): Promise<UserRow | null> {
  await db
    .prepare(
      `UPDATE users
       SET first_name = ?, last_name = ?, email = ?, password_hash = ?
       WHERE id = ? AND role = 'student'`
    )
    .bind(
      input.firstName,
      input.lastName,
      input.email.toLowerCase(),
      input.passwordHash,
      id
    )
    .run();

  return getUserById(db, id);
}

export async function updateStudentPassword(
  db: D1Database,
  id: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET password_hash = ? WHERE id = ?"
    )
    .bind(passwordHash, id)
    .run();
}

export async function updateTeacherProfile(
  db: D1Database,
  id: string,
  input: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    email: string;
  }
): Promise<UserRow | null> {
  await db
    .prepare(
      `UPDATE users
       SET first_name = ?, last_name = ?, middle_name = ?, email = ?
       WHERE id = ? AND role = 'teacher'`
    )
    .bind(input.firstName, input.lastName, input.middleName, input.email, id)
    .run();

  return getUserById(db, id);
}

// ---------------------------------------------------------------------------
// Списки пользователей (для админ-панели учительницы)
// ---------------------------------------------------------------------------
export async function listUsersByStatus(
  db: D1Database,
  status: UserStatus
): Promise<UserRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM users WHERE status = ? ORDER BY created_at ASC")
    .bind(status)
    .all<UserRow>();

  return results ?? [];
}

export async function listPendingUsers(db: D1Database): Promise<UserRow[]> {
  return listUsersByStatus(db, "pending");
}

// История всех заявок учеников для админ-панели.
export async function listAllStudents(db: D1Database): Promise<UserRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM users
       WHERE role = 'student'
       ORDER BY created_at DESC`
    )
    .all<UserRow>();

  return results ?? [];
}

export interface ListStudentsPageOptions {
  classId: string | null;
  scope: "pending" | "approved" | "rejected" | "all";
  limit: number;
  offset: number;
}

export async function listStudentsPage(
  db: D1Database,
  options: ListStudentsPageOptions
): Promise<{ users: UserRow[]; total: number }> {
  const filter = options.classId;
  const scopeCondition =
    options.scope === "pending"
      ? "AND users.status = 'pending'"
      : options.scope === "approved"
        ? "AND users.status = 'approved'"
        : options.scope === "rejected"
          ? "AND users.status = 'rejected'"
          : "";
  const [rowsResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT users.* FROM users
         LEFT JOIN classes ON classes.id = users.class_id
         WHERE users.role = 'student' AND (? IS NULL OR users.class_id = ?)
         ${scopeCondition}
         ORDER BY classes.grade ASC, users.last_name ASC, users.first_name ASC
         LIMIT ? OFFSET ?`
      )
      .bind(filter, filter, options.limit, options.offset)
      .all<UserRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM users
         WHERE role = 'student' AND (? IS NULL OR class_id = ?)
         ${scopeCondition.replaceAll("users.", "")}`
      )
      .bind(filter, filter)
      .first<{ total: number }>(),
  ]);

  return { users: rowsResult.results ?? [], total: countResult?.total ?? 0 };
}

export async function listApprovedStudents(db: D1Database): Promise<UserRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM users
       WHERE role = 'student' AND status = 'approved' AND class_id IS NOT NULL
       ORDER BY last_name ASC, first_name ASC`
    )
    .all<UserRow>();

  return results ?? [];
}

// Текущий и все ранее пройденные классы, доступные ученику. Исторические
// классы с номером не ниже текущего намеренно исключены: это защищает от
// ошибочного перевода ученика в старший класс с последующим откатом.
export async function listStudentAccessibleClassIds(
  db: D1Database,
  studentId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT class_id FROM users WHERE id = ? AND role = 'student'
       UNION
       SELECT history.class_id
       FROM student_class_history AS history
       JOIN users AS student ON student.id = history.student_id
       JOIN classes AS historical_class ON historical_class.id = history.class_id
       JOIN classes AS current_class ON current_class.id = student.class_id
       WHERE history.student_id = ? AND historical_class.grade < current_class.grade`
    )
    .bind(studentId, studentId)
    .all<{ class_id: string }>();

  return (results ?? []).map((row) => row.class_id);
}

export async function isStudentClassAccessible(
  db: D1Database,
  studentId: string,
  classId: string
): Promise<boolean> {
  const ids = await listStudentAccessibleClassIds(db, studentId);
  return ids.includes(classId);
}

// Перевод сохраняет только действительно пройденные (младшие) классы. При
// откате в младший класс записи о выбранном по ошибке старшем классе и выше
// удаляются, поэтому они не отображаются и недоступны ученику.
export async function transferStudentToClass(
  db: D1Database,
  student: UserRow,
  newClassId: string
): Promise<void> {
  if (student.role !== "student" || !student.class_id || student.class_id === newClassId) {
    return;
  }

  await db.batch([
    db
      .prepare(
        `DELETE FROM student_class_history
         WHERE student_id = ?
           AND class_id IN (
             SELECT id FROM classes
             WHERE grade >= (SELECT grade FROM classes WHERE id = ?)
           )`
      )
      .bind(student.id, newClassId),
    db
      .prepare(
        `INSERT OR IGNORE INTO student_class_history (id, student_id, class_id)
         SELECT ?, id, class_id
         FROM users
         WHERE id = ? AND role = 'student'
           AND (SELECT grade FROM classes WHERE id = class_id)
             < (SELECT grade FROM classes WHERE id = ?)`
      )
      .bind(crypto.randomUUID(), student.id, newClassId),
    db
      .prepare("UPDATE users SET class_id = ? WHERE id = ? AND role = 'student'")
      .bind(newClassId, student.id),
  ]);
}

export async function listStudentsByClass(
  db: D1Database,
  classId: string
): Promise<UserRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM users
       WHERE class_id = ? AND role = 'student' AND status = 'approved'
       ORDER BY last_name ASC, first_name ASC`
    )
    .bind(classId)
    .all<UserRow>();

  return results ?? [];
}

// ---------------------------------------------------------------------------
// Изменение статуса заявки (approved / rejected)
// ---------------------------------------------------------------------------
export async function updateUserStatus(
  db: D1Database,
  id: string,
  status: UserStatus
): Promise<void> {
  await db
    .prepare("UPDATE users SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
}

export async function deleteUser(db: D1Database, id: string): Promise<void> {
  // Явно удаляем связанные записи. Это также делает удаление предсказуемым
  // для уже созданных локальных баз, где foreign_keys мог быть выключен.
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").bind(id),
    db.prepare("DELETE FROM student_class_history WHERE student_id = ?").bind(id),
    db.prepare("DELETE FROM conspect_submissions WHERE student_id = ?").bind(id),
    db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'").bind(id),
  ]);
}
