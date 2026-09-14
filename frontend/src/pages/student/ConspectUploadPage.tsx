import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getLesson } from "../../api/lessons";
import {
  cancelConspectSubmission,
  getMySubmission,
  submitConspect,
} from "../../api/conspects";
import { ApiRequestError } from "../../api/auth";
import { apiUrl } from "../../api/client";
import ConspectUploader from "../../components/ConspectUploader";
import type { ConspectSubmission, Lesson } from "../../types";

const STATUS_LABELS: Record<ConspectSubmission["status"], string> = {
  pending: "На проверке",
  success: "Принято",
  fail: "Нужно пересдать",
};

// После перезагрузки File из браузерной формы уже не существует. Восстанавливаем
// его из защищённых файлов R2, чтобы превью и возможность повторной отправки
// после отмены сохранились.
async function restoreSubmissionFiles(submission: ConspectSubmission): Promise<File[]> {
  const restored = await Promise.all(
    submission.imageUrls.map(async (imageUrl, index) => {
      try {
        const response = await fetch(apiUrl(imageUrl), { credentials: "include" });
        if (!response.ok) return null;

        const blob = await response.blob();
        const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        const extension = type.split("/")[1] || "jpg";
        return new File([blob], `Конспект-${index + 1}.${extension}`, { type });
      } catch {
        return null;
      }
    })
  );

  return restored.filter((file): file is File => file !== null);
}

export default function ConspectUploadPage() {
  const { classId, sectionId, lessonId } = useParams<{
    classId: string;
    sectionId: string;
    lessonId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [latestSubmission, setLatestSubmission] =
    useState<ConspectSubmission | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      setFiles([]);

      try {
        const [lessonResponse, submissionResponse] = await Promise.all([
          getLesson(lessonId),
          getMySubmission(lessonId),
        ]);

        const restoredFiles = submissionResponse.submission
          ? await restoreSubmissionFiles(submissionResponse.submission)
          : [];

        if (!cancelled) {
          setLesson(lessonResponse.lesson);
          setLatestSubmission(submissionResponse.submission);
          setFiles(restoredFiles);
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

  const backLink = `/classes/${classId}/sections/${sectionId}/lessons/${lessonId}`;

  if (!lesson) {
    return (
      <div className="page">
        <Link to={backLink}>← Урок</Link>
        <p className="form-error">{error ?? "Урок не найден"}</p>
      </div>
    );
  }

  if (lesson.isLocked) {
    return (
      <div className="page">
        <Link to={backLink}>← Урок</Link>
        <h1>{lesson.title}</h1>
        <p>🔒 Этот урок пока закрыт.</p>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (files.length === 0) {
      setError("Прикрепите хотя бы одно фото конспекта");
      return;
    }

    setIsSubmitting(true);

    try {
      const { message, submission } = await submitConspect(lessonId!, files);
      setSuccessMessage(message);
      setLatestSubmission(submission);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось отправить конспект";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (
      !latestSubmission ||
      !window.confirm(
        "Отменить отправку? Фотографии останутся в форме, и их можно будет отправить повторно."
      )
    ) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsCancelling(true);

    try {
      const { message } = await cancelConspectSubmission(latestSubmission.id);
      setLatestSubmission(null);
      setSuccessMessage(message);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось отменить отправку";
      setError(message);
    } finally {
      setIsCancelling(false);
    }
  }

  const canSubmit = !latestSubmission || latestSubmission.status === "fail";

  return (
    <div className="page">
      <Link to={backLink}>← {lesson.title}</Link>
      <h1>Отправка конспекта</h1>
      <p className="lesson-conspect-instructions">{lesson.conspectInstructions}</p>

      {latestSubmission && (
        <p>
          Статус последней отправки:{" "}
          <span
            className={`status-badge status-badge--${latestSubmission.status}`}
          >
            {STATUS_LABELS[latestSubmission.status]}
          </span>
        </p>
      )}

      {latestSubmission?.teacherComment && (
        <section
          className="conspect-teacher-comment"
          aria-label="Комментарии от учительницы"
        >
          <strong>Комментарии от учительницы</strong>
          <p>{latestSubmission.teacherComment}</p>
        </section>
      )}

      {latestSubmission?.status === "pending" && (
        <button
          type="button"
          className="conspect-upload__cancel-button"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? "Отменяем..." : "Отменить отправку"}
        </button>
      )}

      {latestSubmission?.status === "success" && (
        <p className="form-success">Конспект уже принят. Повторная отправка недоступна.</p>
      )}

      <ConspectUploader
        files={files}
        onChange={setFiles}
        // После отправки оставляем превью на странице, но не даём менять
        // уже отправленный набор файлов до отмены отправки.
        disabled={isSubmitting || !canSubmit}
      />

      {canSubmit && (
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="form-error">{error}</p>}
          {successMessage && <p className="form-success">{successMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Отправляем..." : "Отправить на проверку"}
          </button>
        </form>
      )}

      {!canSubmit && (error || successMessage) && (
        <>
          {error && <p className="form-error">{error}</p>}
          {successMessage && <p className="form-success">{successMessage}</p>}
        </>
      )}
    </div>
  );
}
