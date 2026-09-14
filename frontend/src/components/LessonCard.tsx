import { Link } from "react-router-dom";
import type { Lesson } from "../types";

interface LessonCardProps {
  lesson: Lesson;
  /** Ссылка на страницу урока (собирается родителем, т.к. включает classId/sectionId) */
  href: string;
}

export default function LessonCard({ lesson, href }: LessonCardProps) {
  const title = (
    <>
      {lesson.paragraphSymbol && (
        <span className="paragraph-symbol">{lesson.paragraphSymbol} </span>
      )}
      {lesson.title}
    </>
  );

  if (lesson.isLocked) {
    return (
      <div className="lesson-card lesson-card--locked" aria-disabled="true">
        <span className="lesson-card__title">{title}</span>
        <span className="lesson-card__lock" aria-hidden="true">
          🔒
        </span>
      </div>
    );
  }

  return (
    <Link to={href} className="lesson-card">
      <span className="lesson-card__title">{title}</span>
      <span className="lesson-card__arrow" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
