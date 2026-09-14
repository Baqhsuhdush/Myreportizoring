// ---------------------------------------------------------------------------
// Cloudflare bindings (см. wrangler.toml)
// ---------------------------------------------------------------------------
export interface Env {
  DB: D1Database;
  CONSPECTS_BUCKET: R2Bucket;

  ENVIRONMENT: "development" | "production";

  FRONTEND_ORIGIN: string;
  
  // Секреты (wrangler secret put ...)
  SESSION_SECRET: string;
  /** Единственные реквизиты учительницы; задаются только через Wrangler secrets. */
  TEACHER_EMAIL: string;
  TEACHER_PASSWORD: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

// ---------------------------------------------------------------------------
// Общие enum-like типы
// ---------------------------------------------------------------------------
export type UserRole = "student" | "teacher";

export type UserStatus = "pending" | "approved" | "rejected";

export type ConspectStatus = "pending" | "success" | "fail";

// ---------------------------------------------------------------------------
// Строки таблиц D1 (совпадают со schema.sql)
// ---------------------------------------------------------------------------
export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  class_id: string | null; // класс ученика (7–11), null для учительницы
  created_at: string;
}

export interface SessionRow {
  id: string; // токен сессии (хранится в cookie)
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface ClassRow {
  id: string;
  grade: number; // 7..11
  title: string;
  order_index: number;
}

export interface SectionRow {
  id: string;
  class_id: string;
  title: string;
  order_index: number;
}

export interface LessonRow {
  id: string;
  section_id: string;
  order_index: number;
  paragraph_symbol: string | null; // например "§12"
  title: string;
  video_url: string; // YouTube видеоурок
  conspect_instructions: string; // что писать в конспект
  test_url: string; // ссылка на google-документ с тестом
  review_video_url: string; // YouTube разбор теста
  created_at: string;
}

export interface ConspectSubmissionRow {
  id: string;
  lesson_id: string;
  student_id: string;
  image_keys: string; // JSON.stringify(string[]) - ключи объектов в R2
  status: ConspectStatus;
  teacher_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Контекст авторизованного запроса
// ---------------------------------------------------------------------------
export interface AuthContext {
  userId: string;
  role: UserRole;
  status: UserStatus;
}

// ---------------------------------------------------------------------------
// DTO для API (запросы/ответы)
// ---------------------------------------------------------------------------
export interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  classId: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface CreateLessonRequestBody {
  sectionId: string;
  orderIndex: number;
  title: string;
  videoUrl: string;
  conspectInstructions: string;
  testUrl: string;
  reviewVideoUrl: string;
}

export interface ReviewConspectRequestBody {
  status: Extract<ConspectStatus, "success" | "fail">;
  teacherComment?: string;
}

export interface PushSubscribeRequestBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ApiError {
  error: string;
}
