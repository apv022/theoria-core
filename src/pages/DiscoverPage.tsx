import { useMemo, useState } from "react";
import { CourseCard } from "../components/CourseCard";
import { catalog } from "../lib/catalog";

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const courses = useMemo(
    () =>
      catalog.filter((course) => {
        const text = `${course.title} ${course.description} ${course.author}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (subject === "All" || course.subject === subject) &&
          (difficulty === "All" || course.difficulty === difficulty)
        );
      }),
    [query, subject, difficulty],
  );
  return (
    <div className="page stack-lg">
      <header className="page-header">
        <p className="eyebrow">Course library</p>
        <h1>Follow your curiosity.</h1>
        <p className="lede">Five complete MCF courses, available without an account.</p>
      </header>
      <div className="filters card">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, topic, or author"
          />
        </label>
        <label>
          Subject
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option>All</option>
            {[...new Set(catalog.map((course) => course.subject))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option>All</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
      </div>
      {courses.length ? (
        <div className="card-grid">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No courses found</h2>
          <p>Try a broader search or clear a filter.</p>
        </div>
      )}
    </div>
  );
}
