import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// ---------------------------------------------------------------------------
// Ссылки навигации по ролям.
// Часть маршрутов (классы/разделы/уроки/проверка конспектов) появится в
// следующих итерациях — здесь уже прописаны финальные пути.
// ---------------------------------------------------------------------------
const STUDENT_LINKS = [
  { to: "/", label: "Мои классы" },
  { to: "/profile", label: "Мой профиль" },
];

const TEACHER_LINKS = [
  { to: "/admin", label: "Панель управления" },
  { to: "/profile", label: "Мой профиль" },
  { to: "/admin/requests", label: "Список учеников" },
  { to: "/admin/classes", label: "Структура курса" },
  { to: "/admin/conspects", label: "Проверка конспектов" },
  { to: "/admin/conspects/archive", label: "Архив конспектов" },
];

export default function Sidebar() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const links = user.role === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;

  return (
    <aside className="app-sidebar">
      <nav>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={
                  link.to === "/" ||
                  link.to === "/admin" ||
                  link.to === "/admin/conspects"
                }
                className={({ isActive }) =>
                  isActive ? "app-sidebar__link app-sidebar__link--active" : "app-sidebar__link"
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
