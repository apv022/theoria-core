import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalog } from "../lib/catalog";
import { enrollmentStore, progressStore } from "../lib/storage";
import type { CourseProgress, Enrollment } from "../types";

export default function MyLearningPage() {
  const [items, setItems] = useState<Array<{ enrollment: Enrollment; progress?: CourseProgress }>>(
    [],
  );
  useEffect(() => {
    void enrollmentStore.list().then(async (enrollments) =>
      setItems(
        await Promise.all(
          enrollments.map(async (enrollment) => ({
            enrollment,
            progress: await progressStore.get(enrollment.courseId),
          })),
        ),
      ),
    );
  }, []);
  return (
    <div className="page stack-lg">
      <header className="page-header">
        <p className="eyebrow">Your learning</p>
        <h1>My Learning</h1>
        <p className="lede">Courses you have started appear here.</p>
      </header>
      {items.length ? (
        <div className="local-list">
          {items.map(({ enrollment, progress }) => {
            const meta = catalog.find((c) => c.id === enrollment.courseId);
            const completed = progress?.completedLessons.length ?? 0;
            return (
              <article className="card" key={enrollment.courseId}>
                <div>
                  <span className="activity-type">{enrollment.sourceType}</span>
                  <h2>{enrollment.title}</h2>
                  <p>
                    {meta?.subject ?? "Course"} · {completed} completed lessons
                  </p>
                </div>
                <Link className="button" to={`/courses/${enrollment.courseId}/learn`}>
                  Continue
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty card">
          <h2>No courses started</h2>
          <p>Choose a course in Discover to begin.</p>
          <Link className="button" to="/discover">
            Discover courses
          </Link>
        </div>
      )}
    </div>
  );
}
