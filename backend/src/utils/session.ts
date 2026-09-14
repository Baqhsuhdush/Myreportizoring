// ---------------------------------------------------------------------------
// Работа с сессионной cookie.
// Сам токен сессии — случайный UUID (см. db/queries/sessions.ts), здесь
// только логика чтения/установки/удаления cookie в HTTP-запросах/ответах.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = "fizika_lab_session";

// ---------------------------------------------------------------------------
// Чтение session id из заголовка Cookie входящего запроса
// ---------------------------------------------------------------------------
export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Формирование заголовка Set-Cookie при логине/регистрации
// ---------------------------------------------------------------------------
export interface BuildSessionCookieOptions {
  sessionId: string;
  expiresAt: string; // ISO-строка
  secure?: boolean; // false только для локальной разработки без https
  sameSite?: "Lax" | "None";
}

export function buildSessionCookie(options: BuildSessionCookieOptions): string {
  const { sessionId, expiresAt, secure = true, sameSite = "Lax" } = options;
  const expires = new Date(expiresAt).toUTCString();

  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    `Expires=${expires}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

// ---------------------------------------------------------------------------
// Заголовок Set-Cookie для очистки сессии (logout)
// ---------------------------------------------------------------------------
export function buildClearSessionCookie(
  secure: boolean = true,
  sameSite: "Lax" | "None" = "Lax"
): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}
