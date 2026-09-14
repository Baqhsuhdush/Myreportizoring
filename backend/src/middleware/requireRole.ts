import type { MiddlewareHandler } from "hono";
import type { UserRole } from "../types";
import type { AppEnv } from "./auth";

// ---------------------------------------------------------------------------
// Ограничение маршрута по роли (student / teacher).
// Должна вызываться после attachAuth + requireAuth.
// ---------------------------------------------------------------------------
export function requireRole(
  allowedRoles: UserRole | UserRole[]
): MiddlewareHandler<AppEnv> {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (c, next) => {
    const auth = c.get("auth");

    if (!auth) {
      return c.json({ error: "Требуется авторизация" }, 401);
    }

    if (!roles.includes(auth.role)) {
      return c.json({ error: "Недостаточно прав" }, 403);
    }

    await next();
  };
}

// Частые случаи — готовые middleware
export const requireTeacher = requireRole("teacher");
export const requireStudent = requireRole("student");
