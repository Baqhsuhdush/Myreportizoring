import type { SchoolClass } from "../types";
import { apiFetch } from "./client";

export interface ListClassesResponse {
  classes: SchoolClass[];
}

export function listClasses(): Promise<ListClassesResponse> {
  return apiFetch<ListClassesResponse>("/classes", { method: "GET" });
}

export interface GetClassResponse {
  class: SchoolClass;
}

export function getClass(id: string): Promise<GetClassResponse> {
  return apiFetch<GetClassResponse>(`/classes/${id}`, { method: "GET" });
}
