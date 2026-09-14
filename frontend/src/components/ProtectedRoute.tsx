import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Если не указано — достаточно быть авторизованным (approved) пользователем */
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user.status === "rejected") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
