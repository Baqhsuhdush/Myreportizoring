import type { UserRow } from "../../types";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 дней

// ---------------------------------------------------------------------------
// Создание сессии при логине
// ---------------------------------------------------------------------------
export interface SessionWithExpiry {
  id: string;
  expiresAt: string;
}

export async function createSession(
  db: D1Database,
  userId: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<SessionWithExpiry> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .bind(id, userId, expiresAt)
    .run();

  return { id, expiresAt };
}

// ---------------------------------------------------------------------------
// Получение пользователя по токену сессии (с проверкой срока действия)
// ---------------------------------------------------------------------------
export async function getUserBySessionId(
  db: D1Database,
  sessionId: string
): Promise<UserRow | null> {
  const row = await db
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > datetime('now')`
    )
    .bind(sessionId)
    .first<UserRow>();

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Удаление сессии (logout)
// ---------------------------------------------------------------------------
export async function deleteSession(
  db: D1Database,
  sessionId: string
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

// Удаление всех сессий пользователя (например, при смене пароля)
export async function deleteAllUserSessions(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE user_id = ?")
    .bind(userId)
    .run();
}

// ---------------------------------------------------------------------------
// Очистка просроченных сессий (можно вызывать по cron через Workers Trigger)
// ---------------------------------------------------------------------------
export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run();
}
