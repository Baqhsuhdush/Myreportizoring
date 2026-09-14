import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import type { ConspectSubmissionRow, ReviewConspectRequestBody } from "../types";
import {
  createSubmission,
  deleteSubmission,
  getLatestSubmission,
  getSubmissionBlockingResubmission,
  getSubmissionById,
  listPendingSubmissions,
  parseImageKeys,
  reviewSubmission,
} from "../db/queries/conspects";
import { getLessonById, listLessonsBySection } from "../db/queries/lessons";
import { getUserById } from "../db/queries/users";
import { computeLessonLockMap, isSectionLocked } from "../services/progress";
import { getSectionById } from "../db/queries/sections";
import { isStudentClassAccessible } from "../db/queries/users";
import {
  buildConspectImageKey,
  deleteConspectImages,
  uploadConspectImage,
} from "../services/r2";
import { notifyTeacher } from "../services/push";
import type { Env } from "../types";

const conspects = new Hono<AppEnv>();

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 МБ

// ---------------------------------------------------------------------------
// Вспомогательное: путь к файлу конспекта (отдаётся через
// GET /api/conspects/files/*, см. ниже). Путь, а не абсолютный URL, нужен,
// чтобы фронтенд отправлял запрос через свой API base URL / dev-прокси и
// браузер прикладывал cookie текущей сессии.
// ---------------------------------------------------------------------------
function buildImageUrl(key: string): string {
  return `/conspects/files/${encodeURIComponent(key)}`;
}

function toPublicSubmission(row: ConspectSubmissionRow) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    studentId: row.student_id,
    imageUrls: parseImageKeys(row).map(buildImageUrl),
    status: row.status,
    teacherComment: row.teacher_comment,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

async function notifyTeacherOfNewSubmission(
  env: Env,
  row: ConspectSubmissionRow
): Promise<void> {
  const [student, lesson] = await Promise.all([
    getUserById(env.DB, row.student_id),
    getLessonById(env.DB, row.lesson_id),
  ]);

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Ученик";

  await notifyTeacher(env.DB, env, {
    title: "Новый конспект на проверку",
    body: `${studentName} — ${lesson?.title ?? "урок"}`,
    url: "/admin/conspects",
  });
}

// ---------------------------------------------------------------------------
// POST / — отправка конспекта (multipart/form-data: lessonId + images[])
// Только ученик, и только по незаблокированному уроку своего прогресса.
// ---------------------------------------------------------------------------
conspects.post("/", requireAuth, requireRole("student"), async (c) => {
  const auth = c.get("auth")!;
  const formData = await c.req.formData();

  const lessonId = formData.get("lessonId");
  if (typeof lessonId !== "string" || !lessonId) {
    return c.json({ error: "Не указан lessonId" }, 400);
  }

  const lesson = await getLessonById(c.env.DB, lessonId);
  if (!lesson) {
    return c.json({ error: "Урок не найден" }, 404);
  }

  const section = await getSectionById(c.env.DB, lesson.section_id);
  if (!section) {
    return c.json({ error: "Раздел не найден" }, 404);
  }
  if (!(await isStudentClassAccessible(c.env.DB, auth.userId, section.class_id))) {
    return c.json({ error: "Нет доступа к этому классу" }, 403);
  }
  if (await isSectionLocked(c.env.DB, auth.userId, section.class_id, section.id)) {
    return c.json({ error: "Раздел ещё заблокирован" }, 403);
  }

  const blockingSubmission = await getSubmissionBlockingResubmission(
    c.env.DB,
    auth.userId,
    lessonId
  );
  if (blockingSubmission) {
    return c.json({
      error:
        blockingSubmission.status === "pending"
          ? "Конспект уже отправлен и ожидает проверки. Его можно отменить."
          : "Конспект уже принят учительницей и не требует повторной отправки.",
    }, 409);
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
  if (lockMap.get(lessonId) ?? true) {
    return c.json({ error: "Урок ещё заблокирован" }, 403);
  }

  const rawFiles = formData.getAll("images");
  const files: File[] = [];
  for (const entry of rawFiles) {
    if (typeof entry === "object" && entry !== null && "arrayBuffer" in entry) {
      files.push(entry as File);
    }
  }

  if (files.length === 0) {
    return c.json({ error: "Прикрепите хотя бы одно фото конспекта" }, 400);
  }

  if (files.length > MAX_FILES) {
    return c.json({ error: `Не больше ${MAX_FILES} файлов за раз` }, 400);
  }

  const imageKeys: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return c.json(
        { error: `Файл "${file.name}" не является изображением` },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return c.json(
        { error: `Файл "${file.name}" слишком большой (максимум 8 МБ)` },
        400
      );
    }

    const key = buildConspectImageKey(lessonId, auth.userId, file.name);
    const buffer = await file.arrayBuffer();
    await uploadConspectImage(c.env.CONSPECTS_BUCKET, key, buffer, file.type);
    imageKeys.push(key);
  }

  const submission = await createSubmission(c.env.DB, {
    lessonId,
    studentId: auth.userId,
    imageKeys,
  });

  await notifyTeacherOfNewSubmission(c.env, submission);

  return c.json(
    {
      message: "Конспект отправлен на проверку",
      submission: toPublicSubmission(submission),
    },
    201
  );
});

// ---------------------------------------------------------------------------
// GET /mine?lessonId=... — последняя отправка текущего ученика по уроку
// ---------------------------------------------------------------------------
conspects.get("/mine", requireAuth, requireRole("student"), async (c) => {
  const auth = c.get("auth")!;
  const lessonId = c.req.query("lessonId");

  if (!lessonId) {
    return c.json({ error: "Не указан lessonId" }, 400);
  }

  const submission = await getSubmissionBlockingResubmission(
    c.env.DB,
    auth.userId,
    lessonId
  ) ?? await getLatestSubmission(c.env.DB, auth.userId, lessonId);

  return c.json({
    submission: submission ? toPublicSubmission(submission) : null,
  });
});

// DELETE /:id — ученик может отменить только свою ещё не проверенную отправку.
// При отмене удаляются и фото из R2, чтобы не оставлять лишние файлы.
conspects.delete("/:id", requireAuth, requireRole("student"), async (c) => {
  const auth = c.get("auth")!;
  const id = c.req.param("id");
  const submission = await getSubmissionById(c.env.DB, id);

  if (!submission) {
    return c.json({ error: "Отправка не найдена" }, 404);
  }
  if (submission.student_id !== auth.userId) {
    return c.json({ error: "Недостаточно прав" }, 403);
  }
  if (submission.status !== "pending") {
    return c.json({ error: "Можно отменить только конспект, ожидающий проверки" }, 409);
  }

  await deleteConspectImages(c.env.CONSPECTS_BUCKET, parseImageKeys(submission));
  await deleteSubmission(c.env.DB, id);

  return c.json({ message: "Отправка конспекта отменена" });
});

// ---------------------------------------------------------------------------
// GET /pending — очередь конспектов на проверку (только учительница)
// ---------------------------------------------------------------------------
conspects.get("/pending", requireAuth, requireRole("teacher"), async (c) => {
  const rows = await listPendingSubmissions(c.env.DB);

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [student, lesson] = await Promise.all([
        getUserById(c.env.DB, row.student_id),
        getLessonById(c.env.DB, row.lesson_id),
      ]);

      return {
        ...toPublicSubmission(row),
        studentName: student
          ? `${student.first_name} ${student.last_name}`
          : "Неизвестный ученик",
        lessonTitle: lesson?.title ?? "Урок удалён",
      };
    })
  );

  return c.json({ submissions: enriched });
});

// ---------------------------------------------------------------------------
// PATCH /:id/review — проверка конспекта (success/fail + комментарий),
// только учительница
// ---------------------------------------------------------------------------
conspects.patch(
  "/:id/review",
  requireAuth,
  requireRole("teacher"),
  async (c) => {
    const id = c.req.param("id");
    const existing = await getSubmissionById(c.env.DB, id);

    if (!existing) {
      return c.json({ error: "Отправка не найдена" }, 404);
    }

    const body = await c.req.json<Partial<ReviewConspectRequestBody>>();

    if (body.status !== "success" && body.status !== "fail") {
      return c.json({ error: "status должен быть 'success' или 'fail'" }, 400);
    }

    await reviewSubmission(
      c.env.DB,
      id,
      body.status,
      body.teacherComment ?? null
    );

    const updated = await getSubmissionById(c.env.DB, id);
    return c.json({ submission: toPublicSubmission(updated!) });
  }
);

// ---------------------------------------------------------------------------
// GET /files/* — отдаёт фото конспекта из R2.
// Доступ: сам ученик (владелец файла) или учительница.
// ---------------------------------------------------------------------------
conspects.get("/files/*", requireAuth, async (c) => {
  const auth = c.get("auth")!;
  const key = decodeURIComponent(c.req.path.replace(/^.*\/files\//, ""));

  // Ключ имеет вид conspects/<lessonId>/<studentId>/<файл>
  const isOwner = key.includes(`/${auth.userId}/`);
  if (auth.role !== "teacher" && !isOwner) {
    return c.json({ error: "Недостаточно прав" }, 403);
  }

  const object = await c.env.CONSPECTS_BUCKET.get(key);
  if (!object) {
    return c.json({ error: "Файл не найден" }, 404);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export default conspects;
