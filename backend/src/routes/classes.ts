import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { getClassById, listClasses } from "../db/queries/classes";
import { getUserById, listStudentAccessibleClassIds } from "../db/queries/users";

const classes = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// GET / — список всех классов (7–11).
// Публичный маршрут: нужен в том числе на странице регистрации, где
// пользователь ещё не авторизован и выбирает свой класс.
// ---------------------------------------------------------------------------
classes.get("/", async (c) => {
  const rows = await listClasses(c.env.DB);
  const auth = c.get("auth");
  const currentUser = auth ? await getUserById(c.env.DB, auth.userId) : null;
  const accessibleClassIds =
    currentUser?.role === "student"
      ? await listStudentAccessibleClassIds(c.env.DB, currentUser.id)
      : null;

  const result = rows
    .filter((row) => !accessibleClassIds || accessibleClassIds.includes(row.id))
    .map((row) => ({
    id: row.id,
    grade: row.grade,
    title: row.title,
    orderIndex: row.order_index,
    isCurrent: currentUser?.class_id === row.id,
  }));

  return c.json({ classes: result });
});

// ---------------------------------------------------------------------------
// GET /:id — один класс
// ---------------------------------------------------------------------------
classes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await getClassById(c.env.DB, id);

  if (!row) {
    return c.json({ error: "Класс не найден" }, 404);
  }

  return c.json({
    class: {
      id: row.id,
      grade: row.grade,
      title: row.title,
      orderIndex: row.order_index,
    },
  });
});

export default classes;
