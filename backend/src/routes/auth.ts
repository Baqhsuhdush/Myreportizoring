import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import type {
  Env,
  LoginRequestBody,
  RegisterRequestBody,
  UserRow,
} from "../types";
import { notifyTeacher } from "../services/push";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateTeacherProfile,
  updateStudentPassword,
  updateStudentProfile,
} from "../db/queries/users";
import { getClassById } from "../db/queries/classes";
import { createSession, deleteSession } from "../db/queries/sessions";
import { hashPassword, verifyPassword } from "../utils/password";
import { ensureTeacherAccount } from "../services/teacherAccount";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  getSessionIdFromRequest,
} from "../utils/session";
import { validateRegistrationEmail } from "../utils/email";
import { requireAuth } from "../middleware/auth";

const auth = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Вспомогательное: публичное представление пользователя (без password_hash)
// ---------------------------------------------------------------------------
function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    middleName: user.middle_name,
    email: user.email,
    role: user.role,
    status: user.status,
    classId: user.class_id,
  };
}

async function notifyTeacherOfNewRegistration(
  env: Env,
  user: UserRow
): Promise<void> {
  await notifyTeacher(env.DB, env, {
    title: "Новая заявка на регистрацию",
    body: `${user.first_name} ${user.last_name} хочет присоединиться к Fizika Lab`,
    url: "/admin/requests",
  });
}

// ---------------------------------------------------------------------------
// POST /register — регистрация ученика (ждёт подтверждения учительницей)
// ---------------------------------------------------------------------------
auth.post("/register", async (c) => {
  const body = await c.req.json<Partial<RegisterRequestBody>>();

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const rawEmail = body.email;
  const password = body.password;
  const classId = body.classId;

  if (!firstName || !lastName || !rawEmail || !password || !classId) {
    return c.json({ error: "Заполните все поля" }, 400);
  }

  const emailValidation = await validateRegistrationEmail(rawEmail);
  if (!emailValidation.valid) {
    const error =
      emailValidation.error === "unavailable"
        ? "Не удалось проверить email. Попробуйте ещё раз позже"
        : "Укажите настоящий email с существующим почтовым доменом";
    return c.json({ error }, 400);
  }
  const email = emailValidation.email;

  if (password.length < 8) {
    return c.json({ error: "Пароль должен быть не короче 8 символов" }, 400);
  }

  const schoolClass = await getClassById(c.env.DB, classId);
  if (!schoolClass) {
    return c.json({ error: "Класс не найден" }, 400);
  }

  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    return c.json({ error: "Пользователь с таким email уже существует" }, 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await createUser(c.env.DB, {
    firstName,
    lastName,
    email,
    passwordHash,
    role: "student",
    classId,
  });

await notifyTeacherOfNewRegistration(c.env, user);

  return c.json(
    {
      message: "Заявка отправлена. Ожидайте подтверждения от учительницы.",
      user: toPublicUser(user),
    },
    201
  );
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
auth.post("/login", async (c) => {
  const body = await c.req.json<Partial<LoginRequestBody>>();

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return c.json({ error: "Введите email и пароль" }, 400);
  }

  const configuredTeacherEmail = c.env.TEACHER_EMAIL?.trim().toLowerCase();

  // Аккаунт учительницы существует только за счёт секретов окружения,
  // поэтому его нельзя создать или повысить через публичный API.
  let user = await getUserByEmail(c.env.DB, email);
  if (email === configuredTeacherEmail || user?.role === "teacher") {
    try {
      await ensureTeacherAccount(c.env);
    } catch (error) {
      console.error("Не удалось подготовить аккаунт учительницы", error);
      return c.json({ error: "Ошибка настройки аккаунта учительницы" }, 503);
    }
  }

  user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    return c.json({ error: "Неверный email или пароль" }, 401);
  }

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return c.json({ error: "Неверный email или пароль" }, 401);
  }

  if (user.status === "rejected") {
    return c.json({ error: "Доступ отклонён учительницей" }, 403);
  }

  const session = await createSession(c.env.DB, user.id);
  const secure = c.env.ENVIRONMENT === "production";
  const sameSite = secure ? "None" : "Lax";

  c.header(
    "Set-Cookie",
    buildSessionCookie({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      secure,
      sameSite,
    })
  );

  return c.json({
    user: toPublicUser(user),
    pendingApproval: user.status === "pending",
  });
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------
auth.post("/logout", async (c) => {
  const sessionId = getSessionIdFromRequest(c.req.raw);

  if (sessionId) {
    await deleteSession(c.env.DB, sessionId);
  }

  const secure = c.env.ENVIRONMENT === "production";
  c.header(
    "Set-Cookie",
    buildClearSessionCookie(secure, secure ? "None" : "Lax")
  );

  return c.json({ message: "Выход выполнен" });
});

// PATCH /profile — пользователь меняет личные данные. Класс намеренно
// не принимается из запроса: его меняет только учительница в админ-панели.
auth.patch("/profile", requireAuth, async (c) => {
  const authContext = c.get("auth")!;
  const body = await c.req.json<{
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
  }>();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const rawEmail = body.email;

  if (!firstName || !lastName || !rawEmail) {
    return c.json({ error: "Заполните имя, фамилию и email" }, 400);
  }

  const user = await getUserById(c.env.DB, authContext.userId);
  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 404);
  }

  let email = user.email;
  const requestedEmail = rawEmail.trim().toLowerCase();
  if (requestedEmail !== user.email) {
    const emailValidation = await validateRegistrationEmail(requestedEmail);
    if (!emailValidation.valid) {
      const error =
        emailValidation.error === "unavailable"
          ? "Не удалось проверить email. Попробуйте ещё раз позже"
          : "Укажите настоящий email с существующим почтовым доменом";
      return c.json({ error }, 400);
    }
    email = emailValidation.email;

    const existing = await getUserByEmail(c.env.DB, email);
    if (existing && existing.id !== user.id) {
      return c.json({ error: "Пользователь с таким email уже существует" }, 409);
    }
  }

  const updatedUser =
    user.role === "teacher"
      ? await updateTeacherProfile(c.env.DB, user.id, {
          firstName,
          lastName,
          middleName: body.middleName?.trim() || null,
          email,
        })
      : await updateStudentProfile(c.env.DB, user.id, {
          firstName,
          lastName,
          email,
          passwordHash: user.password_hash,
        });

  if (!updatedUser) {
    return c.json({ error: "Не удалось обновить данные" }, 500);
  }

  return c.json({
    message: "Данные профиля обновлены",
    user: toPublicUser(updatedUser),
  });
});

// PATCH /password — смена пароля вынесена в отдельный маршрут. Подтверждение
// повторного нового пароля проверяет интерфейс, а сервер всегда проверяет
// текущий пароль и минимальную длину нового.
auth.patch("/password", requireAuth, async (c) => {
  const authContext = c.get("auth")!;
  const body = await c.req.json<{
    currentPassword?: string;
    newPassword?: string;
  }>();

  if (!body.currentPassword || !body.newPassword) {
    return c.json({ error: "Введите текущий и новый пароль" }, 400);
  }
  if (body.newPassword.length < 8) {
    return c.json({ error: "Новый пароль должен быть не короче 8 символов" }, 400);
  }

  const user = await getUserById(c.env.DB, authContext.userId);
  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 404);
  }
  if (!(await verifyPassword(body.currentPassword, user.password_hash))) {
    return c.json({ error: "Текущий пароль указан неверно" }, 400);
  }

  await updateStudentPassword(
    c.env.DB,
    user.id,
    await hashPassword(body.newPassword)
  );
  return c.json({ message: "Пароль успешно изменён" });
});

// ---------------------------------------------------------------------------
// GET /me — текущий авторизованный пользователь
// ---------------------------------------------------------------------------
auth.get("/me", async (c) => {
  const authContext = c.get("auth");

  if (!authContext) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  const user = await getUserById(c.env.DB, authContext.userId);
  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 404);
  }

  return c.json({ user: toPublicUser(user) });
});

export default auth;
