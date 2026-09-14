import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClasses } from "../../api/classes";
import { ApiRequestError } from "../../api/auth";
import type { SchoolClass } from "../../types";

// Список классов фиксирован сид-данными в backend/src/db/schema.sql (7–11) —
// backend пока не даёт создавать/удалять классы, поэтому здесь только
// просмотр и переход к управлению разделами конкретного класса.
export default function ClassesManage() {
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
              : "Не удалось загрузить структуру курса";
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
      <h1>Структура курса</h1>
      <p>Выберите класс, чтобы управлять его разделами и уроками.</p>

      {error && <p className="form-error">{error}</p>}

      <ul className="classes-list">
        {classes.map((schoolClass) => (
          <li key={schoolClass.id} className="classes-list__item">
            <Link
              to={`/admin/classes/${schoolClass.id}/sections`}
              className="classes-list__card classes-list__card--own"
            >
              <span>{schoolClass.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
