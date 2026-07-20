import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QuestionView } from "../components/QuestionView";
import { completion, evaluateQuestion, hasResponse } from "../mcf/grading";
import { parseCourseFiles } from "../mcf/parser";
import { AssetUrls, richHtml } from "../mcf/render";
import { VirtualCourseFiles } from "../mcf/vfs";
import { loadBundledSource } from "../lib/catalog";
import { localCourses, progressStore } from "../lib/storage";
import type { Activity, CourseProgress, CourseSource, ParsedCourse } from "../types";

const blankProgress = (courseId: string): CourseProgress => ({
  courseId,
  completedNotes: [],
  completedLessons: [],
  responses: {},
  assessments: {},
  updatedAt: new Date().toISOString(),
});

export default function ReaderPage() {
  const { id = "" } = useParams();
  const [source, setSource] = useState<CourseSource>();
  const [course, setCourse] = useState<ParsedCourse>();
  const [failure, setFailure] = useState<string>();
  const [progress, setProgress] = useState<CourseProgress>(() => blankProgress(id));
  useEffect(() => {
    void (async () => {
      try {
        const loaded = (await localCourses.get(id)) ?? (await loadBundledSource(id));
        const parsed = parseCourseFiles(new VirtualCourseFiles(loaded.files));
        if (!parsed.course) throw new Error(parsed.issues.map((issue) => issue.message).join(" "));
        setSource(loaded);
        setCourse(parsed.course);
        const saved = (await progressStore.get(id)) ?? blankProgress(id);
        setProgress({
          ...saved,
          currentLessonId: saved.currentLessonId ?? parsed.course.chapters[0]?.lessons[0]?.id,
        });
      } catch (error) {
        setFailure((error as Error).message);
      }
    })();
  }, [id]);
  const vfs = useMemo(() => (source ? new VirtualCourseFiles(source.files) : undefined), [source]);
  const assets = useMemo(() => (vfs ? new AssetUrls(vfs) : undefined), [vfs]);
  useEffect(() => () => assets?.revoke(), [assets]);
  const lessons = course?.chapters.flatMap((chapter) => chapter.lessons) ?? [];
  const selectedId =
    progress.currentLessonId && lessons.some((lesson) => lesson.id === progress.currentLessonId)
      ? progress.currentLessonId
      : lessons[0]?.id;
  const lesson = lessons.find((item) => item.id === selectedId);
  const index = lessons.findIndex((item) => item.id === selectedId);
  const save = (next: CourseProgress) => {
    if (lesson) {
      const lessonComplete = lesson.activities.every((activity) => {
        const activityKey = `${lesson.id}:${activity.id}`;
        if (activity.type === "notes") return next.completedNotes.includes(activityKey);
        if (activity.type === "assessment") return Boolean(next.assessments[activityKey]);
        return activity.questions
          .filter((question) => question.required)
          .every(
            (question) =>
              completion(question, next.responses[`${activityKey}:${question.id}`], true).complete,
          );
      });
      next.completedLessons = lessonComplete
        ? [...new Set([...next.completedLessons, lesson.id])]
        : next.completedLessons.filter((id) => id !== lesson.id);
    }
    next.updatedAt = new Date().toISOString();
    setProgress(next);
    void progressStore.put(next);
  };
  const setResponse = (key: string, value: unknown) =>
    save({ ...progress, responses: { ...progress.responses, [key]: value } });
  function submitAssessment(activity: Activity) {
    const required = activity.questions.filter((question) => question.required);
    const unmet = required.filter(
      (question) =>
        !completion(
          question,
          progress.responses[`${lesson!.id}:${activity.id}:${question.id}`],
          false,
        ).complete,
    );
    if (unmet.length) {
      alert(`Complete required questions: ${unmet.map((question) => question.id).join(", ")}.`);
      return;
    }
    let earned = 0;
    let possible = 0;
    for (const question of activity.questions)
      if (question.type !== "essay") {
        const response = progress.responses[`${lesson!.id}:${activity.id}:${question.id}`];
        if (question.required || hasResponse(response)) {
          possible += question.points;
          if (evaluateQuestion(question, response)) earned += question.points;
        }
      }
    const score = possible ? earned / possible : 1;
    const passed = score >= (activity.passingScore ?? 0);
    const key = `${lesson!.id}:${activity.id}`;
    save({
      ...progress,
      assessments: {
        ...progress.assessments,
        [key]: { score, passed, attemptedAt: new Date().toISOString() },
      },
    });
  }
  if (failure)
    return (
      <div className="empty">
        <h1>Course could not open</h1>
        <p>{failure}</p>
        <Link to="/discover">Return to Discover</Link>
      </div>
    );
  if (!course || !lesson || !assets)
    return <div className="status-card">Preparing the course reader…</div>;
  const render = (value: string) => richHtml(value, lesson, assets);
  const assessmentActivities = course.chapters
    .flatMap((chapter) => chapter.lessons)
    .flatMap((item) =>
      item.activities
        .filter((activity) => activity.type === "assessment")
        .map((activity) => `${item.id}:${activity.id}`),
    );
  const complete =
    assessmentActivities.length > 0 &&
    assessmentActivities.every((key) => progress.assessments[key]?.passed);
  return (
    <div className="reader-shell">
      <aside className="reader-sidebar">
        <Link to={`/courses/${course.id}`}>← Course overview</Link>
        <h2>{course.title}</h2>
        <div className="progress-bar">
          <i
            style={{
              width: `${Math.round((progress.completedLessons.length / lessons.length) * 100)}%`,
            }}
          />
        </div>
        {course.chapters.map((chapter) => (
          <section key={chapter.id}>
            <strong>{chapter.title}</strong>
            {chapter.lessons.map((item) => (
              <button
                className={item.id === lesson.id ? "current" : ""}
                key={item.id}
                onClick={() => save({ ...progress, currentLessonId: item.id })}
              >
                {progress.completedLessons.includes(item.id) ? "✓ " : ""}
                {item.title}
              </button>
            ))}
          </section>
        ))}
      </aside>
      <article className="lesson">
        <header>
          <p className="eyebrow">
            Lesson {index + 1} of {lessons.length}
          </p>
          <h1>{lesson.title}</h1>
          {lesson.description ? <p className="lede">{lesson.description}</p> : null}
        </header>
        {lesson.activities.map((activity) => {
          const activityKey = `${lesson.id}:${activity.id}`;
          const notesDone = progress.completedNotes.includes(activityKey);
          const assessment = progress.assessments[activityKey];
          return (
            <section
              className={`activity card ${assessment?.passed || notesDone ? "complete" : ""}`}
              key={activity.id}
            >
              <div className="activity-heading">
                <span className="activity-type">{activity.type}</span>
                <h2>{activity.title ?? activity.type}</h2>
              </div>
              <div
                className="rich"
                dangerouslySetInnerHTML={{ __html: render(activity.content) }}
              />
              {activity.questions.map((question) => {
                const key = `${activityKey}:${question.id}`;
                return (
                  <QuestionView
                    assessment={activity.type === "assessment"}
                    key={question.id}
                    question={question}
                    response={progress.responses[key]}
                    onChange={(value) => setResponse(key, value)}
                    render={render}
                  />
                );
              })}
              {activity.type === "notes" ? (
                <button
                  className="button secondary"
                  disabled={notesDone}
                  onClick={() =>
                    save({
                      ...progress,
                      completedNotes: [...new Set([...progress.completedNotes, activityKey])],
                    })
                  }
                >
                  {notesDone ? "Notes completed ✓" : "Mark notes complete"}
                </button>
              ) : null}
              {activity.type === "assessment" ? (
                <>
                  <button className="button" onClick={() => submitAssessment(activity)}>
                    Submit assessment
                  </button>
                  {assessment ? (
                    <p className={`assessment-result ${assessment.passed ? "pass" : "fail"}`}>
                      {Math.round(assessment.score * 100)}% ·{" "}
                      {assessment.passed ? "Passed" : "Not passed — retry when ready"}
                    </p>
                  ) : null}
                </>
              ) : null}
            </section>
          );
        })}
        {complete ? (
          <section className="completion-badge card">
            <span>✓</span>
            <h2>Course complete</h2>
            <p>You passed every assessment in {course.title}.</p>
          </section>
        ) : null}
        <nav className="lesson-navigation">
          {index > 0 ? (
            <button
              className="button secondary"
              onClick={() => save({ ...progress, currentLessonId: lessons[index - 1]!.id })}
            >
              ← Previous
            </button>
          ) : (
            <span />
          )}
          {index < lessons.length - 1 ? (
            <button
              className="button"
              onClick={() => save({ ...progress, currentLessonId: lessons[index + 1]!.id })}
            >
              Next →
            </button>
          ) : (
            <Link className="button secondary" to={`/courses/${course.id}`}>
              Course overview
            </Link>
          )}
        </nav>
      </article>
    </div>
  );
}
