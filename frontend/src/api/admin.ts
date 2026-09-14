import { apiFetch } from "./client";
import type { ConspectStatus, UserStatus } from "../types";

export interface AdminRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  classId: string | null;
  className: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface ListRequestsResponse {
  requests: AdminRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageOptions {
  page: number;
  pageSize: 10 | 25 | 50;
  classId: string;
  scope?: "pending" | "approved" | "rejected";
}

export function listRegistrationRequests(
  options: PageOptions
): Promise<ListRequestsResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  });
  if (options.classId) params.set("classId", options.classId);
  if (options.scope) params.set("scope", options.scope);
  return apiFetch<ListRequestsResponse>(`/admin/requests?${params}`, { method: "GET" });
}

export function approveRequest(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/requests/${id}/approve`, {
    method: "PATCH",
  });
}

export function rejectRequest(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/requests/${id}/reject`, {
    method: "PATCH",
  });
}

export function deleteStudent(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/students/${id}`, {
    method: "DELETE",
  });
}

export function changeStudentClass(
  id: string,
  classId: string
): Promise<{ message: string; classId: string; className: string }> {
  return apiFetch(`/admin/students/${id}/class`, {
    method: "PATCH",
    body: JSON.stringify({ classId }),
  });
}

export function promoteAllStudents(): Promise<{
  message: string;
  promotedCount: number;
}> {
  return apiFetch("/admin/students/promote", { method: "POST" });
}

export interface ArchivedConspect {
  id: string;
  studentName: string;
  lessonTitle: string;
  status: ConspectStatus;
  teacherComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  imageUrls: string[];
}

export function listArchivedConspects(options: PageOptions): Promise<{
  submissions: ArchivedConspect[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  });
  if (options.classId) params.set("classId", options.classId);
  return apiFetch(`/admin/conspects?${params}`, { method: "GET" });
}

export function deleteArchivedConspect(id: string): Promise<{
  message: string;
  preservedProgress: boolean;
}> {
  return apiFetch(`/admin/conspects/${id}`, { method: "DELETE" });
}

export interface AdminOverview {
  pendingRequestsCount: number;
  pendingConspectsCount: number;
  classesCount: number;
}

export function getOverview(): Promise<AdminOverview> {
  return apiFetch<AdminOverview>("/admin/overview", { method: "GET" });
}
