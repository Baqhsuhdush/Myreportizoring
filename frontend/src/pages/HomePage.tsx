import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ClassesPage from "./student/ClassesPage";

// ---------------------------------------------------------------------------
// Главная страница ("/"). Раньше жила как инлайн-функция прямо в App.tsx —
// вынесена в отдельный файл, как и остальные страницы.
//
// Роль решает, что показать:
//  - ученик видит список классов (ClassesPage) прямо на "/",
//  - учительница перенаправляется в свою панель управления (/admin),
//    у неё нет отдельного "домашнего" контента — весь рабочий процесс
//    начинается с AdminDashboard.
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { user } = useAuth();

  if (user?.role === "teacher") {
    return <Navigate to="/admin" replace />;
  }

  return <ClassesPage />;
}
