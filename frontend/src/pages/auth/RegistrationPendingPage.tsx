import { useNavigate } from "react-router-dom";

export default function RegistrationPendingPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <h1>Заявка отправлена</h1>
      <p>
        Ваша заявка на регистрацию отправлена учительнице. Пожалуйста, дождитесь
        её одобрения — после этого вы сможете войти на платформу.
      </p>
      <button type="button" onClick={() => navigate("/login")}>
        Вернуться ко входу
      </button>
    </div>
  );
}
