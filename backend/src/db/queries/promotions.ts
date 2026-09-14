export async function hasPromotionRun(
  db: D1Database,
  schoolYear: string
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM class_promotion_runs WHERE school_year = ?")
    .bind(schoolYear)
    .first<{ id: string }>();

  return row !== null;
}

export async function createPromotionRun(
  db: D1Database,
  schoolYear: string,
  promotedCount: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO class_promotion_runs (id, school_year, promoted_count)
       VALUES (?, ?, ?)`
    )
    .bind(crypto.randomUUID(), schoolYear, promotedCount)
    .run();
}
