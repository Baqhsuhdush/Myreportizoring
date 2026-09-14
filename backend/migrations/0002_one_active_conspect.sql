-- В старых данных могли остаться повторные отправки. Для каждого урока
-- оставляем одну: приоритет у принятой, иначе — у самой свежей ожидающей.
-- Попытки со статусом fail не затрагиваются: ученик может пересдать работу.
DELETE FROM conspect_submissions AS old_submission
WHERE old_submission.status IN ('pending', 'success')
  AND EXISTS (
    SELECT 1
    FROM conspect_submissions AS kept_submission
    WHERE kept_submission.lesson_id = old_submission.lesson_id
      AND kept_submission.student_id = old_submission.student_id
      AND kept_submission.status IN ('pending', 'success')
      AND (
        CASE kept_submission.status WHEN 'success' THEN 0 ELSE 1 END
          < CASE old_submission.status WHEN 'success' THEN 0 ELSE 1 END
        OR (
          kept_submission.status = old_submission.status
          AND (
            kept_submission.submitted_at > old_submission.submitted_at
            OR (
              kept_submission.submitted_at = old_submission.submitted_at
              AND kept_submission.id > old_submission.id
            )
          )
        )
      )
  );

-- Защита от повторной одновременной отправки конспекта.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conspects_one_active_or_success
  ON conspect_submissions(lesson_id, student_id)
  WHERE status IN ('pending', 'success');
