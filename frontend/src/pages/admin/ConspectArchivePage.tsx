import { useEffect, useState } from "react";
import {
  deleteArchivedConspect,
  listArchivedConspects,
  type ArchivedConspect,
} from "../../api/admin";
import { apiUrl } from "../../api/client";
import { ApiRequestError } from "../../api/auth";
import { listClasses } from "../../api/classes";
import type { SchoolClass } from "../../types";
import PaginationControls from "../../components/PaginationControls";

const STATUS_LABEL: Record<ArchivedConspect["status"], string> = {
  pending: "На проверке",
  success: "Принято",
  fail: "Нужно пересдать",
};

function ArchivedImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const response = await fetch(apiUrl(src), { credentials: "include" });
        if (!response.ok || !active) return;
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setUrl(objectUrl);
      } catch {
        // Удалённые старые файлы не должны ломать страницу архива.
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={alt} className="conspect-review__image" />
    </a>
  ) : (
    <div className="conspect-review__image conspect-review__image--loading" />
  );
}

export default function ConspectArchivePage() {
  const [submissions, setSubmissions] = useState<ArchivedConspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [result, classResult] = await Promise.all([
        listArchivedConspects({ page, pageSize, classId: classFilter }),
        listClasses(),
      ]);
      setSubmissions(result.submissions);
      setClasses(classResult.classes);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить архив");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, classFilter]);

  async function handleDelete(submission: ArchivedConspect) {
    if (!window.confirm(`Удалить конспект ученика ${submission.studentName} и все его фотографии?`)) return;

    setDeletingId(submission.id);
    setError(null);
    try {
      const result = await deleteArchivedConspect(submission.id);
      if (result.preservedProgress) {
        setSubmissions((items) =>
          items.map((item) =>
            item.id === submission.id ? { ...item, imageUrls: [] } : item
          )
        );
      } else {
        if (submissions.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          await load();
        }
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось удалить конспект");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="page-loading">Загрузка...</div>;

  return (
    <div className="page">
      <h1>Архив конспектов</h1>
      <p>Здесь хранятся все отправленные работы. Удаление необратимо.</p>
      <div className="admin-list-filters">
        <label>
          Класс ученика
          <select
            value={classFilter}
            onChange={(event) => {
              setClassFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Все классы</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!error && submissions.length === 0 && <p>В архиве пока нет конспектов.</p>}

      <ul className="conspect-review">
        {submissions.map((submission) => (
          <li key={submission.id} className="conspect-review__item">
            <div className="conspect-review__meta">
              <strong>{submission.studentName}</strong>
              <span>{submission.lessonTitle}</span>
              <span className={`status-badge status-badge--${submission.status}`}>
                {STATUS_LABEL[submission.status]}
              </span>
              <span>Отправлено: {submission.submittedAt}</span>
              {submission.teacherComment && <span>Комментарий: {submission.teacherComment}</span>}
            </div>
            <div className="conspect-review__images">
              {submission.imageUrls.map((url, index) => (
                <ArchivedImage key={url} src={url} alt={`Конспект: страница ${index + 1}`} />
              ))}
            </div>
            <div className="manage-list__actions">
              {submission.imageUrls.length > 0 ? (
                <button
                  type="button"
                  className="request-list__reject"
                  disabled={deletingId === submission.id}
                  onClick={() => handleDelete(submission)}
                >
                  {deletingId === submission.id ? "Удаляем..." : "Удалить из хранилища"}
                </button>
              ) : (
                <span className="request-list__meta">Фотографии удалены из хранилища</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
