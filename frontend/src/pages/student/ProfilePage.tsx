import { useEffect, useState, type FormEvent } from "react";
import { ApiRequestError, changePassword, updateProfile } from "../../api/auth";
import { useAuth } from "../../hooks/useAuth";

type ProfileTab = "details" | "password";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("details");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [middleName, setMiddleName] = useState(user?.middleName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setMiddleName(user.middleName ?? "");
    setEmail(user.email);
  }, [user]);

  async function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault();
    setDetailsError(null);
    setDetailsMessage(null);
    setIsSavingDetails(true);

    try {
      const result = await updateProfile({
        firstName,
        lastName,
        email,
        ...(user?.role === "teacher" ? { middleName } : {}),
      });
      await refresh();
      setDetailsMessage(result.message);
    } catch (err) {
      setDetailsError(
        err instanceof ApiRequestError ? err.message : "Не удалось обновить профиль"
      );
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Новые пароли не совпадают");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Новый пароль должен быть не короче 8 символов");
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(result.message);
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError ? err.message : "Не удалось изменить пароль"
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="page">
      <h1>Мой профиль</h1>
      <div className="admin-tabs" role="tablist" aria-label="Настройки профиля">
        <button
          type="button"
          className={activeTab === "details" ? "admin-tabs__button admin-tabs__button--active" : "admin-tabs__button"}
          onClick={() => setActiveTab("details")}
        >
          Основные данные
        </button>
        <button
          type="button"
          className={activeTab === "password" ? "admin-tabs__button admin-tabs__button--active" : "admin-tabs__button"}
          onClick={() => setActiveTab("password")}
        >
          Пароль
        </button>
      </div>

      {activeTab === "details" ? (
        <form className="auth-form" onSubmit={handleDetailsSubmit}>
          {user?.role === "student" && <p>Класс меняет только учительница.</p>}
          <label>
            Имя
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoComplete="given-name" />
          </label>
          <label>
            Фамилия
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} required autoComplete="family-name" />
          </label>
          {user?.role === "teacher" && (
            <label>
              Отчество
              <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} autoComplete="additional-name" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          {detailsError && <p className="form-error">{detailsError}</p>}
          {detailsMessage && <p className="form-success">{detailsMessage}</p>}
          <button type="submit" disabled={isSavingDetails}>
            {isSavingDetails ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handlePasswordSubmit}>
          <label>
            Текущий пароль
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          <label>
            Новый пароль
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Повторите новый пароль
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordMessage && <p className="form-success">{passwordMessage}</p>}
          <button type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? "Сохраняем..." : "Изменить пароль"}
          </button>
        </form>
      )}
    </div>
  );
}
