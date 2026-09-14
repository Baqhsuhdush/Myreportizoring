import type { LoginFormData, RegisterFormData, User } from "../types";

// ---------------------------------------------------------------------------
// Базовый URL API.
// В dev-режиме Vite проксирует /api на локальный wrangler dev (см. vite.config.ts),
// поэтому достаточно относительного пути. В проде можно переопределить через
// VITE_API_BASE_URL, если backend живёт на отдельном домене Workers.
// ---------------------------------------------------------------------------
import { apiFetch, ApiRequestError } from "./client";

export { ApiRequestError };



// ---------------------------------------------------------------------------
// Регистрация ученика (заявка ждёт подтверждения учительницей)
// ---------------------------------------------------------------------------
export interface RegisterResponse {
  message: string;
  user: User;
}

export function register(form: RegisterFormData): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

// ---------------------------------------------------------------------------
// Логин
// ---------------------------------------------------------------------------
export interface LoginResponse {
  user: User;
  pendingApproval: boolean;
}

export function login(form: LoginFormData): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

// ---------------------------------------------------------------------------
// Логаут
// ---------------------------------------------------------------------------
export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateProfile(
  input: UpdateProfileInput
): Promise<{ message: string; user: User }> {
  return apiFetch<{ message: string; user: User }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Текущий пользователь (по cookie-сессии)
// ---------------------------------------------------------------------------
export interface MeResponse {
  user: User;
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me", { method: "GET" });
}
