import type { SectionRow } from "../../types";

// ---------------------------------------------------------------------------
// Список разделов внутри класса, отсортированный по order_index
// ---------------------------------------------------------------------------
export async function listSectionsByClass(
  db: D1Database,
  classId: string
): Promise<SectionRow[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM sections WHERE class_id = ? ORDER BY order_index ASC"
    )
    .bind(classId)
    .all<SectionRow>();

  return results ?? [];
}

export async function getSectionById(
  db: D1Database,
  id: string
): Promise<SectionRow | null> {
  const row = await db
    .prepare("SELECT * FROM sections WHERE id = ?")
    .bind(id)
    .first<SectionRow>();

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Создание / изменение / удаление раздела (админ-панель учительницы)
// ---------------------------------------------------------------------------
export interface CreateSectionInput {
  classId: string;
  title: string;
  orderIndex: number;
}

export async function createSection(
  db: D1Database,
  input: CreateSectionInput
): Promise<SectionRow> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO sections (id, class_id, title, order_index) VALUES (?, ?, ?, ?)"
    )
    .bind(id, input.classId, input.title, input.orderIndex)
    .run();

  const section = await getSectionById(db, id);
  if (!section) {
    throw new Error("Не удалось создать раздел");
  }
  return section;
}

export interface UpdateSectionInput {
  title?: string;
  orderIndex?: number;
}

export async function updateSection(
  db: D1Database,
  id: string,
  input: UpdateSectionInput
): Promise<void> {
  const current = await getSectionById(db, id);
  if (!current) {
    throw new Error("Раздел не найден");
  }

  await db
    .prepare("UPDATE sections SET title = ?, order_index = ? WHERE id = ?")
    .bind(
      input.title ?? current.title,
      input.orderIndex ?? current.order_index,
      id
    )
    .run();
}

export async function deleteSection(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare("DELETE FROM sections WHERE id = ?").bind(id).run();
}
