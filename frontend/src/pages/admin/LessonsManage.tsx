import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getSection } from "../../api/sections";
import {
  createLesson,
  deleteLesson,
  listLessonsBySection,
  updateLesson,
  type CreateLessonInput,
} from "../../api/lessons";
import { ApiRequestError } from "../../api/auth";
import type { Lesson, Section } from "../../types";

interface LessonFormState {
  orderIndex: string;
  title: string;
  videoUrl: string;
  conspectInstructions: string;
  testUrl: string;
  reviewVideoUrl: string;
}

const EMPTY_FORM: LessonFormState = {
  orderIndex: "",
  title: "",
  videoUrl: "",
  conspectInstructions: "",
  testUrl: "",
  reviewVideoUrl: "",
};

function formToInput(
  form: LessonFormState,
  sectionId: string
): CreateLessonInput {
  return {
    sectionId,
    orderIndex: Number(form.orderIndex),
    title: form.title.trim(),
    videoUrl: form.videoUrl.trim(),
    conspectInstructions: form.conspectInstructions.trim(),
    testUrl: form.testUrl.trim(),
    reviewVideoUrl: form.reviewVideoUrl.trim(),
  };
}

function isFormValid(form: LessonFormState): boolean {
  return (
    !Number.isNaN(Number(form.orderIndex)) &&
    form.title.trim().length > 0 &&
    form.videoUrl.trim().length > 0 &&
    form.conspectInstructions.trim().length > 0 &&
    form.testUrl.trim().length > 0 &&
    form.reviewVideoUrl.trim().length > 0
  );
}

export default function LessonsManage() {
  const { classId, sectionId } = useParams<{
    classId: string;
    sectionId: string;
  }>();

  const [section, setSection] = useState<Section | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<LessonFormState>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LessonFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    if (!sectionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [sectionResponse, lessonsResponse] = await Promise.all([
        getSection(sectionId),
        listLessonsBySection(sectionId),
      ]);
      setSection(sectionResponse.section);
      setLessons(lessonsResponse.lessons);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось загрузить уроки";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  if (!classId || !sectionId) {
    return <Navigate to="/admin/classes" replace />;
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isFormValid(createForm)) {
      setError("Заполните все обязательные поля урока");
      return;
    }

    setIsCreating(true);

    try {
      await createLesson(formToInput(createForm, sectionId!));
      setCreateForm(EMPTY_FORM);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось создать урок";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditForm({
      orderIndex: String(lesson.orderIndex),
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      conspectInstructions: lesson.conspectInstructions,
      testUrl: lesson.testUrl,
      reviewVideoUrl: lesson.reviewVideoUrl,
    });
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    if (!isFormValid(editForm)) {
      setError("Заполните все обязательные поля урока");
      return;
    }

    setIsSaving(true);

    try {
      await updateLesson(editingId, formToInput(editForm, sectionId!));
      setEditingId(null);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось сохранить урок";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);

    try {
      await deleteLesson(id);
      await load();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось удалить урок";
      setError(message);
    }
  }

  if (isLoading) {
    return <div className="page-loading">Загрузка...</div>;
  }

  return (
    <div className="page">
      <Link to={`/admin/classes/${classId}/sections`}>← Разделы</Link>
      <h1>{section ? section.title : "Уроки"}</h1>

      {error && <p className="form-error">{error}</p>}

      <ul className="manage-list">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="manage-list__item">
            {editingId === lesson.id ? (
              <form
                onSubmit={handleSaveEdit}
                className="manage-list__edit-form manage-list__edit-form--lesson"
              >
                <label>Порядковый номер (параграф будет §{editForm.orderIndex || "…"})
                  <input type="number" value={editForm.orderIndex} onChange={(e) => setEditForm((p) => ({ ...p, orderIndex: e.target.value }))} required />
                </label>
                <label>Название урока
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} required />
                </label>
                <label>Ссылка на видеоурок (YouTube)
                  <input type="url" value={editForm.videoUrl} onChange={(e) => setEditForm((p) => ({ ...p, videoUrl: e.target.value }))} required />
                </label>
                <label>Что нужно написать в конспект
                  <textarea value={editForm.conspectInstructions} onChange={(e) => setEditForm((p) => ({ ...p, conspectInstructions: e.target.value }))} required />
                </label>
                <label>Ссылка на тест (Google Документы)
                  <input type="url" value={editForm.testUrl} onChange={(e) => setEditForm((p) => ({ ...p, testUrl: e.target.value }))} required />
                </label>
                <label>Ссылка на видеоразбор теста (YouTube)
                  <input type="url" value={editForm.reviewVideoUrl} onChange={(e) => setEditForm((p) => ({ ...p, reviewVideoUrl: e.target.value }))} required />
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
                  <span className="paragraph-symbol">
                    §{lesson.orderIndex}
                  </span>{" "}
                  <strong>{lesson.title}</strong>
                </div>

                <div className="manage-list__actions">
                  <button type="button" onClick={() => startEdit(lesson)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(lesson.id)}
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

      <h2>Новый урок</h2>
      <form onSubmit={handleCreate} className="manage-form">
        <label>Порядковый номер (параграф будет §{createForm.orderIndex || "…"})
          <input type="number" value={createForm.orderIndex} onChange={(e) => setCreateForm((p) => ({ ...p, orderIndex: e.target.value }))} required />
        </label>
        <label>Название урока
          <input type="text" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required />
        </label>
        <label>Ссылка на видеоурок (YouTube)
          <input type="url" value={createForm.videoUrl} onChange={(e) => setCreateForm((p) => ({ ...p, videoUrl: e.target.value }))} required />
        </label>
        <label>Что нужно написать в конспект
          <textarea value={createForm.conspectInstructions} onChange={(e) => setCreateForm((p) => ({ ...p, conspectInstructions: e.target.value }))} required />
        </label>
        <label>Ссылка на тест (Google Документы)
          <input type="url" value={createForm.testUrl} onChange={(e) => setCreateForm((p) => ({ ...p, testUrl: e.target.value }))} required />
        </label>
        <label>Ссылка на видеоразбор теста (YouTube)
          <input type="url" value={createForm.reviewVideoUrl} onChange={(e) => setCreateForm((p) => ({ ...p, reviewVideoUrl: e.target.value }))} required />
        </label>
        <button type="submit" disabled={isCreating}>
          {isCreating ? "Добавляем..." : "Добавить урок"}
        </button>
      </form>
    </div>
  );
}
