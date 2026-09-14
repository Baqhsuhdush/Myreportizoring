import { useEffect, useState } from "react";
import {
  approveRequest,
  changeStudentClass,
  deleteStudent,
  listRegistrationRequests,
  promoteAllStudents,
  rejectRequest,
  type AdminRequest,
} from "../../api/admin";
import { ApiRequestError } from "../../api/auth";
import { listClasses } from "../../api/classes";
import type { SchoolClass } from "../../types";
import PaginationControls from "../../components/PaginationControls";

export default function StudentRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("");
  const [scope, setScope] = useState<"pending" | "rejected" | "approved">("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const [{ requests: result, total: resultTotal, totalPages: resultPages }, { classes: classList }] = await Promise.all([
        listRegistrationRequests({ page, pageSize, classId: classFilter, scope }),
        listClasses(),
      ]);
      setRequests(result);
      setTotal(resultTotal);
      setTotalPages(resultPages);
      setClasses(classList);
      setSelectedClassIds(
        Object.fromEntries(
          result
            .filter((request) => request.classId)
            .map((request) => [request.id, request.classId!])
        )
      );
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось загрузить заявки";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, pageSize, classFilter, scope]);

  async function handleApprove(id: string) {
    setProcessingId(id);
    setError(null);

    try {
      await approveRequest(id);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось подтвердить заявку";
      setError(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleClassChange(request: AdminRequest) {
    const classId = selectedClassIds[request.id];
    if (!classId || classId === request.classId) return;

    setProcessingId(request.id);
    setError(null);
    try {
      const result = await changeStudentClass(request.id, classId);
      setRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? { ...item, classId: result.classId, className: result.className }
            : item
        )
      );
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось изменить класс");
    } finally {
      setProcessingId(null);
    }
  }

  async function handlePromoteAll() {
    if (!window.confirm("Перевести всех учеников с открытым доступом на следующий класс? Ученики 11 класса останутся в 11 классе.")) {
      return;
    }

    setIsPromoting(true);
    setError(null);
    try {
      const result = await promoteAllStudents();
      setMessage(result.message);
      await load();
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось перевести учеников");
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    setError(null);

    try {
      await rejectRequest(id);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось отклонить заявку";
      setError(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(request: AdminRequest) {
    const fullName = `${request.firstName} ${request.lastName}`;
    if (
      !window.confirm(
        `Удалить ученика ${fullName}? Будут безвозвратно удалены аккаунт, конспекты и фотографии.`
      )
    ) {
      return;
    }

    setProcessingId(request.id);
    setError(null);
    try {
      const result = await deleteStudent(request.id);
      await load();
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось удалить ученика");
    } finally {
      setProcessingId(null);
    }
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <h1>Список учеников</h1>

      <div className="admin-tabs" role="tablist" aria-label="Список учеников">
        <button
          type="button"
          className={scope === "pending" ? "admin-tabs__button admin-tabs__button--active" : "admin-tabs__button"}
          onClick={() => {
            setScope("pending");
            setPage(1);
          }}
        >
          Новые заявки
        </button>
        <button
          type="button"
          className={scope === "rejected" ? "admin-tabs__button admin-tabs__button--active" : "admin-tabs__button"}
          onClick={() => {
            setScope("rejected");
            setPage(1);
          }}
        >
          Отклонённые заявки
        </button>
        <button
          type="button"
          className={scope === "approved" ? "admin-tabs__button admin-tabs__button--active" : "admin-tabs__button"}
          onClick={() => {
            setScope("approved");
            setPage(1);
          }}
        >
          Ученики
        </button>
      </div>

      {scope === "approved" && (
        <button
          type="button"
          className="student-requests__promote-button"
          onClick={handlePromoteAll}
          disabled={isPromoting}
        >
          {isPromoting ? "Переводим..." : "Перевести всех на следующий класс"}
        </button>
      )}

      <div className="admin-list-filters">
        <label>
          Класс
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
      {message && <p className="form-success">{message}</p>}

      {requests.length === 0 && !error && (
        <p>
          {scope === "pending"
            ? "Новых заявок нет."
            : scope === "rejected"
              ? "Отклонённых заявок нет."
              : "Учеников пока нет."}
        </p>
      )}

      <ul className="request-list">
        {requests.map((request) => (
          <li key={request.id} className="request-list__item">
            <div className="request-list__details">
              <strong>
                {request.firstName} {request.lastName}
              </strong>
              <div className="request-list__meta">
                {request.email} · {request.className ?? "Класс не указан"}
              </div>
              {scope === "pending" && (
                <span className="status-badge status-badge--pending">
                  Ожидает решения
                </span>
              )}
              {scope === "approved" && (
                <div className="request-list__actions request-list__class-change">
                  <select
                    value={selectedClassIds[request.id] ?? request.classId ?? ""}
                    onChange={(event) =>
                      setSelectedClassIds((previous) => ({
                        ...previous,
                        [request.id]: event.target.value,
                      }))
                    }
                    aria-label={`Класс ученика ${request.firstName} ${request.lastName}`}
                  >
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      processingId === request.id ||
                      !selectedClassIds[request.id] ||
                      selectedClassIds[request.id] === request.classId
                    }
                    onClick={() => handleClassChange(request)}
                  >
                    Изменить класс
                  </button>
                </div>
              )}
            </div>

            <div className="request-list__actions">
              {request.status !== "approved" && (
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                >
                  {request.status === "rejected" ? "Открыть доступ" : "Подтвердить"}
                </button>
              )}
              {request.status !== "rejected" && (
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  className="request-list__reject"
                >
                  {request.status === "approved" ? "Закрыть доступ" : "Отклонить"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(request)}
                disabled={processingId === request.id}
                className="request-list__reject"
              >
                Удалить ученика
              </button>
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
