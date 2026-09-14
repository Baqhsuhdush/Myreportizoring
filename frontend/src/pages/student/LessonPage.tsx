import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getLesson } from "../../api/lessons";
import { ApiRequestError } from "../../api/auth";
import VideoPlayer from "../../components/VideoPlayer";
import type { Lesson } from "../../types";

export default function LessonPage() {
  const { classId, sectionId, lessonId } = useParams<{
    classId: string;
    sectionId: string;
    lessonId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { lesson: result } = await getLesson(lessonId);
        if (!cancelled) {
          setLesson(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Не удалось загрузить урок";
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
  }, [lessonId]);

  if (!classId || !sectionId || !lessonId) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  const backLink = `/classes/${classId}/sections/${sectionId}`;

  if (error || !lesson) {
    return (
      <div className="page">
        <Link to={backLink}>← Уроки раздела</Link>
        <p className="form-error">{error ?? "Урок не найден"}</p>
      </div>
    );
  }

  if (lesson.isLocked) {
    return (
      <div className="page">
        <Link to={backLink}>← Уроки раздела</Link>
        <h1>{lesson.title}</h1>
        <p>
          🔒 Этот урок пока закрыт. Сначала нужно сдать конспект предыдущего
          урока.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={backLink}>← Уроки раздела</Link>

      <h1>
        {lesson.paragraphSymbol && (
          <span className="paragraph-symbol">{lesson.paragraphSymbol} </span>
        )}
        {lesson.title}
      </h1>

      <section className="lesson-section">
        <h2>1. Видеоурок</h2>
        <VideoPlayer url={lesson.videoUrl} title={lesson.title} />
      </section>

      <section className="lesson-section">
        <h2>2. Конспект</h2>
        <p className="lesson-conspect-instructions">{lesson.conspectInstructions}</p>
        <div style={{ marginTop: "1rem" }}>
          <Link
            to={`${backLink}/lessons/${lessonId}/conspect`}
            style={{
              display: "inline-block",
              background: "var(--color-accent, #2b6cb0)",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "6px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            📸 Отправить конспект на проверку
          </Link>
        </div>
      </section>

      <section className="lesson-section">
        <h2>3. Тест и задачи</h2>
        <p>Выполните тест для самопроверки по ссылке ниже:</p>
        <div style={{ marginTop: "0.5rem" }}>
          <a
            href={lesson.testUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              background: "#edf2f7",
              color: "#2d3748",
              border: "1px solid #cbd5e0",
              padding: "10px 20px",
              borderRadius: "6px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            📝 Открыть тест (Google Docs) ↗
          </a>
        </div>
      </section>

      <section className="lesson-section">
        <h2>4. Видеоразбор теста</h2>
        <VideoPlayer
          url={lesson.reviewVideoUrl}
          title={`Разбор теста: ${lesson.title}`}
        />
      </section>
    </div>
  );
}
