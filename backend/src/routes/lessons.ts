import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { requireTeacher } from "../middleware/requireRole";
import type { CreateLessonRequestBody, LessonRow } from "../types";
import {
  createLesson,
  deleteLesson,
  getLessonById,
  listLessonsBySection,
  updateLesson,
} from "../db/queries/lessons";
import { getSectionById } from "../db/queries/sections";
import { computeLessonLockMap } from "../services/progress";
import { isSectionLocked } from "../services/progress";
import { isStudentClassAccessible } from "../db/queries/users";
import {
  isFiniteNumber,
  isNonEmptyString,
  isValidUrl,
} from "../utils/validators";

const lessons = new Hono<AppEnv>();

function toPublicLesson(row: LessonRow, isLocked: boolean) {
  return {
    id: row.id,
    sectionId: row.section_id,
    orderIndex: row.order_index,
    // Номер параграфа всегда соответствует порядковому номеру урока.
    paragraphSymbol: `§${row.order_index}`,
    title: row.title,
    videoUrl: row.video_url,
    conspectInstructions: row.conspect_instructions,
    testUrl: row.test_url,
    reviewVideoUrl: row.review_video_url,
    isLocked,
  };
}

// GET /?sectionId=... — список уроков раздела (с учётом блокировки)
lessons.get("/", requireAuth, async (c) => {
  const sectionId = c.req.query("sectionId");
  const auth = c.get("auth")!;

  if (!sectionId) {
    return c.json({ error: "Не указан sectionId" }, 400);
  }

  const section = await getSectionById(c.env.DB, sectionId);
  if (!section) {
    return c.json({ error: "Раздел не найден" }, 404);
  }

  if (
    auth.role === "student" &&
    !(await isStudentClassAccessible(c.env.DB, auth.userId, section.class_id))
  ) {
    return c.json({ error: "Нет доступа к этому классу" }, 403);
  }

  const rows = await listLessonsBySection(c.env.DB, sectionId);

  if (auth.role === "teacher") {
    return c.json({ lessons: rows.map((row) => toPublicLesson(row, false)) });
  }

  if (await isSectionLocked(c.env.DB, auth.userId, section.class_id, section.id)) {
    return c.json({ lessons: rows.map((row) => toPublicLesson(row, true)) });
  }

  const lockMap = await computeLessonLockMap(c.env.DB, auth.userId, rows);
  const result = rows.map((row) =>
    toPublicLesson(row, lockMap.get(row.id) ?? true)
  );

  return c.json({ lessons: result });
});

// GET /:id — один урок
lessons.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const auth = c.get("auth")!;

  const lesson = await getLessonById(c.env.DB, id);
  if (!lesson) {
    return c.json({ error: "Урок не найден" }, 404);
  }

  if (auth.role === "teacher") {
    return c.json({ lesson: toPublicLesson(lesson, false) });
  }

  const section = await getSectionById(c.env.DB, lesson.section_id);
  if (!section) {
    return c.json({ error: "Раздел не найден" }, 404);
  }
  if (!(await isStudentClassAccessible(c.env.DB, auth.userId, section.class_id))) {
    return c.json({ error: "Нет доступа к этому классу" }, 403);
  }
  if (await isSectionLocked(c.env.DB, auth.userId, section.class_id, section.id)) {
    return c.json({ lesson: toPublicLesson(lesson, true) });
  }

  const siblingLessons = await listLessonsBySection(
    c.env.DB,
    lesson.section_id
  );
  const lockMap = await computeLessonLockMap(
    c.env.DB,
    auth.userId,
    siblingLessons
  );

  return c.json({ lesson: toPublicLesson(lesson, lockMap.get(id) ?? true) });
});

// POST / — создание урока (только учительница)
lessons.post("/", requireAuth, requireTeacher, async (c) => {
  const body = await c.req.json<Partial<CreateLessonRequestBody>>();

 if (
  !isNonEmptyString(body.sectionId) ||
  !isFiniteNumber(body.orderIndex) ||
  !isNonEmptyString(body.title) ||
  !isValidUrl(body.videoUrl ?? "") ||
  !isNonEmptyString(body.conspectInstructions) ||
  !isValidUrl(body.testUrl ?? "") ||
  !isValidUrl(body.reviewVideoUrl ?? "")
) {
  return c.json({ error: "Заполните все обязательные поля корректно" }, 400);
}

  const section = await getSectionById(c.env.DB, body.sectionId);
  if (!section) {
    return c.json({ error: "Раздел не найден" }, 400);
  }

  const lesson = await createLesson(c.env.DB, {
    sectionId: body.sectionId!,
    orderIndex: body.orderIndex!,
    paragraphSymbol: `§${body.orderIndex!}`,
    title: body.title!,
    videoUrl: body.videoUrl!,
    conspectInstructions: body.conspectInstructions!,
    testUrl: body.testUrl!,
    reviewVideoUrl: body.reviewVideoUrl!,
  });

  return c.json({ lesson: toPublicLesson(lesson, false) }, 201);
});

// PATCH /:id — изменение урока (только учительница)
lessons.patch("/:id", requireAuth, requireTeacher, async (c) => {
  const id = c.req.param("id");
  const existing = await getLessonById(c.env.DB, id);

  if (!existing) {
    return c.json({ error: "Урок не найден" }, 404);
  }

  const body = await c.req.json<Partial<CreateLessonRequestBody>>();
  const orderIndex = body.orderIndex ?? existing.order_index;

  await updateLesson(c.env.DB, id, {
    sectionId: body.sectionId,
    orderIndex,
    paragraphSymbol: `§${orderIndex}`,
    title: body.title,
    videoUrl: body.videoUrl,
    conspectInstructions: body.conspectInstructions,
    testUrl: body.testUrl,
    reviewVideoUrl: body.reviewVideoUrl,
  });

  const updated = await getLessonById(c.env.DB, id);
  return c.json({ lesson: toPublicLesson(updated!, false) });
});

// DELETE /:id — удаление урока (только учительница)
lessons.delete("/:id", requireAuth, requireTeacher, async (c) => {
  const id = c.req.param("id");
  const existing = await getLessonById(c.env.DB, id);

  if (!existing) {
    return c.json({ error: "Урок не найден" }, 404);
  }

  await deleteLesson(c.env.DB, id);
  return c.json({ message: "Урок удалён" });
});

export default lessons;
