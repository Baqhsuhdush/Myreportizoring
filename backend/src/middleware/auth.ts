import type { MiddlewareHandler } from "hono";
import type { AuthContext, Env } from "../types";
import { getUserBySessionId } from "../db/queries/sessions";
import { getSessionIdFromRequest } from "../utils/session";

// ---------------------------------------------------------------------------
// Типизация Hono-приложения: биндинги окружения + переменные контекста
// ---------------------------------------------------------------------------
export type AppEnv = {
  Bindings: Env;
  Variables: {
    auth: AuthContext | null;
  };
};

// ---------------------------------------------------------------------------
// Мягкая проверка авторизации: если cookie валидна — кладёт AuthContext
// в c.var.auth, иначе кладёт null. Запрос никогда не блокируется —
// используется на публичных маршрутах, где часть данных зависит от того,
// авторизован пользователь или нет.
// ---------------------------------------------------------------------------
export const attachAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const sessionId = getSessionIdFromRequest(c.req.raw);

  if (!sessionId) {
    c.set("auth", null);
    await next();
    return;
  }

  const user = await getUserBySessionId(c.env.DB, sessionId);

  if (!user) {
    c.set("auth", null);
    await next();
    return;
  }

  c.set("auth", {
    userId: user.id,
    role: user.role,
    status: user.status,
  });

  await next();
};

// ---------------------------------------------------------------------------
// Жёсткая проверка авторизации: блокирует запрос, если пользователь не
// залогинен или его заявка ещё не подтверждена учительницей.
// Должна вызываться после attachAuth.
// ---------------------------------------------------------------------------
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.get("auth");

  if (!auth) {
    return c.json({ error: "Требуется авторизация" }, 401);
  }

  if (auth.status === "pending") {
    return c.json(
      { error: "Ваша заявка ещё не подтверждена учительницей" },
      403
    );
  }

  if (auth.status === "rejected") {
    return c.json({ error: "Доступ отклонён" }, 403);
  }

  await next();
};
