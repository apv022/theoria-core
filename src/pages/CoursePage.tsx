import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { catalog, loadBundledSource } from "../lib/catalog";
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
  const navigate = useNavigate();
  const bundled = catalog.find((item) => item.id === id);
  const [course, setCourse] = useState<Overview | null | undefined>(
    bundled ? { ...bundled } : undefined,
  );
  const [coverUrl, setCoverUrl] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    void (async () =>
      (await localCourses.get(id)) ?? (bundled ? loadBundledSource(id) : undefined))().then(
      (source) => {
        if (!source) return setCourse(null);
        const parsed = parseCourseFiles(new VirtualCourseFiles(source.files)).course;
        const cover = parsed?.cover
          ? source.files.find((file) => file.path === parsed.cover)
          : undefined;
        if (cover) {
          url = URL.createObjectURL(new Blob([cover.data as BlobPart], { type: cover.type }));
          setCoverUrl(url);
        }
        setCourse(
          parsed
            ? {
                id: parsed.id,
                title: parsed.title,
                description: parsed.description ?? "",
                author: parsed.authors.join(", "),
                subject:
                  bundled?.subject ??
                  (source.origin === "authored" ? "Authored course" : "Imported course"),
                difficulty: bundled?.difficulty ?? "Course project",
                lessons: parsed.chapters.flatMap((chapter) => chapter.lessons).length,
              }
            : null,
        );
      },
    );
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [bundled, id]);
  const startCourse = async () => {
    const source =
      (await localCourses.get(course!.id)) ??
      (bundled ? await loadBundledSource(course!.id) : undefined);
    const parsed = source
      ? parseCourseFiles(new VirtualCourseFiles(source.files)).course
      : undefined;
    const now = new Date().toISOString();
    const previous = await enrollmentStore.get(course!.id);
    await enrollmentStore.start({
      courseId: course!.id,
      title: course!.title,
      sourceType: source?.origin ?? "bundled",
      startingLessonId: parsed?.chapters[0]?.lessons[0]?.id,
      startedAt: previous?.startedAt ?? now,
      lastOpenedAt: now,
      lastLessonId: previous?.lastLessonId,
    });
    navigate(`/courses/${course!.id}/learn`);
  };
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
          <button className="button" onClick={() => void startCourse()}>
            Start course
          </button>
        </div>
        <div className="course-cover large">
          {coverUrl ? <img src={coverUrl} alt="" /> : course.title.slice(0, 1)}
        </div>
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
