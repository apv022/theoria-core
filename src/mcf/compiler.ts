import type { CourseSource, ParsedCourse, VirtualFile } from "../types";
import { parseCourseFiles } from "./parser";
import { exportZip } from "./zip";
import { VirtualCourseFiles } from "./vfs";

const encoder = new TextEncoder();
const compiledStyles = `body{margin:0;font-family:system-ui,sans-serif;background:#f5f4f0;color:#20231f}header,main{width:min(100% - 2rem,60rem);margin:auto}header{padding:3rem 0 1rem}h1,h2{font-family:Georgia,serif}nav{display:flex;flex-wrap:wrap;gap:.5rem;padding:1rem 0}button{padding:.6rem .8rem;border:1px solid #ccd2c9;border-radius:.4rem;background:white;cursor:pointer}.lesson{display:none;padding:1rem 0 4rem}.lesson.current{display:block}.activity{padding:1.2rem;margin:1rem 0;border:1px solid #d5d9d1;border-radius:.6rem;background:#fff}.notice{color:#687066}.progress{height:.4rem;background:#e2e9e1}.progress i{display:block;height:100%;background:#526b54}`;
const player = `const course=window.THEORIA_COURSE;const root=document.querySelector('main');const key='theoria-export:'+course.id;let state=JSON.parse(localStorage.getItem(key)||'{"lesson":0,"done":[]}');const lessons=course.chapters.flatMap(c=>c.lessons);function show(i){state.lesson=Math.max(0,Math.min(i,lessons.length-1));localStorage.setItem(key,JSON.stringify(state));document.querySelectorAll('.lesson').forEach((el,n)=>el.classList.toggle('current',n===state.lesson));document.querySelectorAll('[data-nav]').forEach((el,n)=>el.toggleAttribute('disabled',n===state.lesson));document.querySelector('.progress i').style.width=((state.lesson+1)/lessons.length*100)+'%'}document.querySelectorAll('[data-nav]').forEach((button,i)=>button.onclick=()=>show(i));show(state.lesson);`;

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
function standaloneHtml(course: ParsedCourse) {
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  return `<!doctype html><html lang="${course.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(course.title)}</title><link rel="stylesheet" href="styles.css"></head><body><header><p>Theoria offline course</p><h1>${escapeHtml(course.title)}</h1><div class="progress"><i></i></div><nav>${lessons.map((lesson, index) => `<button data-nav>${index + 1}. ${escapeHtml(lesson.title)}</button>`).join("")}</nav></header><main>${lessons.map((lesson) => `<article class="lesson"><h2>${escapeHtml(lesson.title)}</h2>${lesson.activities.map((activity) => `<section class="activity"><small>${activity.type}</small><h3>${escapeHtml(activity.title ?? activity.type)}</h3><pre class="source-content">${escapeHtml(activity.content)}</pre>${activity.questions.length ? `<p class="notice">Interactive responses and answers are described in course.json. Open this course in Theoria Core for the full assessment interface.</p>` : ""}</section>`).join("")}</article>`).join("")}</main><script>window.THEORIA_COURSE=${escapeScript(course)}</script><script src="player.js"></script></body></html>`;
}

export function compileCourse(source: CourseSource) {
  const result = parseCourseFiles(new VirtualCourseFiles(source.files));
  if (!result.course) return { issues: result.issues };
  const course = result.course;
  const sourcePaths = new Set(source.files.map((file) => file.path));
  const assets = source.files.filter((file) => file.path.startsWith("assets/"));
  const files: VirtualFile[] = [
    { path: "index.html", data: encoder.encode(standaloneHtml(course)) },
    { path: "styles.css", data: encoder.encode(compiledStyles) },
    { path: "player.js", data: encoder.encode(player) },
    { path: "course.json", data: encoder.encode(JSON.stringify(course, null, 2)) },
    ...assets.filter((file) => sourcePaths.has(file.path)),
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
