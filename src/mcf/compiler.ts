import type { CourseSource, ParsedCourse, VirtualFile } from "../types";
import katex from "katex";
import { marked } from "marked";
import { parseCourseFiles } from "./parser";
import { exportZip } from "./zip";
import { dirname, joinPath, VirtualCourseFiles } from "./vfs";

const encoder = new TextEncoder();
const compiledStyles = `body{margin:0;font-family:system-ui,sans-serif;background:#f5f4f0;color:#20231f}header,main{width:min(100% - 2rem,60rem);margin:auto}header{padding:3rem 0 1rem}h1,h2,h3{font-family:Georgia,serif}nav,.actions{display:flex;flex-wrap:wrap;gap:.5rem;padding:1rem 0}button,input,textarea{font:inherit}button{padding:.6rem .8rem;border:1px solid #ccd2c9;border-radius:.4rem;background:white;cursor:pointer}.lesson{display:none;padding:1rem 0 4rem}.lesson.current{display:block}.activity,.question{padding:1.2rem;margin:1rem 0;border:1px solid #d5d9d1;border-radius:.6rem;background:#fff}.question{background:#f8f8f5}.option{display:block;padding:.4rem}.question input[type=text],.question input[type=number],textarea{width:100%;padding:.6rem;box-sizing:border-box}.notice,.feedback{color:#687066}.feedback{padding:.6rem;background:#e2e9e1}.progress{height:.4rem;background:#e2e9e1}.progress i{display:block;height:100%;background:#526b54}.source-content{white-space:pre-wrap;font-family:inherit}.complete{border-left:4px solid #526b54}.course-complete{display:none;padding:1rem;background:#e2e9e1}.course-complete.visible{display:block}`;

function standalonePlayer() {
  type State = {
    lesson: number;
    notes: string[];
    responses: Record<string, unknown>;
    assessments: Record<string, { score: number; passed: boolean }>;
    done: string[];
  };
  const course = (window as unknown as { THEORIA_COURSE: ParsedCourse }).THEORIA_COURSE;
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  const storageKey = `theoria-export:${course.id}`;
  const state = JSON.parse(
    localStorage.getItem(storageKey) ||
      '{"lesson":0,"notes":[],"responses":{},"assessments":{},"done":[]}',
  ) as State;
  state.notes ??= [];
  state.responses ??= {};
  state.assessments ??= {};
  state.done ??= [];
  const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
  const has = (value: unknown) =>
    Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0;
  const correct = (
    question: ParsedCourse["chapters"][number]["lessons"][number]["activities"][number]["questions"][number],
    response: unknown,
  ) => {
    if (question.type === "multiple_select")
      return (
        JSON.stringify([...(response as string[])].sort()) ===
        JSON.stringify([...(question.answer as string[])].sort())
      );
    if (question.type === "true_false") return (response === "true") === question.answer;
    if (question.type === "numeric")
      return (
        has(response) &&
        Math.abs(Number(response) - Number(question.answer)) <= (question.tolerance ?? 0)
      );
    if (question.type === "short_answer")
      return String(response).trim().toLowerCase() === String(question.answer).trim().toLowerCase();
    if (question.type === "essay") {
      const value = String(response ?? "").trim();
      const words = value ? value.split(/\s+/).length : 0;
      const sentences = value
        ? (value.match(/[^.!?]+[.!?]+/g)?.length ?? 0) +
          (value.replace(/[^.!?]+[.!?]+/g, "").trim() ? 1 : 0)
        : 0;
      const normalized = value.toLowerCase();
      const keywords = (question.keywords ?? []).filter((keyword) =>
        normalized.includes(keyword.toLowerCase().trim()),
      ).length;
      const requiredKeywords = question.keywords?.length
        ? (question.minimumKeywords ?? question.keywords.length)
        : 0;
      return (
        words >= (question.minimumWords ?? 1) &&
        sentences >= (question.minimumSentences ?? 0) &&
        keywords >= requiredKeywords
      );
    }
    return response === question.answer;
  };
  const response = (element: HTMLElement, type: string) => {
    const controls = [
      ...element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea"),
    ];
    if (type === "multiple_select")
      return controls
        .filter((control) => control instanceof HTMLInputElement && control.checked)
        .map((control) => control.value);
    return (
      controls.find((control) => control instanceof HTMLInputElement && control.checked)?.value ??
      controls[0]?.value ??
      ""
    );
  };
  const refresh = () => {
    state.done = lessons
      .filter((lesson) =>
        lesson.activities.every((activity) =>
          activity.type === "notes"
            ? state.notes.includes(`${lesson.id}:${activity.id}`)
            : activity.type === "assessment"
              ? Boolean(state.assessments[`${lesson.id}:${activity.id}`])
              : activity.questions
                  .filter((question) => question.required)
                  .every((question) =>
                    correct(
                      question,
                      state.responses[`${lesson.id}:${activity.id}:${question.id}`],
                    ),
                  ),
        ),
      )
      .map((lesson) => lesson.id);
    document
      .querySelectorAll<HTMLElement>(".lesson")
      .forEach((element, index) => element.classList.toggle("current", index === state.lesson));
    document
      .querySelectorAll<HTMLButtonElement>("[data-nav]")
      .forEach((element, index) => element.toggleAttribute("disabled", index === state.lesson));
    const bar = document.querySelector<HTMLElement>(".progress i");
    if (bar)
      bar.style.width = `${lessons.length ? (state.done.length / lessons.length) * 100 : 0}%`;
    const assessments = lessons.flatMap((lesson) =>
      lesson.activities
        .filter((activity) => activity.type === "assessment")
        .map((activity) => `${lesson.id}:${activity.id}`),
    );
    document
      .querySelector(".course-complete")
      ?.classList.toggle(
        "visible",
        assessments.length > 0 && assessments.every((key) => state.assessments[key]?.passed),
      );
    save();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((button, index) => {
    button.onclick = () => {
      state.lesson = index;
      refresh();
      scrollTo({ top: 0, behavior: "smooth" });
    };
  });
  document.querySelectorAll<HTMLElement>("[data-lesson]").forEach((lessonElement, lessonIndex) => {
    const lesson = lessons[lessonIndex]!;
    lessonElement
      .querySelectorAll<HTMLElement>("[data-activity]")
      .forEach((activityElement, activityIndex) => {
        const activity = lesson.activities[activityIndex]!;
        const activityKey = `${lesson.id}:${activity.id}`;
        const questions = activityElement.querySelector<HTMLElement>(".questions")!;
        for (const question of activity.questions) {
          const key = `${activityKey}:${question.id}`;
          const container = document.createElement("div");
          container.className = "question";
          const prompt = document.createElement("p");
          prompt.textContent = question.prompt;
          container.append(prompt);
          const values =
            question.type === "true_false"
              ? [
                  { id: "true", text: "True" },
                  { id: "false", text: "False" },
                ]
              : (question.options ?? []);
          if (["multiple_choice", "multiple_select", "true_false"].includes(question.type))
            for (const option of values) {
              const label = document.createElement("label");
              label.className = "option";
              const input = document.createElement("input");
              input.type = question.type === "multiple_select" ? "checkbox" : "radio";
              input.name = key;
              input.value = option.id;
              const stored = state.responses[key];
              input.checked = Array.isArray(stored)
                ? stored.includes(option.id)
                : stored === option.id;
              label.append(input, document.createTextNode(` ${option.text}`));
              container.append(label);
            }
          else {
            const input =
              question.type === "essay"
                ? document.createElement("textarea")
                : document.createElement("input");
            if (input instanceof HTMLInputElement)
              input.type = question.type === "numeric" ? "number" : "text";
            input.value = String(state.responses[key] ?? "");
            container.append(input);
          }
          container.onchange = () => {
            state.responses[key] = response(container, question.type);
            save();
          };
          if (activity.type === "practice") {
            const button = document.createElement("button");
            button.textContent = question.type === "essay" ? "Check completion" : "Check answer";
            const feedback = document.createElement("p");
            feedback.className = "feedback";
            button.onclick = () => {
              const value = response(container, question.type);
              state.responses[key] = value;
              feedback.textContent = !has(value)
                ? "Add a response first."
                : correct(question, value)
                  ? question.type === "essay"
                    ? "Completion requirements met."
                    : "Correct — nicely done."
                  : "Not quite. Try again.";
              save();
            };
            container.append(button, feedback);
          }
          questions.append(container);
        }
        if (activity.type === "notes") {
          const button = activityElement.querySelector<HTMLButtonElement>(".notes-complete")!;
          if (state.notes.includes(activityKey)) {
            button.disabled = true;
            button.textContent = "Notes completed ✓";
          }
          button.onclick = () => {
            state.notes = [...new Set([...state.notes, activityKey])];
            button.disabled = true;
            button.textContent = "Notes completed ✓";
            refresh();
          };
        }
        if (activity.type === "assessment") {
          const button = activityElement.querySelector<HTMLButtonElement>(".assessment-submit")!;
          const output = activityElement.querySelector<HTMLElement>(".assessment-result")!;
          const prior = state.assessments[activityKey];
          if (prior)
            output.textContent = `${Math.round(prior.score * 100)}% · ${prior.passed ? "Passed" : "Not passed"}`;
          button.onclick = () => {
            const missing = activity.questions.filter((question) => {
              const value = state.responses[`${activityKey}:${question.id}`];
              return (
                question.required &&
                (question.type === "essay" ? !correct(question, value) : !has(value))
              );
            });
            if (missing.length) {
              output.textContent = `Complete required questions: ${missing.map((item) => item.id).join(", ")}`;
              return;
            }
            let earned = 0,
              possible = 0;
            for (const question of activity.questions)
              if (
                question.type !== "essay" &&
                (question.required || has(state.responses[`${activityKey}:${question.id}`]))
              ) {
                possible += question.points;
                if (correct(question, state.responses[`${activityKey}:${question.id}`]))
                  earned += question.points;
              }
            const score = possible ? earned / possible : 1;
            const passed = score >= (activity.passingScore ?? 0);
            state.assessments[activityKey] = { score, passed };
            output.textContent = `${Math.round(score * 100)}% · ${passed ? "Passed" : "Not passed — retry when ready"}`;
            refresh();
          };
        }
      });
  });
  refresh();
}

const player = `(${standalonePlayer.toString()})()`;

function escapeScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}
function safeRich(source: string) {
  const math: Array<{ value: string; display: boolean }> = [];
  const media: string[] = [];
  const mathToken = "THEORIAEXPORTMATH";
  const mediaToken = "THEORIAEXPORTMEDIA";
  const withoutControls = source
    .replace(/<div data-mcf-question="[^"]+"><\/div>/g, "")
    .replace(
      /\$\$([\s\S]*?)\$\$/g,
      (_match, value: string) =>
        `${mathToken}${math.push({ value: value.trim(), display: true }) - 1}END`,
    )
    .replace(
      /(?<!\\)\$([^\n$]+)\$/g,
      (_match, value: string) => `${mathToken}${math.push({ value, display: false }) - 1}END`,
    )
    .replace(
      /@\[(audio|video)\]\((\S+)(?:\s+"([^"]*)")?\)/g,
      (_match, kind: string, url: string, label: string) => {
        const safe = /^(?:https?:|youtube:|#|[a-z0-9._/-]+)$/i.test(url) ? url : "#";
        const output = safe.startsWith("youtube:")
          ? `<p><a href="https://www.youtube.com/watch?v=${escapeHtml(safe.slice(8))}">${escapeHtml(label || "Open video on YouTube")}</a> <small>Remote media — internet required.</small></p>`
          : `<figure><${kind} controls preload="metadata" src="${escapeHtml(safe)}"></${kind}>${label ? `<figcaption>${escapeHtml(label)}</figcaption>` : ""}${/^https?:/i.test(safe) ? "<small>Remote media — internet required.</small>" : ""}</figure>`;
        return `${mediaToken}${media.push(output) - 1}END`;
      },
    )
    .replace(/(\]\()([^\s)]+)([^)]*\))/g, (_match, open: string, url: string, close: string) => {
      const safe = /^(?:https?:|mailto:|#|[a-z0-9._/-]+)$/i.test(url) && !/^javascript:/i.test(url);
      return `${open}${safe ? url : "#"}${close}`;
    });
  return (marked.parse(escapeHtml(withoutControls), { async: false }) as string)
    .replace(new RegExp(`${mathToken}(\\d+)END`, "g"), (_match, index: string) => {
      const expression = math[Number(index)];
      return expression
        ? katex.renderToString(expression.value, {
            displayMode: expression.display,
            throwOnError: false,
          })
        : "";
    })
    .replace(
      new RegExp(`${mediaToken}(\\d+)END`, "g"),
      (_match, index: string) => media[Number(index)] ?? "",
    );
}

function remapReferences(course: ParsedCourse) {
  const output = structuredClone(course);
  const remap = (source: string, lessonPath: string) =>
    source.replace(
      /(\]\(|@\[(?:audio|video)\]\()([^)]+?)(\s+(?:"[^"]*"|'[^']*'))?\)/g,
      (_match, open: string, reference: string, title: string | undefined) => {
        if (/^(?:https?:|youtube:|mailto:|#)/i.test(reference))
          return `${open}${reference}${title ?? ""})`;
        try {
          return `${open}${joinPath(dirname(lessonPath), reference.trim())}${title ?? ""})`;
        } catch {
          return `${open}#${title ?? ""})`;
        }
      },
    );
  for (const lesson of output.chapters.flatMap((chapter) => chapter.lessons))
    for (const activity of lesson.activities) {
      activity.content = remap(activity.content, lesson.sourcePath);
      for (const question of activity.questions) {
        question.prompt = remap(question.prompt, lesson.sourcePath);
        if (question.hint) question.hint = remap(question.hint, lesson.sourcePath);
        if (question.explanation)
          question.explanation = remap(question.explanation, lesson.sourcePath);
        for (const option of question.options ?? [])
          option.text = remap(option.text, lesson.sourcePath);
      }
    }
  return output;
}
function standaloneHtml(course: ParsedCourse) {
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  return `<!doctype html><html lang="${course.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(course.title)}</title><link rel="stylesheet" href="styles.css"></head><body><header><p>Theoria offline course</p><h1>${escapeHtml(course.title)}</h1><div class="progress"><i></i></div><nav>${lessons.map((lesson, index) => `<button data-nav>${index + 1}. ${escapeHtml(lesson.title)}</button>`).join("")}</nav><div class="course-complete"><strong>Course complete</strong> — every assessment passed.</div></header><main>${lessons.map((lesson, lessonIndex) => `<article class="lesson" data-lesson="${lessonIndex}"><h2>${escapeHtml(lesson.title)}</h2>${lesson.activities.map((activity, activityIndex) => `<section class="activity" data-activity="${activityIndex}"><small>${activity.type}</small><h3>${escapeHtml(activity.title ?? activity.type)}</h3><div class="source-content">${safeRich(activity.content)}</div><div class="questions"></div>${activity.type === "notes" ? '<button class="notes-complete">Mark notes complete</button>' : ""}${activity.type === "assessment" ? '<div class="actions"><button class="assessment-submit">Submit assessment</button></div><p class="assessment-result feedback"></p>' : ""}</section>`).join("")}</article>`).join("")}</main><script>window.THEORIA_COURSE=${escapeScript(course)}</script><script src="player.js"></script></body></html>`;
}

export function compileCourse(source: CourseSource) {
  const result = parseCourseFiles(new VirtualCourseFiles(source.files));
  if (!result.course) return { issues: result.issues };
  const course = result.course;
  const compiledCourse = remapReferences(course);
  const assets = source.files.filter((file) =>
    /\.(?:svg|png|jpe?g|gif|webp|avif|mp3|ogg|wav|m4a|mp4|webm|vtt)$/i.test(file.path),
  );
  const files: VirtualFile[] = [
    { path: "index.html", data: encoder.encode(standaloneHtml(compiledCourse)) },
    { path: "styles.css", data: encoder.encode(compiledStyles) },
    { path: "player.js", data: encoder.encode(player) },
    { path: "course.json", data: encoder.encode(JSON.stringify(compiledCourse, null, 2)) },
    ...assets,
  ];
  return {
    course,
    files,
    issues: result.issues,
    metadata: {
      compiler: "theoria-core",
      format: "mcf-1.0",
      compiledAt: new Date().toISOString(),
      fileCount: files.length,
    },
  };
}

export const compileZip = async (source: CourseSource) => {
  const result = compileCourse(source);
  return result.course ? { ...result, zip: await exportZip(result.files!) } : result;
};
