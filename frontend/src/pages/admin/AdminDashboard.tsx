import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOverview, type AdminOverview } from "../../api/admin";
import { ApiRequestError } from "../../api/auth";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getOverview();
        if (!cancelled) {
          setOverview(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось загрузить панель управления";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <h1>Панель управления</h1>

      {error && <p className="form-error">{error}</p>}

      {overview && (
        <div className="admin-overview">
          <Link to="/admin/requests" className="admin-overview__card">
            <span className="admin-overview__count">
              {overview.pendingRequestsCount}
            </span>
            <span>Заявок на регистрацию</span>
          </Link>

          <Link to="/admin/conspects" className="admin-overview__card">
            <span className="admin-overview__count">
              {overview.pendingConspectsCount}
            </span>
            <span>Конспектов на проверке</span>
          </Link>

          <Link to="/admin/classes" className="admin-overview__card">
            <span className="admin-overview__count">
              {overview.classesCount}
            </span>
            <span>Структура курса</span>
          </Link>
        </div>
      )}
    </div>
  );
}
