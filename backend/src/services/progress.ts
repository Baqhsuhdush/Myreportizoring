import type { LessonRow, SectionRow } from "../types";
import { getLatestSubmission } from "../db/queries/conspects";
import { listLessonsBySection } from "../db/queries/lessons";
import { listSectionsByClass } from "../db/queries/sections";

// Первый раздел доступен сразу. Следующий открывается лишь тогда, когда
// каждый урок непосредственно предыдущего раздела имеет успешную сдачу.
// Проверка идёт последовательно, поэтому нельзя открыть дальний раздел,
// перейдя по прямой ссылке.
export async function computeSectionLockMap(
  db: D1Database,
  studentId: string,
  orderedSections: SectionRow[]
): Promise<Map<string, boolean>> {
  const locked = new Map<string, boolean>();
  let previousSectionPassed = true;

  for (const section of orderedSections) {
    locked.set(section.id, !previousSectionPassed);

    if (!previousSectionPassed) {
      continue;
    }

    const lessons = await listLessonsBySection(db, section.id);
    const submissions = await Promise.all(
      lessons.map((lesson) => getLatestSubmission(db, studentId, lesson.id))
    );
    previousSectionPassed = submissions.every(
      (submission) => submission?.status === "success"
    );
  }

  return locked;
}

export async function isSectionLocked(
  db: D1Database,
  studentId: string,
  classId: string,
  sectionId: string
): Promise<boolean> {
  const sections = await listSectionsByClass(db, classId);
  const lockMap = await computeSectionLockMap(db, studentId, sections);
  return lockMap.get(sectionId) ?? true;
}

// Первый урок раздела всегда открыт; каждый следующий открывается только
// после того, как конспект предыдущего урока получил статус 'success'.
// Как только встречается несданный урок — все последующие тоже заблокированы.
export async function computeLessonLockMap(
  db: D1Database,
  studentId: string,
  orderedLessons: LessonRow[]
): Promise<Map<string, boolean>> {
  const locked = new Map<string, boolean>();
  let previousUnlockedAndPassed = true;

  for (const lesson of orderedLessons) {
    locked.set(lesson.id, !previousUnlockedAndPassed);

    if (!previousUnlockedAndPassed) {
      previousUnlockedAndPassed = false;
      continue;
    }

    const submission = await getLatestSubmission(db, studentId, lesson.id);
    previousUnlockedAndPassed = submission?.status === "success";
  }

  return locked;
}

export async function isLessonLocked(
  db: D1Database,
  studentId: string,
  lessonId: string,
  orderedLessonsInSection: LessonRow[]
): Promise<boolean> {
  const lockMap = await computeLessonLockMap(
    db,
    studentId,
    orderedLessonsInSection
  );
  return lockMap.get(lessonId) ?? true;
}
