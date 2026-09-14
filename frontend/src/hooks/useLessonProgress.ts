import { useCallback, useEffect, useState } from "react";
import { listLessonsBySection } from "../api/lessons";
import { ApiRequestError } from "../api/auth";
import type { Lesson } from "../types";

interface UseLessonProgressResult {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;
  currentLesson: Lesson | null;
  refresh: () => Promise<void>;
}

export function useLessonProgress(
  sectionId: string | undefined
): UseLessonProgressResult {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sectionId) {
      setLessons([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { lessons: result } = await listLessonsBySection(sectionId);
      setLessons(result);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Не удалось загрузить прогресс по разделу";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Уроки открываются последовательно, поэтому все незаблокированные уроки
  // идут одним блоком в начале списка — "текущий" урок это последний из них
  // (та точка, до которой ученик дошёл).
  const unlockedLessons = lessons.filter((lesson) => !lesson.isLocked);
  const currentLesson = unlockedLessons[unlockedLessons.length - 1] ?? null;

  return { lessons, isLoading, error, currentLesson, refresh };
}
