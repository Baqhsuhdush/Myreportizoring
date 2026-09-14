import type { LessonRow } from "../../types";

// ---------------------------------------------------------------------------
// Список уроков внутри раздела, отсортированный по order_index
// ---------------------------------------------------------------------------
export async function listLessonsBySection(
  db: D1Database,
  sectionId: string
): Promise<LessonRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM lessons WHERE section_id = ? ORDER BY order_index ASC"
    )
    .bind(sectionId)
    .all<LessonRow>();

  return results ?? [];
}

export async function getLessonById(
  db: D1Database,
  id: string
): Promise<LessonRow | null> {
  const row = await db
    .prepare("SELECT * FROM lessons WHERE id = ?")
    .bind(id)
    .first<LessonRow>();

  return row ?? null;
}

// Следующий урок в том же разделе (используется в логике открытия доступа)
export async function getNextLesson(
  db: D1Database,
  sectionId: string,
  currentOrderIndex: number
): Promise<LessonRow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM lessons
       WHERE section_id = ? AND order_index > ?
       ORDER BY order_index ASC
       LIMIT 1`
    )
    .bind(sectionId, currentOrderIndex)
    .first<LessonRow>();

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Создание / изменение / удаление урока (админ-панель учительницы)
// ---------------------------------------------------------------------------
export interface CreateLessonInput {
  sectionId: string;
  orderIndex: number;
  paragraphSymbol: string | null;
  title: string;
  videoUrl: string;
  conspectInstructions: string;
  testUrl: string;
  reviewVideoUrl: string;
}

export async function createLesson(
  db: D1Database,
  input: CreateLessonInput
): Promise<LessonRow> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO lessons
        (id, section_id, order_index, paragraph_symbol, title, video_url,
         conspect_instructions, test_url, review_video_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.sectionId,
      input.orderIndex,
      input.paragraphSymbol,
      input.title,
      input.videoUrl,
      input.conspectInstructions,
      input.testUrl,
      input.reviewVideoUrl
    )
    .run();

  const lesson = await getLessonById(db, id);
  if (!lesson) {
    throw new Error("Не удалось создать урок");
  }
  return lesson;
}

export type UpdateLessonInput = Partial<CreateLessonInput>;

export async function updateLesson(
  db: D1Database,
  id: string,
  input: UpdateLessonInput
): Promise<void> {
  const current = await getLessonById(db, id);
  if (!current) {
    throw new Error("Урок не найден");
  }

  await db
    .prepare(
      `UPDATE lessons
       SET section_id = ?, order_index = ?, paragraph_symbol = ?, title = ?,
           video_url = ?, conspect_instructions = ?, test_url = ?, review_video_url = ?
       WHERE id = ?`
    )
    .bind(
      input.sectionId ?? current.section_id,
      input.orderIndex ?? current.order_index,
      input.paragraphSymbol !== undefined
        ? input.paragraphSymbol
        : current.paragraph_symbol,
      input.title ?? current.title,
      input.videoUrl ?? current.video_url,
      input.conspectInstructions ?? current.conspect_instructions,
      input.testUrl ?? current.test_url,
      input.reviewVideoUrl ?? current.review_video_url,
      id
    )
    .run();
}

export async function deleteLesson(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM lessons WHERE id = ?").bind(id).run();
}
