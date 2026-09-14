import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { requireTeacher } from "../middleware/requireRole";
import {
  getUserById,
  deleteUser,
  listApprovedStudents,
  listPendingUsers,
  listStudentsPage,
  transferStudentToClass,
  updateUserStatus,
} from "../db/queries/users";
import { getClassById, listClasses } from "../db/queries/classes";
import {
  clearSubmissionImages,
  deleteSubmission,
  getSubmissionById,
  listPendingSubmissions,
  listSubmissionsPage,
  listSubmissionsByStudent,
  parseImageKeys,
} from "../db/queries/conspects";
import { getLessonById } from "../db/queries/lessons";
import { deleteConspectImages } from "../services/r2";
import { deleteAllUserSessions } from "../db/queries/sessions";
import { createPromotionRun, hasPromotionRun } from "../db/queries/promotions";
import type { ConspectSubmissionRow, UserRow } from "../types";

const admin = new Hono<AppEnv>();

const PAGE_SIZES = [10, 25, 50] as const;

function getPagination(c: { req: { query: (key: string) => string | undefined } }) {
  const requestedPage = Number(c.req.query("page") ?? "1");
  const requestedSize = Number(c.req.query("pageSize") ?? "10");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = PAGE_SIZES.includes(requestedSize as (typeof PAGE_SIZES)[number])
    ? requestedSize
    : 10;

  return { page, pageSize };
}

function currentSchoolYear(): string {
  const date = new Date();
  const year = date.getUTCFullYear();
  // Учебный год начинается в сентябре: 2026-09 — это 2026–2027.
  const startYear = date.getUTCMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

// Все маршруты в этом файле — только для учительницы
admin.use("*", requireAuth, requireTeacher);

async function toRequestSummary(db: D1Database, row: UserRow) {
  const schoolClass = row.class_id
    ? await getClassById(db, row.class_id)
    : null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: row.email,
    classId: row.class_id,
    className: schoolClass?.title ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function toConspectArchiveEntry(
  db: D1Database,
  row: ConspectSubmissionRow
) {
  const [student, lesson] = await Promise.all([
    getUserById(db, row.student_id),
    getLessonById(db, row.lesson_id),
  ]);

  return {
    id: row.id,
    studentName: student
      ? `${student.first_name} ${student.last_name}`
      : "Удалённый ученик",
    lessonTitle: lesson?.title ?? "Удалённый урок",
    status: row.status,
    teacherComment: row.teacher_comment,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    imageUrls: parseImageKeys(row).map(
      (key) => `/conspects/files/${encodeURIComponent(key)}`
    ),
  };
}

// GET /requests — вся история регистраций и текущие статусы доступа.
admin.get("/requests", async (c) => {
  const { page, pageSize } = getPagination(c);
  const classId = c.req.query("classId") || null;
  const requestedScope = c.req.query("scope");
  const scope =
    requestedScope === "pending" ||
    requestedScope === "approved" ||
    requestedScope === "rejected"
      ? requestedScope
      : "all";
  const { users: rows, total } = await listStudentsPage(c.env.DB, {
    classId,
    scope,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const requests = await Promise.all(
    rows.map((row) => toRequestSummary(c.env.DB, row))
  );

  return c.json({
    requests,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

// PATCH /requests/:id/approve
admin.patch("/requests/:id/approve", async (c) => {
  const id = c.req.param("id");
  const user = await getUserById(c.env.DB, id);

  if (!user) {
    return c.json({ error: "Заявка не найдена" }, 404);
  }

  if (user.role !== "student") {
    return c.json({ error: "Можно менять доступ только ученикам" }, 400);
  }

  await updateUserStatus(c.env.DB, id, "approved");
  return c.json({ message: "Заявка подтверждена" });
});

// PATCH /requests/:id/reject
admin.patch("/requests/:id/reject", async (c) => {
  const id = c.req.param("id");
  const user = await getUserById(c.env.DB, id);

  if (!user) {
    return c.json({ error: "Заявка не найдена" }, 404);
  }

  if (user.role !== "student") {
    return c.json({ error: "Можно менять доступ только ученикам" }, 400);
  }

  await updateUserStatus(c.env.DB, id, "rejected");
  // Отзыв доступа должен прервать уже открытые сессии ученика сразу.
  await deleteAllUserSessions(c.env.DB, id);
  return c.json({ message: "Заявка отклонена" });
});

// DELETE /students/:id — полностью удаляет учётную запись ученика и все его
// конспекты. Ключи фотографий сначала удаляются из R2, затем записи из D1.
admin.delete("/students/:id", async (c) => {
  const id = c.req.param("id");
  const student = await getUserById(c.env.DB, id);

  if (!student || student.role !== "student") {
    return c.json({ error: "Ученик не найден" }, 404);
  }

  const submissions = await listSubmissionsByStudent(c.env.DB, id);
  const imageKeys = submissions.flatMap((submission) => parseImageKeys(submission));
  await deleteConspectImages(c.env.CONSPECTS_BUCKET, imageKeys);
  await deleteUser(c.env.DB, id);

  return c.json({ message: "Ученик и все его данные удалены" });
});

// PATCH /students/:id/class — ручной перевод одного ученика в другой класс.
admin.patch("/students/:id/class", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ classId?: string }>();
  const student = await getUserById(c.env.DB, id);

  if (!student || student.role !== "student") {
    return c.json({ error: "Ученик не найден" }, 404);
  }
  if (!body.classId) {
    return c.json({ error: "Не указан класс" }, 400);
  }

  const schoolClass = await getClassById(c.env.DB, body.classId);
  if (!schoolClass) {
    return c.json({ error: "Класс не найден" }, 404);
  }

  await transferStudentToClass(c.env.DB, student, schoolClass.id);
  return c.json({
    message: `Ученик переведён в ${schoolClass.title}`,
    classId: schoolClass.id,
    className: schoolClass.title,
  });
});

// POST /students/promote — массовый перевод только учеников с открытым
// доступом. У 11 класса нет следующего класса, поэтому он остаётся без изменений.
admin.post("/students/promote", async (c) => {
  const schoolYear = currentSchoolYear();
  if (await hasPromotionRun(c.env.DB, schoolYear)) {
    return c.json(
      { error: `Массовый перевод за учебный год ${schoolYear} уже выполнен.` },
      409
    );
  }

  const students = await listApprovedStudents(c.env.DB);
  const classes = await listClasses(c.env.DB);
  const classById = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
  const classByGrade = new Map(classes.map((schoolClass) => [schoolClass.grade, schoolClass]));
  let promotedCount = 0;

  for (const student of students) {
    const currentClass = student.class_id ? classById.get(student.class_id) : null;
    if (!currentClass || currentClass.grade >= 11) continue;

    const nextClass = classByGrade.get(currentClass.grade + 1);
    if (!nextClass) continue;

    await transferStudentToClass(c.env.DB, student, nextClass.id);
    promotedCount += 1;
  }

  await createPromotionRun(c.env.DB, schoolYear, promotedCount);

  return c.json({
    message: "Перевод всех учеников на следующий класс выполнен успешно.",
    promotedCount,
  });
});

// GET /conspects — хранилище всех отправленных конспектов.
admin.get("/conspects", async (c) => {
  const { page, pageSize } = getPagination(c);
  const classId = c.req.query("classId") || null;
  const { submissions: rows, total } = await listSubmissionsPage(c.env.DB, {
    classId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const submissions = await Promise.all(
    rows.map((row) => toConspectArchiveEntry(c.env.DB, row))
  );

  return c.json({
    submissions,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

// DELETE /conspects/:id — удаление старого конспекта и его фото из R2.
admin.delete("/conspects/:id", async (c) => {
  const id = c.req.param("id");
  const submission = await getSubmissionById(c.env.DB, id);

  if (!submission) {
    return c.json({ error: "Конспект не найден" }, 404);
  }

  await deleteConspectImages(c.env.CONSPECTS_BUCKET, parseImageKeys(submission));

  if (submission.status === "success") {
    await clearSubmissionImages(c.env.DB, id);
    return c.json({
      message: "Фотографии удалены. Отметка о принятом конспекте сохранена для прогресса ученика.",
      preservedProgress: true,
    });
  }

  await deleteSubmission(c.env.DB, id);

  return c.json({ message: "Конспект и его фотографии удалены", preservedProgress: false });
});

// GET /overview — сводка для главной страницы админ-панели
admin.get("/overview", async (c) => {
  const [pendingRequests, pendingConspects, classes] = await Promise.all([
    listPendingUsers(c.env.DB),
    listPendingSubmissions(c.env.DB),
    listClasses(c.env.DB),
  ]);

  return c.json({
    pendingRequestsCount: pendingRequests.length,
    pendingConspectsCount: pendingConspects.length,
    classesCount: classes.length,
  });
});

export default admin;
