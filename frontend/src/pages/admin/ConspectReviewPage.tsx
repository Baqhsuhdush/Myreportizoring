import { useEffect, useState } from "react";
import {
  listPendingSubmissions,
  reviewSubmission,
  type PendingSubmission,
} from "../../api/conspects";
import { ApiRequestError } from "../../api/auth";
import { apiUrl } from "../../api/client";

function AuthenticatedImage({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick?: (url: string) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    (async () => {
      try {
        const response = await fetch(apiUrl(src), { credentials: "include" });
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(
              response.status === 404
                ? "Файл не найден в хранилище"
                : "Не удалось загрузить фото"
            );
          }
          return;
        }
        if (cancelled) return;

        const blob = await response.blob();
        if (cancelled) return;

        currentUrl = URL.createObjectURL(blob);
        setObjectUrl(currentUrl);
      } catch {
        if (!cancelled) setLoadError("Не удалось загрузить фото");
      }
    })();

    return () => {
      cancelled = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [src]);

  if (loadError) {
    return <p className="form-error">{loadError}</p>;
  }

  if (!objectUrl) {
    return (
      <div className="conspect-review__image conspect-review__image--loading" />
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className="conspect-review__image"
      onClick={() => onClick?.(objectUrl)}
      style={{ cursor: onClick ? "zoom-in" : undefined }}
      title="Нажмите для увеличения"
    />
  );
}

const STATUS_LABEL: Record<PendingSubmission["status"], string> = {
  pending: "На проверке",
  success: "Принято",
  fail: "Нужно пересдать",
};

export default function ConspectReviewPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const { submissions: result } = await listPendingSubmissions();
      setSubmissions(result);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось загрузить конспекты";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReview(id: string, status: "success" | "fail") {
    setProcessingId(id);
    setError(null);

    try {
      await reviewSubmission(id, {
        status,
        teacherComment: comments[id]?.trim() || undefined,
      });
      setSubmissions((prev) => prev.filter((submission) => submission.id !== id));
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось сохранить проверку";
      setError(message);
    } finally {
      setProcessingId(null);
    }
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <h1>Проверка конспектов</h1>

      {error && <p className="form-error">{error}</p>}

      {submissions.length === 0 && !error && <p>Конспектов на проверке нет.</p>}

      <ul className="conspect-review">
        {submissions.map((submission) => (
          <li key={submission.id} className="conspect-review__item">
            <div className="conspect-review__meta">
              <strong>{submission.studentName}</strong>
              <span>{submission.lessonTitle}</span>
              <span
                className={`status-badge status-badge--${submission.status}`}
              >
                {STATUS_LABEL[submission.status]}
              </span>
            </div>

            <div className="conspect-review__images">
              {submission.imageUrls.map((url, index) => (
                <AuthenticatedImage
                  key={url}
                  src={url}
                  alt={`Страница конспекта ${index + 1}`}
                  onClick={(fullUrl) => setPreviewImageUrl(fullUrl)}
                />
              ))}
            </div>

            <textarea
              value={comments[submission.id] ?? ""}
              onChange={(e) =>
                setComments((prev) => ({
                  ...prev,
                  [submission.id]: e.target.value,
                }))
              }
              placeholder="Комментарий (необязательно)"
              className="conspect-review__comment"
            />

            <div className="manage-list__actions">
              <button
                type="button"
                onClick={() => handleReview(submission.id, "success")}
                disabled={processingId === submission.id}
              >
                Принять
              </button>
              <button
                type="button"
                onClick={() => handleReview(submission.id, "fail")}
                disabled={processingId === submission.id}
                className="request-list__reject"
              >
                Отклонить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {previewImageUrl && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Увеличенный конспект"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                padding: 0,
                fontSize: "20px",
                lineHeight: "36px",
                textAlign: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
