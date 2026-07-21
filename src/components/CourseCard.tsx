import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadBundledSource } from "../lib/catalog";
import type { CatalogCourse } from "../types";

export function CourseCard({ course }: { course: CatalogCourse }) {
  const [coverUrl, setCoverUrl] = useState<string>();
  useEffect(() => {
    if (!course.cover) return;
    let url: string | undefined;
    void loadBundledSource(course.id).then((source) => {
      const cover = source.files.find((file) => file.path === course.cover);
      if (!cover) return;
      url = URL.createObjectURL(new Blob([cover.data as BlobPart], { type: cover.type }));
      setCoverUrl(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [course]);
  return (
    <article>
      <Link className="course-card card" data-discover="true" to={`/courses/${course.id}`}>
        <div className="course-cover">
          {coverUrl ? (
            <img src={coverUrl} alt={`${course.title} cover`} />
          ) : (
            course.title.slice(0, 1)
          )}
        </div>
        <div className="tag-row">
          <span>{course.subject}</span>
          <span>{course.difficulty}</span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
        <small>By {course.author}</small>
      </Link>
    </article>
  );
}
