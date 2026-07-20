import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { compilationStore, localCourses, storageUsage } from "../lib/storage";
import { downloadBlob, exportZip } from "../mcf/zip";
import type { CourseSource } from "../types";

const size = (value?: number) =>
  value !== undefined && Number.isFinite(value)
    ? `${(value / 1024 / 1024).toFixed(1)} MB`
    : undefined;
export default function MyCoursesPage() {
  const [courses, setCourses] = useState<CourseSource[]>([]);
  const [usage, setUsage] = useState<{ usage?: number; quota?: number }>({});
  const [compiled, setCompiled] = useState<string[]>([]);
  const refresh = () => {
    void localCourses.list().then(setCourses);
    void storageUsage().then(setUsage);
    void compilationStore.list().then((items) => setCompiled(items.map((item) => item.courseId)));
  };
  useEffect(refresh, []);
  return (
    <div className="page stack-lg">
      <header className="page-header">
        <p className="eyebrow">Course projects</p>
        <h1>My Courses</h1>
        <p className="lede">
          Create, edit, preview, and export authored or imported course projects.
        </p>
      </header>
      {size(usage.usage) ? (
        <div className="notice">Browser storage used: approximately {size(usage.usage)}</div>
      ) : null}
      {courses.length ? (
        <div className="local-list">
          {courses.map((course) => (
            <article className="card" key={course.id}>
              <div>
                <span className="activity-type">
                  {course.origin}
                  {compiled.includes(course.id) ? " · compiled" : ""}
                </span>
                <h2>{course.title}</h2>
                <p>
                  {course.files.length} source files · saved{" "}
                  {new Date(course.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="actions">
                <Link className="button" to={`/courses/${course.id}/learn`}>
                  Open
                </Link>
                <button
                  className="button secondary"
                  onClick={() =>
                    void exportZip(course.files).then((blob) =>
                      downloadBlob(blob, `${course.id}-source.zip`),
                    )
                  }
                >
                  Export
                </button>
                <button
                  className="text-button danger"
                  onClick={() => {
                    if (confirm(`Delete ${course.title} and its local progress?`))
                      void localCourses.delete(course.id).then(refresh);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty card">
          <h2>No course projects yet</h2>
          <p>Create a course or import MCF source to begin.</p>
          <div className="actions">
            <Link className="button" to="/create">
              Create course
            </Link>
            <Link className="button secondary" to="/compile">
              Import course
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
