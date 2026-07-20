import { Link, useParams } from "react-router-dom";
import { catalog } from "../lib/catalog";

export default function CoursePage() {
  const { id } = useParams();
  const course = catalog.find((item) => item.id === id);
  if (!course)
    return (
      <div className="empty">
        <h1>Course not found</h1>
        <Link to="/discover">Browse courses</Link>
      </div>
    );
  return (
    <div className="page course-overview stack-lg">
      <div className="course-hero">
        <div>
          <p className="eyebrow">
            {course.subject} · {course.difficulty}
          </p>
          <h1>{course.title}</h1>
          <p className="lede">{course.description}</p>
          <p>By {course.author}</p>
          <Link className="button" to={`/courses/${course.id}/learn`}>
            Start learning
          </Link>
        </div>
        <div className="course-cover large">{course.title.slice(0, 1)}</div>
      </div>
      <section className="card">
        <h2>About this course</h2>
        <p>
          This bundled course follows its MCF manifest ordering and saves progress only in this
          browser.
        </p>
      </section>
    </div>
  );
}
