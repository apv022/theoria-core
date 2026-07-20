import { Link } from "react-router-dom";
import { CourseCard } from "../components/CourseCard";
import { catalog } from "../lib/catalog";

export function HomePage() {
  return (
    <div className="page stack-lg">
      <section className="hero">
        <p className="eyebrow">MCF learning and authoring</p>
        <h1>Explore, study, and create.</h1>
        <p className="lede">
          Read complete courses, build structured lessons, validate MCF source, and export portable
          course packages.
        </p>
        <div className="actions">
          <Link className="button" to="/discover">
            Discover courses
          </Link>
          <Link className="button secondary" to="/create">
            Create a course
          </Link>
          <Link className="text-link" to="/compile">
            Compile MCF →
          </Link>
        </div>
      </section>
      <section className="stack">
        <div className="section-heading">
          <p className="eyebrow">Learning library</p>
          <h2>Featured courses</h2>
        </div>
        <div className="card-grid">
          {catalog
            .filter((course) => course.featured)
            .map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
        </div>
      </section>
      <section className="editorial-grid">
        <div>
          <p className="eyebrow">Portable source</p>
          <h2>Keep your course projects reusable.</h2>
        </div>
        <p>
          Progress, authored courses, and imported media remain in IndexedDB on this device. Export
          your source whenever you want to move it elsewhere.
        </p>
      </section>
    </div>
  );
}
