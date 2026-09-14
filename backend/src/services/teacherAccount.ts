import type { Env, UserRow } from "../types";
import {
  createUser,
  getTeacher,
  getUserByEmail,
} from "../db/queries/users";
import { hashPassword } from "../utils/password";

/**
 * Создаёт единственный аккаунт учительницы из секретов Worker.
 * Обычная регистрация никогда не может выдать роль teacher. Секреты нужны
 * только для создания первой учётной записи; далее учительница использует
 * настройки собственного профиля.
 */
export async function ensureTeacherAccount(env: Env): Promise<UserRow> {
  const email = env.TEACHER_EMAIL?.trim().toLowerCase();
  const password = env.TEACHER_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error(
      "Не настроены секреты TEACHER_EMAIL и TEACHER_PASSWORD (минимум 12 символов)"
    );
  }

  const teacher = await getTeacher(env.DB);
  if (teacher) {
    return teacher;
  }

  const userWithEmail = await getUserByEmail(env.DB, email);
  if (userWithEmail) {
    throw new Error("Этот email уже занят учеником; выберите другой TEACHER_EMAIL.");
  }

  return createUser(env.DB, {
    firstName: "Учитель",
    lastName: "Fizika Lab",
    email,
    passwordHash: await hashPassword(password),
    role: "teacher",
    status: "approved",
    classId: null,
  });
}
