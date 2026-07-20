import { Link } from "react-router-dom";
import type { CatalogCourse } from "../types";

export function CourseCard({ course }: { course: CatalogCourse }) {
  return (
    <article className="course-card card">
      <div className="course-cover" aria-hidden="true">
        {course.title.slice(0, 1)}
      </div>
      <div className="tag-row">
        <span>{course.subject}</span>
        <span>{course.difficulty}</span>
      </div>
      <h3>
        <Link to={`/courses/${course.id}`}>{course.title}</Link>
      </h3>
      <p>{course.description}</p>
      <small>By {course.author}</small>
    </article>
  );
}
