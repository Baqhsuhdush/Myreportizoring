import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLessonProgress } from "../../hooks/useLessonProgress";
import { getSection } from "../../api/sections";
import { ApiRequestError } from "../../api/auth";
import LessonCard from "../../components/LessonCard";
import type { Section } from "../../types";

export default function LessonsListPage() {
  const { classId, sectionId } = useParams<{
    classId: string;
    sectionId: string;
  }>();

  const {
    lessons,
    isLoading: isLessonsLoading,
    error: lessonsError,
  } = useLessonProgress(sectionId);

  const [section, setSection] = useState<Section | null>(null);
  const [isSectionLoading, setIsSectionLoading] = useState(true);
  const [sectionError, setSectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setIsSectionLoading(true);
      setSectionError(null);

      try {
        const { section: result } = await getSection(sectionId);
        if (!cancelled) {
          setSection(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось загрузить раздел";
          setSectionError(message);
        }
      } finally {
        if (!cancelled) {
          setIsSectionLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  if (!classId || !sectionId) {
    return <Navigate to="/" replace />;
  }

  if (isLessonsLoading || isSectionLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  const error = sectionError ?? lessonsError;

  return (
    <div className="page">
      <Link to={`/classes/${classId}`}>← Разделы</Link>
      <h1>{section ? section.title : "Уроки"}</h1>

      {error && <p className="form-error">{error}</p>}

      {!error && lessons.length === 0 && (
        <p>В этом разделе пока нет уроков.</p>
      )}

      <div className="lesson-list">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            href={`/classes/${classId}/sections/${sectionId}/lessons/${lesson.id}`}
          />
        ))}
      </div>
    </div>
  );
}
