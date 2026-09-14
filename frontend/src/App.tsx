import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RegistrationPendingPage from "./pages/auth/RegistrationPendingPage";
import HomePage from "./pages/HomePage";
import SectionsPage from "./pages/student/SectionsPage";
import LessonsListPage from "./pages/student/LessonsListPage";
import LessonPage from "./pages/student/LessonPage";
import ConspectUploadPage from "./pages/student/ConspectUploadPage";
import ProfilePage from "./pages/student/ProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentRequestsPage from "./pages/admin/StudentRequestsPage";
import ClassesManage from "./pages/admin/ClassesManage";
import SectionsManage from "./pages/admin/SectionsManage";
import LessonsManage from "./pages/admin/LessonsManage";
import ConspectReviewPage from "./pages/admin/ConspectReviewPage";
import ConspectArchivePage from "./pages/admin/ConspectArchivePage";


function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}

function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="auth-page">
      <h1>Заявка на рассмотрении</h1>
      <p>
        {user?.firstName}, ваша заявка ещё не подтверждена учительницей.
        Попробуйте зайти позже.
      </p>
      <button type="button" onClick={handleLogout}>Выйти</button>
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/registration-pending" element={<RegistrationPendingPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <HomePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes/:classId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AppShell>
                  <SectionsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes/:classId/sections/:sectionId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AppShell>
                  <LessonsListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/classes/:classId/sections/:sectionId/lessons/:lessonId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AppShell>
                  <LessonPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

<Route
  path="/classes/:classId/sections/:sectionId/lessons/:lessonId/conspect"
  element={
    <ProtectedRoute allowedRoles={["student"]}>
      <AppShell>
        <ConspectUploadPage />
      </AppShell>
    </ProtectedRoute>
  }
/>

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <AppShell>
                  <AdminDashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />

<Route
  path="/admin/requests"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <StudentRequestsPage />
      </AppShell>
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/classes"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <ClassesManage />
      </AppShell>
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/classes/:classId/sections"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <SectionsManage />
      </AppShell>
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/conspects"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <ConspectReviewPage />
      </AppShell>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/conspects/archive"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <ConspectArchivePage />
      </AppShell>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/classes/:classId/sections/:sectionId/lessons"
  element={
    <ProtectedRoute allowedRoles={["teacher"]}>
      <AppShell>
        <LessonsManage />
      </AppShell>
    </ProtectedRoute>
  }
/>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
