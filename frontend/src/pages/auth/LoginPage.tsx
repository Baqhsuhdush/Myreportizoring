import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiRequestError } from "../../api/auth";
import type { LoginFormData } from "../../types";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormData>({ email: "", password: "" });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: keyof LoginFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { pendingApproval } = await login(form);

      if (pendingApproval) {
        navigate("/pending-approval");
        return;
      }

      navigate("/");
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Не удалось войти";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Не показываем форму входа авторизованному пользователю. Ожидание нужно,
  // чтобы не было краткого перенаправления до восстановления cookie-сессии.
  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  if (user?.status === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user?.role === "teacher") {
    return <Navigate to="/admin" replace />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page">
      <h1>Вход в Fizika Lab</h1>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            autoComplete="email"
            placeholder="example@mail.ru"
          />
        </label>

        <label>
          Пароль
          <div className="password-field">
            <input
              type={isPasswordVisible ? "text" : "password"}
              required
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-field__toggle"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
              title={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6S2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="2.8" />
                {isPasswordVisible && <path d="M4 4 20 20" />}
              </svg>
            </button>
          </div>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>

      <p>
        Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
