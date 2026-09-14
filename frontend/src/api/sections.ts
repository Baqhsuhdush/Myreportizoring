import type { Section } from "../types";
import { apiFetch } from "./client";

export interface ListSectionsResponse {
  sections: Section[];
}

export function listSectionsByClass(
  classId: string
): Promise<ListSectionsResponse> {
  const params = new URLSearchParams({ classId });
  return apiFetch<ListSectionsResponse>(`/sections?${params.toString()}`, {
    method: "GET",
  });
}

export interface GetSectionResponse {
  section: Section;
}

export function getSection(id: string): Promise<GetSectionResponse> {
  return apiFetch<GetSectionResponse>(`/sections/${id}`, { method: "GET" });
}

export interface CreateSectionInput {
  classId: string;
  title: string;
  orderIndex: number;
}

export function createSection(
  input: CreateSectionInput
): Promise<GetSectionResponse> {
  return apiFetch<GetSectionResponse>("/sections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface UpdateSectionInput {
  title?: string;
  orderIndex?: number;
}

export function updateSection(
  id: string,
  input: UpdateSectionInput
): Promise<GetSectionResponse> {
  return apiFetch<GetSectionResponse>(`/sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSection(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/sections/${id}`, {
    method: "DELETE",
  });
}
