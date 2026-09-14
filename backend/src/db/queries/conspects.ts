import type { ConspectStatus, ConspectSubmissionRow } from "../../types";

// ---------------------------------------------------------------------------
// Создание отправки конспекта (status = 'pending' до проверки учительницей)
// ---------------------------------------------------------------------------
export interface CreateSubmissionInput {
  lessonId: string;
  studentId: string;
  imageKeys: string[]; // ключи объектов в R2
}

export async function createSubmission(
  db: D1Database,
  input: CreateSubmissionInput
): Promise<ConspectSubmissionRow> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO conspect_submissions (id, lesson_id, student_id, image_keys, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .bind(id, input.lessonId, input.studentId, JSON.stringify(input.imageKeys))
    .run();

  const submission = await getSubmissionById(db, id);
  if (!submission) {
    throw new Error("Не удалось создать отправку конспекта");
  }
  return submission;
}

// ---------------------------------------------------------------------------
// Поиск отправок
// ---------------------------------------------------------------------------
export async function getSubmissionById(
  db: D1Database,
  id: string
): Promise<ConspectSubmissionRow | null> {
  const row = await db
    .prepare("SELECT * FROM conspect_submissions WHERE id = ?")
    .bind(id)
    .first<ConspectSubmissionRow>();

  return row ?? null;
}

// Все попытки ученика по конкретному уроку (последняя — первая в списке)
export async function listSubmissionsByStudentAndLesson(
  db: D1Database,
  studentId: string,
  lessonId: string
): Promise<ConspectSubmissionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM conspect_submissions
       WHERE student_id = ? AND lesson_id = ?
       ORDER BY submitted_at DESC`
    )
    .bind(studentId, lessonId)
    .all<ConspectSubmissionRow>();

  return results ?? [];
}

// Последняя (по времени) отправка ученика по уроку — используется, чтобы
// понять, сдан ли урок (status = 'success') и можно ли открыть следующий
export async function getLatestSubmission(
  db: D1Database,
  studentId: string,
  lessonId: string
): Promise<ConspectSubmissionRow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM conspect_submissions
       WHERE student_id = ? AND lesson_id = ?
       ORDER BY submitted_at DESC
       LIMIT 1`
    )
    .bind(studentId, lessonId)
    .first<ConspectSubmissionRow>();

  return row ?? null;
}

// Отправка с таким статусом ещё ожидает решения или уже была принята.
// В обоих случаях повторная загрузка для урока запрещена.
export async function getSubmissionBlockingResubmission(
  db: D1Database,
  studentId: string,
  lessonId: string
): Promise<ConspectSubmissionRow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM conspect_submissions
       WHERE student_id = ? AND lesson_id = ? AND status IN ('pending', 'success')
       ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, submitted_at DESC
       LIMIT 1`
    )
    .bind(studentId, lessonId)
    .first<ConspectSubmissionRow>();

  return row ?? null;
}

// Очередь на проверку учительницей
export async function listPendingSubmissions(
  db: D1Database
): Promise<ConspectSubmissionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM conspect_submissions
       WHERE status = 'pending'
       ORDER BY submitted_at ASC`
    )
    .all<ConspectSubmissionRow>();

  return results ?? [];
}

// Архив всех отправок: ожидающих проверки, принятых и отклонённых.
export async function listAllSubmissions(
  db: D1Database
): Promise<ConspectSubmissionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM conspect_submissions ORDER BY submitted_at DESC")
    .all<ConspectSubmissionRow>();

  return results ?? [];
}

// Нужна перед удалением ученика: ключи фотографий необходимо удалить из R2
// до каскадного удаления записей из D1.
export async function listSubmissionsByStudent(
  db: D1Database,
  studentId: string
): Promise<ConspectSubmissionRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM conspect_submissions WHERE student_id = ?")
    .bind(studentId)
    .all<ConspectSubmissionRow>();

  return results ?? [];
}

export interface ListSubmissionsPageOptions {
  classId: string | null;
  limit: number;
  offset: number;
}

export async function listSubmissionsPage(
  db: D1Database,
  options: ListSubmissionsPageOptions
): Promise<{ submissions: ConspectSubmissionRow[]; total: number }> {
  const filter = options.classId;
  const [rowsResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT conspect_submissions.* FROM conspect_submissions
         JOIN users ON users.id = conspect_submissions.student_id
         LEFT JOIN classes ON classes.id = users.class_id
         WHERE (? IS NULL OR users.class_id = ?)
         ORDER BY classes.grade ASC, users.last_name ASC, users.first_name ASC,
                  conspect_submissions.submitted_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(filter, filter, options.limit, options.offset)
      .all<ConspectSubmissionRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM conspect_submissions
         JOIN users ON users.id = conspect_submissions.student_id
         WHERE (? IS NULL OR users.class_id = ?)`
      )
      .bind(filter, filter)
      .first<{ total: number }>(),
  ]);

  return {
    submissions: rowsResult.results ?? [],
    total: countResult?.total ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Проверка конспекта учительницей (success / fail + комментарий)
// ---------------------------------------------------------------------------
export async function reviewSubmission(
  db: D1Database,
  id: string,
  status: Extract<ConspectStatus, "success" | "fail">,
  teacherComment: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE conspect_submissions
       SET status = ?, teacher_comment = ?, reviewed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(status, teacherComment, id)
    .run();
}

export async function deleteSubmission(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("DELETE FROM conspect_submissions WHERE id = ?")
    .bind(id)
    .run();
}

// Для принятой работы оставляем запись о прохождении урока, но можем удалить
// сами фото из хранилища без потери прогресса ученика.
export async function clearSubmissionImages(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("UPDATE conspect_submissions SET image_keys = '[]' WHERE id = ?")
    .bind(id)
    .run();
}

// ---------------------------------------------------------------------------
// Утилита: распарсить image_keys (хранится в БД как JSON-строка)
// ---------------------------------------------------------------------------
export function parseImageKeys(submission: ConspectSubmissionRow): string[] {
  try {
    const parsed = JSON.parse(submission.image_keys);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
