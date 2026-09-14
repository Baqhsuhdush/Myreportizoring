import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ApiRequestError } from "../../api/auth";
import { listClasses } from "../../api/classes";
import type { RegisterFormData, SchoolClass } from "../../types";

const DEFAULT_CLASSES: SchoolClass[] = [
  { id: "class-7", grade: 7, title: "7 класс", orderIndex: 1 },
  { id: "class-8", grade: 8, title: "8 класс", orderIndex: 2 },
  { id: "class-9", grade: 9, title: "9 класс", orderIndex: 3 },
  { id: "class-10", grade: 10, title: "10 класс", orderIndex: 4 },
  { id: "class-11", grade: 11, title: "11 класс", orderIndex: 5 },
];

interface RegisterFormState extends RegisterFormData {
  confirmPassword: string;
}

const INITIAL_STATE: RegisterFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  classId: "class-7",
};

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<SchoolClass[]>(DEFAULT_CLASSES);
  const [form, setForm] = useState<RegisterFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listClasses()
      .then((res) => {
        if (res.classes && res.classes.length > 0) {
          setClasses(res.classes);
        }
      })
      .catch(() => {
        // Использовать дефолтные классы при ошибке сети
      });
  }, []);

  function handleChange(field: keyof RegisterFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (form.password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        classId: form.classId,
      });

      setForm(INITIAL_STATE);
      navigate("/registration-pending");

    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось отправить заявку";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <h1>Регистрация</h1>
      <p>После регистрации заявку должна подтвердить учительница.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Имя
          <input
            type="text"
            required
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            autoComplete="given-name"
          />
        </label>

        <label>
          Фамилия
          <input
            type="text"
            required
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            autoComplete="family-name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            autoComplete="email"
          />
        </label>

        <label>
          Класс
          <select
            required
            value={form.classId}
            onChange={(e) => handleChange("classId", e.target.value)}
          >
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Пароль
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label>
          Повторите пароль
          <input
            type="password"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Отправляем..." : "Зарегистрироваться"}
        </button>
      </form>

      <p>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
