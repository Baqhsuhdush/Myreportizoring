import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getClass } from "../../api/classes";
import {
  createSection,
  deleteSection,
  listSectionsByClass,
  updateSection,
} from "../../api/sections";
import { ApiRequestError } from "../../api/auth";
import type { SchoolClass, Section } from "../../types";

interface SectionFormState {
  title: string;
  orderIndex: string;
}

const EMPTY_FORM: SectionFormState = { title: "", orderIndex: "" };

export default function SectionsManage() {
  const { classId } = useParams<{ classId: string }>();

  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<SectionFormState>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SectionFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    if (!classId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [classResponse, sectionsResponse] = await Promise.all([
        getClass(classId),
        listSectionsByClass(classId),
      ]);
      setSchoolClass(classResponse.class);
      setSections(sectionsResponse.sections);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось загрузить разделы";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  if (!classId) {
    return <Navigate to="/admin/classes" replace />;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const orderIndex = Number(createForm.orderIndex);
    if (!createForm.title.trim() || Number.isNaN(orderIndex)) {
      setError("Укажите название и порядковый номер раздела");
      return;
    }

    setIsCreating(true);

    try {
      await createSection({
        classId: classId!,
        title: createForm.title.trim(),
        orderIndex,
      });
      setCreateForm(EMPTY_FORM);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось создать раздел";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(section: Section) {
    setEditingId(section.id);
    setEditForm({
      title: section.title,
      orderIndex: String(section.orderIndex),
    });
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    const orderIndex = Number(editForm.orderIndex);
    if (!editForm.title.trim() || Number.isNaN(orderIndex)) {
      setError("Укажите название и порядковый номер раздела");
      return;
    }

    setIsSaving(true);

    try {
      await updateSection(editingId, {
        title: editForm.title.trim(),
        orderIndex,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось сохранить раздел";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);

    try {
      await deleteSection(id);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось удалить раздел";
      setError(message);
    }
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <Link to="/admin/classes">← Структура курса</Link>
      <h1>{schoolClass ? schoolClass.title : "Разделы"}</h1>

      {error && <p className="form-error">{error}</p>}

      <ul className="manage-list">
        {sections.map((section) => (
          <li key={section.id} className="manage-list__item">
            {editingId === section.id ? (
              <form onSubmit={handleSaveEdit} className="manage-list__edit-form">
                <label>Название раздела
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </label>
                <label>Порядковый номер
                  <input type="number" value={editForm.orderIndex} onChange={(e) => setEditForm((prev) => ({ ...prev, orderIndex: e.target.value }))} required />
                </label>
                <div className="manage-list__actions">
                  <button type="submit" disabled={isSaving}>
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="manage-list__cancel"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <span className="paragraph-symbol">#{section.orderIndex}</span>{" "}
                  <strong>{section.title}</strong>
                </div>

                <div className="manage-list__actions">
                  <Link
                    to={`/admin/classes/${classId}/sections/${section.id}/lessons`}
                  >
                    Уроки
                  </Link>
                  <button type="button" onClick={() => startEdit(section)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(section.id)}
                    className="request-list__reject"
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <h2>Новый раздел</h2>
      <form onSubmit={handleCreate} className="manage-form">
        <label>Название раздела
          <input type="text" value={createForm.title} onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))} required />
        </label>
        <label>Порядковый номер
          <input type="number" value={createForm.orderIndex} onChange={(e) => setCreateForm((prev) => ({ ...prev, orderIndex: e.target.value }))} required />
        </label>
        <button type="submit" disabled={isCreating}>
          {isCreating ? "Добавляем..." : "Добавить раздел"}
        </button>
      </form>
    </div>
  );
}
