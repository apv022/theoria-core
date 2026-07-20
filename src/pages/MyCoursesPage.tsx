import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { localCourses, storageUsage } from "../lib/storage";
import { downloadBlob, exportZip } from "../mcf/zip";
import type { CourseSource } from "../types";

const size = (value?: number) =>
  value === undefined ? "Unavailable" : `${(value / 1024 / 1024).toFixed(1)} MB`;
export default function MyCoursesPage() {
  const [courses, setCourses] = useState<CourseSource[]>([]);
  const [usage, setUsage] = useState<{ usage?: number; quota?: number }>({});
  const refresh = () => {
    void localCourses.list().then(setCourses);
    void storageUsage().then(setUsage);
  };
  useEffect(refresh, []);
  return (
    <div className="page stack-lg">
      <header className="page-header">
        <p className="eyebrow">Browser library</p>
        <h1>My Courses</h1>
        <p className="lede">
          These courses exist only in this browser. Export source before clearing site data or
          moving devices.
        </p>
      </header>
      <div className="notice">
        Storage used: {size(usage.usage)} of {size(usage.quota)}
      </div>
      {courses.length ? (
        <div className="local-list">
          {courses.map((course) => (
            <article className="card" key={course.id}>
              <div>
                <span className="activity-type">{course.origin}</span>
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
          <h2>No local courses yet</h2>
          <p>Create a course or import MCF source. Bundled courses remain in Discover.</p>
          <div className="actions">
            <Link className="button" to="/create">
              Create
            </Link>
            <Link className="button secondary" to="/compile">
              Import
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
