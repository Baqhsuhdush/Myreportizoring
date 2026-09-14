import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClasses } from "../../api/classes";
import { ApiRequestError } from "../../api/auth";
import type { SchoolClass } from "../../types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { classes: result } = await listClasses();
        if (!cancelled) {
          setClasses(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось загрузить список классов";
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
      <h1>Классы</h1>
      <p>
        Вам доступен текущий класс и материалы всех ранее пройденных классов.
      </p>

      {error && <p className="form-error">{error}</p>}

      <ul className="classes-list">
        {classes.map((schoolClass) => {
          const isCurrent = schoolClass.isCurrent;

          return (
            <li key={schoolClass.id} className="classes-list__item">
              <Link
                to={`/classes/${schoolClass.id}`}
                className="classes-list__card classes-list__card--own"
              >
                <span>{schoolClass.title}</span>
                {isCurrent ? (
                  <span className="status-badge status-badge--success">
                    Ваш класс
                  </span>
                ) : (
                  <span className="status-badge status-badge--pending">
                    Пройденный класс
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
