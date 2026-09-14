// ---------------------------------------------------------------------------
// Общие enum-like типы
// ---------------------------------------------------------------------------
export type UserRole = "student" | "teacher";

export type UserStatus = "pending" | "approved" | "rejected";

export type ConspectStatus = "pending" | "success" | "fail";

// ---------------------------------------------------------------------------
// Пользователь (без пароля/хэша — это только client-facing данные)
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  classId: string | null;
}

// ---------------------------------------------------------------------------
// Контент: классы -> разделы -> уроки
// ---------------------------------------------------------------------------
export interface SchoolClass {
  id: string;
  grade: number; // 7..11
  title: string;
  orderIndex: number;
  /** true только для текущего класса авторизованного ученика */
  isCurrent?: boolean;
}

export interface Section {
  id: string;
  classId: string;
  title: string;
  orderIndex: number;
  isLocked: boolean;
}

export interface Lesson {
  id: string;
  sectionId: string;
  orderIndex: number;
  paragraphSymbol: string | null; // например "§12"
  title: string;
  videoUrl: string;
  conspectInstructions: string;
  testUrl: string;
  reviewVideoUrl: string;
  // Вычисляется на фронте/бэке относительно прогресса ученика:
  isLocked: boolean;
}

// ---------------------------------------------------------------------------
// Конспект
// ---------------------------------------------------------------------------
export interface ConspectSubmission {
  id: string;
  lessonId: string;
  studentId: string;
  imageUrls: string[]; // подписанные ссылки на файлы в R2
  status: ConspectStatus;
  teacherComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  classId: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Push-уведомления
// ---------------------------------------------------------------------------
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ---------------------------------------------------------------------------
// Общая обёртка ошибки API
// ---------------------------------------------------------------------------
export interface ApiError {
  error: string;
}
