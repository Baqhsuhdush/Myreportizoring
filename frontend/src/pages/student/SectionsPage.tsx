import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { listSectionsByClass } from "../../api/sections";
import { getClass } from "../../api/classes";
import { ApiRequestError } from "../../api/auth";
import type { SchoolClass, Section } from "../../types";

export default function SectionsPage() {
  const { classId } = useParams<{ classId: string }>();

  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [classResponse, sectionsResponse] = await Promise.all([
          getClass(classId),
          listSectionsByClass(classId),
        ]);

        if (!cancelled) {
          setSchoolClass(classResponse.class);
          setSections(sectionsResponse.sections);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось загрузить разделы";
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
  }, [classId]);

  if (!classId) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <Link to="/">← Все классы</Link>
      <h1>{schoolClass ? schoolClass.title : "Разделы"}</h1>

      {error && <p className="form-error">{error}</p>}

      {!error && sections.length === 0 && (
        <p>В этом классе пока нет разделов.</p>
      )}

      <ul className="classes-list">
        {sections.map((section) => (
          <li key={section.id} className="classes-list__item">
            {section.isLocked ? (
              <div className="classes-list__card classes-list__card--disabled" aria-disabled="true">
                <span>{section.title}</span>
                <span aria-label="Раздел заблокирован">🔒</span>
              </div>
            ) : (
              <Link
                to={`/classes/${classId}/sections/${section.id}`}
                className="classes-list__card classes-list__card--own"
              >
                <span>{section.title}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
