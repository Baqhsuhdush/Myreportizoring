import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <Link to="/" className="app-header__logo">
        Fizika Lab
      </Link>

      {user && (
        <div className="app-header__user">
          <span>
            {user.firstName} {user.middleName ? `${user.middleName} ` : ""}{user.lastName}
          </span>
          <span className="app-header__role">
            {user.role === "teacher" ? "Учительница" : "Ученик"}
          </span>
          <button onClick={() => logout()}>Выйти</button>
        </div>
      )}
    </header>
  );
}
