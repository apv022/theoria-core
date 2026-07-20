import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { catalog } from "../lib/catalog";
import { enrollmentStore, localCourses } from "../lib/storage";
import { parseCourseFiles } from "../mcf/parser";
import { VirtualCourseFiles } from "../mcf/vfs";

type Overview = {
  id: string;
  title: string;
  description: string;
  author: string;
  subject: string;
  difficulty: string;
  lessons?: number;
};
export default function CoursePage() {
  const { id = "" } = useParams();
  const bundled = catalog.find((item) => item.id === id);
  const [course, setCourse] = useState<Overview | null | undefined>(
    bundled ? { ...bundled } : undefined,
  );
  useEffect(() => {
    if (bundled) return;
    void localCourses.get(id).then((source) => {
      if (!source) return setCourse(null);
      const parsed = parseCourseFiles(new VirtualCourseFiles(source.files)).course;
      setCourse(
        parsed
          ? {
              id: parsed.id,
              title: parsed.title,
              description: parsed.description ?? "",
              author: parsed.authors.join(", "),
              subject: source.origin === "authored" ? "Authored locally" : "Imported locally",
              difficulty: "Local course",
              lessons: parsed.chapters.flatMap((chapter) => chapter.lessons).length,
            }
          : null,
      );
    });
  }, [bundled, id]);
  if (course === undefined) return <div className="status-card">Opening course…</div>;
  if (course === null)
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
          {course.lessons ? <p>{course.lessons} lessons</p> : null}
          <button className="button" onClick={() => void startCourse(course)}>
            Start course
          </button>
        </div>
        <div className="course-cover large">{course.title.slice(0, 1)}</div>
      </div>
      <section className="card">
        <h2>About this course</h2>
        <p>
          This course follows its MCF manifest ordering and saves progress only in this browser.
        </p>
      </section>
    </div>
  );
}

async function startCourse(course: Overview) {
  const source = await localCourses.get(course.id);
  let startingLessonId: string | undefined;
  if (source) {
    const parsed = parseCourseFiles(new VirtualCourseFiles(source.files)).course;
    startingLessonId = parsed?.chapters[0]?.lessons[0]?.id;
  }
  await enrollmentStore.start({
    courseId: course.id,
    title: course.title,
    sourceType: source?.origin ?? "bundled",
    startingLessonId,
    startedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
  });
  window.location.href = `/courses/${course.id}/learn`;
}
