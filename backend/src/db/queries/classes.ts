import type { ClassRow } from "../../types";

// ---------------------------------------------------------------------------
// Список всех классов (7–11), отсортированный по order_index
// ---------------------------------------------------------------------------
export async function listClasses(db: D1Database): Promise<ClassRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM classes ORDER BY order_index ASC")
    .all<ClassRow>();

  return results ?? [];
}

// ---------------------------------------------------------------------------
// Поиск класса
// ---------------------------------------------------------------------------
export async function getClassById(
  db: D1Database,
  id: string
): Promise<ClassRow | null> {
  const row = await db
    .prepare("SELECT * FROM classes WHERE id = ?")
    .bind(id)
    .first<ClassRow>();

  return row ?? null;
}

export async function getClassByGrade(
  db: D1Database,
  grade: number
): Promise<ClassRow | null> {
  const row = await db
    .prepare("SELECT * FROM classes WHERE grade = ?")
    .bind(grade)
    .first<ClassRow>();

  return row ?? null;
}
