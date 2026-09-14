import type { Lesson } from "../types";
import { apiFetch } from "./client";

export interface ListLessonsResponse {
  lessons: Lesson[];
}

export function listLessonsBySection(
  sectionId: string
): Promise<ListLessonsResponse> {
  const params = new URLSearchParams({ sectionId });
  return apiFetch<ListLessonsResponse>(`/lessons?${params.toString()}`, {
    method: "GET",
  });
}

export interface GetLessonResponse {
  lesson: Lesson;
}

export function getLesson(id: string): Promise<GetLessonResponse> {
  return apiFetch<GetLessonResponse>(`/lessons/${id}`, { method: "GET" });
}

export interface CreateLessonInput {
  sectionId: string;
  orderIndex: number;
  title: string;
  videoUrl: string;
  conspectInstructions: string;
  testUrl: string;
  reviewVideoUrl: string;
}

export function createLesson(
  input: CreateLessonInput
): Promise<GetLessonResponse> {
  return apiFetch<GetLessonResponse>("/lessons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UpdateLessonInput = Partial<CreateLessonInput>;

export function updateLesson(
  id: string,
  input: UpdateLessonInput
): Promise<GetLessonResponse> {
  return apiFetch<GetLessonResponse>(`/lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteLesson(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/lessons/${id}`, {
    method: "DELETE",
  });
}
