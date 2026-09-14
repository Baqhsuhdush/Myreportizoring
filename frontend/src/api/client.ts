// ---------------------------------------------------------------------------
// Общий fetch-клиент для всех api/*.ts модулей.
//
// Базовый URL: в dev-режиме Vite проксирует /api на локальный wrangler dev
// (см. vite.config.ts), поэтому достаточно относительного пути. В проде
// можно переопределить через VITE_API_BASE_URL, если backend живёт на
// отдельном домене Workers.
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Строит URL API и для JSON-запросов, и для защищённых файлов из R2. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  // Для FormData (загрузка файлов) браузер сам должен выставить
  // Content-Type с корректным multipart-boundary — если прописать
  // "application/json" вручную, сервер не сможет разобрать тело запроса.
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include", // обязательно для cookie-сессий
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && data.error) ||
      "Что-то пошло не так";
    throw new ApiRequestError(String(message), response.status);
  }

  return data as T;
}
