import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { requireTeacher } from "../middleware/requireRole";
import {
  createSection,
  deleteSection,
  getSectionById,
  listSectionsByClass,
  updateSection,
} from "../db/queries/sections";
import { getClassById } from "../db/queries/classes";
import { isFiniteNumber, isNonEmptyString } from "../utils/validators";
import { computeSectionLockMap } from "../services/progress";
import { isStudentClassAccessible } from "../db/queries/users";

const sections = new Hono<AppEnv>();

function toPublicSection(row: {
  id: string;
  class_id: string;
  title: string;
  order_index: number;
}, isLocked: boolean = false) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    orderIndex: row.order_index,
    isLocked,
  };
}

// GET /?classId=... — список разделов внутри класса (требует авторизации)
sections.get("/", requireAuth, async (c) => {
  const classId = c.req.query("classId");

  if (!classId) {
    return c.json({ error: "Не указан classId" }, 400);
  }

  const schoolClass = await getClassById(c.env.DB, classId);
  if (!schoolClass) {
    return c.json({ error: "Класс не найден" }, 404);
  }

  const auth = c.get("auth")!;
  if (
    auth.role === "student" &&
    !(await isStudentClassAccessible(c.env.DB, auth.userId, classId))
  ) {
    return c.json({ error: "Нет доступа к этому классу" }, 403);
  }

  const rows = await listSectionsByClass(c.env.DB, classId);
  if (auth.role === "teacher") {
    return c.json({ sections: rows.map((row) => toPublicSection(row)) });
  }

  const lockMap = await computeSectionLockMap(c.env.DB, c.get("auth")!.userId, rows);
  return c.json({
    sections: rows.map((row) => toPublicSection(row, lockMap.get(row.id) ?? true)),
  });
});

// GET /:id — один раздел
sections.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const row = await getSectionById(c.env.DB, id);

  if (!row) {
    return c.json({ error: "Раздел не найден" }, 404);
  }

  const auth = c.get("auth")!;
  if (
    auth.role === "student" &&
    !(await isStudentClassAccessible(c.env.DB, auth.userId, row.class_id))
  ) {
    return c.json({ error: "Нет доступа к этому классу" }, 403);
  }

  if (auth.role === "teacher") {
    return c.json({ section: toPublicSection(row) });
  }

  const rows = await listSectionsByClass(c.env.DB, row.class_id);
  const lockMap = await computeSectionLockMap(c.env.DB, c.get("auth")!.userId, rows);
  return c.json({ section: toPublicSection(row, lockMap.get(row.id) ?? true) });
});

// POST / — создание раздела (только учительница)
interface CreateSectionBody {
  classId: string;
  title: string;
  orderIndex: number;
}

sections.post("/", requireAuth, requireTeacher, async (c) => {
  const body = await c.req.json<Partial<CreateSectionBody>>();

 if (
  !isNonEmptyString(body.classId) ||
  !isNonEmptyString(body.title) ||
  !isFiniteNumber(body.orderIndex)
) {
    return c.json({ error: "Заполните все поля" }, 400);
  }

  const schoolClass = await getClassById(c.env.DB, body.classId);
  if (!schoolClass) {
    return c.json({ error: "Класс не найден" }, 400);
  }

  const section = await createSection(c.env.DB, {
    classId: body.classId,
    title: body.title,
    orderIndex: body.orderIndex,
  });

  return c.json({ section: toPublicSection(section) }, 201);
});

// PATCH /:id — изменение раздела (только учительница)
interface UpdateSectionBody {
  title?: string;
  orderIndex?: number;
}

sections.patch("/:id", requireAuth, requireTeacher, async (c) => {
  const id = c.req.param("id");
  const existing = await getSectionById(c.env.DB, id);

  if (!existing) {
    return c.json({ error: "Раздел не найден" }, 404);
  }

  const body = await c.req.json<UpdateSectionBody>();

  await updateSection(c.env.DB, id, {
    title: body.title,
    orderIndex: body.orderIndex,
  });

  const updated = await getSectionById(c.env.DB, id);
  return c.json({ section: toPublicSection(updated!) });
});

// DELETE /:id — удаление раздела (только учительница)
sections.delete("/:id", requireAuth, requireTeacher, async (c) => {
  const id = c.req.param("id");
  const existing = await getSectionById(c.env.DB, id);

  if (!existing) {
    return c.json({ error: "Раздел не найден" }, 404);
  }

  await deleteSection(c.env.DB, id);
  return c.json({ message: "Раздел удалён" });
});

export default sections;
