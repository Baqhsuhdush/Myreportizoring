import type { ConspectSubmission } from "../types";
import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Отправка конспекта (multipart/form-data: lessonId + фото)
// ---------------------------------------------------------------------------
export interface SubmitConspectResponse {
  message: string;
  submission: ConspectSubmission;
}

export function submitConspect(
  lessonId: string,
  files: File[]
): Promise<SubmitConspectResponse> {
  const formData = new FormData();
  formData.append("lessonId", lessonId);
  files.forEach((file) => formData.append("images", file));

  return apiFetch<SubmitConspectResponse>("/conspects", {
    method: "POST",
    body: formData,
  });
}

// ---------------------------------------------------------------------------
// Последняя отправка текущего ученика по уроку
// ---------------------------------------------------------------------------
export interface MySubmissionResponse {
  submission: ConspectSubmission | null;
}

export function getMySubmission(lessonId: string): Promise<MySubmissionResponse> {
  const params = new URLSearchParams({ lessonId });
  return apiFetch<MySubmissionResponse>(`/conspects/mine?${params.toString()}`, {
    method: "GET",
  });
}

export function cancelConspectSubmission(
  id: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/conspects/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Очередь на проверку (только учительница)
// ---------------------------------------------------------------------------
export interface PendingSubmission extends ConspectSubmission {
  studentName: string;
  lessonTitle: string;
}

export interface ListPendingSubmissionsResponse {
  submissions: PendingSubmission[];
}

export function listPendingSubmissions(): Promise<ListPendingSubmissionsResponse> {
  return apiFetch<ListPendingSubmissionsResponse>("/conspects/pending", {
    method: "GET",
  });
}

// ---------------------------------------------------------------------------
// Проверка конспекта (success/fail + комментарий), только учительница
// ---------------------------------------------------------------------------
export interface ReviewSubmissionInput {
  status: "success" | "fail";
  teacherComment?: string;
}

export interface ReviewSubmissionResponse {
  submission: ConspectSubmission;
}

export function reviewSubmission(
  id: string,
  input: ReviewSubmissionInput
): Promise<ReviewSubmissionResponse> {
  return apiFetch<ReviewSubmissionResponse>(`/conspects/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
