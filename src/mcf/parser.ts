import * as yaml from "js-yaml";
import type {
  Activity,
  Chapter,
  Lesson,
  ParsedCourse,
  Question,
  QuestionType,
  ValidationIssue,
} from "../types";
import { dirname, joinPath, VirtualCourseFiles } from "./vfs";

type Data = Record<string, unknown>;
const ID = /^[a-z][a-z0-9._-]*$/;
const QUESTION_TYPES = new Set([
  "multiple_choice",
  "multiple_select",
  "true_false",
  "numeric",
  "short_answer",
  "essay",
]);
const ACTIVITY_TYPES = new Set(["notes", "practice", "assessment"]);
const object = (value: unknown): Data =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};

function readYaml(source: string, file: string, issues: ValidationIssue[]): Data {
  try {
    return object(yaml.load(source));
  } catch (error) {
    issues.push({ file, severity: "error", message: `Invalid YAML: ${(error as Error).message}` });
    return {};
  }
}
function error(issues: ValidationIssue[], file: string, message: string) {
  issues.push({ file, message, severity: "error" });
}
function text(data: Data, key: string, file: string, issues: ValidationIssue[], required = true) {
  const value = data[key];
  if (typeof value === "string" && value.length) return value;
  if (required) error(issues, file, `Required field "${key}" must be a non-empty string.`);
  return undefined;
}
function id(data: Data, key: string, file: string, issues: ValidationIssue[]) {
  const value = text(data, key, file, issues) ?? "invalid";
  if (!ID.test(value)) error(issues, file, `Identifier "${value}" must match [a-z][a-z0-9._-]*.`);
  return value;
}
function stringList(value: unknown, key: string, file: string, issues: ValidationIssue[]) {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((item) => typeof item === "string"))
    return value as string[];
  error(issues, file, `Field "${key}" must be a list of strings.`);
  return undefined;
}

function parseQuestion(raw: string, file: string, issues: ValidationIssue[]): Question {
  const data = readYaml(raw, file, issues);
  const questionId = id(data, "id", file, issues);
  const type = text(data, "type", file, issues) ?? "invalid";
  if (!QUESTION_TYPES.has(type))
    error(issues, file, `Question "${questionId}" has unsupported type "${type}".`);
  let options: Array<{ id: string; text: string }> | undefined;
  if (data.options !== undefined) {
    if (!Array.isArray(data.options))
      error(issues, file, `Question "${questionId}" options must be a list.`);
    else
      options = data.options.map((rawOption) => {
        const option = object(rawOption);
        return {
          id: id(option, "id", file, issues),
          text: text(option, "text", file, issues) ?? "",
        };
      });
  }
  const optionIds = options?.map((option) => option.id) ?? [];
  if (new Set(optionIds).size !== optionIds.length)
    error(issues, file, `Question "${questionId}" has duplicate option IDs.`);
  if (["multiple_choice", "multiple_select"].includes(type)) {
    const answers = type === "multiple_select" ? data.answer : [data.answer];
    if (!options?.length) error(issues, file, `Question "${questionId}" requires options.`);
    if (
      !Array.isArray(answers) ||
      !answers.length ||
      answers.some((answer) => typeof answer !== "string" || !optionIds.includes(answer))
    )
      error(issues, file, `Question "${questionId}" has an invalid answer.`);
  } else if (data.options !== undefined)
    error(issues, file, `Question "${questionId}" type "${type}" must not define options.`);
  if (type === "true_false" && typeof data.answer !== "boolean")
    error(issues, file, `Question "${questionId}" answer must be true or false.`);
  if (type === "numeric" && (typeof data.answer !== "number" || !Number.isFinite(data.answer)))
    error(issues, file, `Question "${questionId}" answer must be numeric.`);
  if (type === "short_answer" && typeof data.answer !== "string")
    error(issues, file, `Question "${questionId}" answer must be a string.`);
  if (type === "essay" && data.answer !== undefined)
    error(issues, file, `Essay question "${questionId}" must not define an objective answer.`);
  const positive = (key: string) =>
    data[key] === undefined || (Number.isInteger(data[key]) && Number(data[key]) > 0);
  for (const key of ["minimum_words", "minimum_sentences", "minimum_keywords"])
    if (!positive(key))
      error(
        issues,
        file,
        `Essay question "${questionId}" field "${key}" must be a positive integer.`,
      );
  const keywords = stringList(data.keywords, "keywords", file, issues);
  if (data.minimum_keywords !== undefined && !keywords)
    error(issues, file, `Essay question "${questionId}" minimum_keywords requires keywords.`);
  if (
    typeof data.minimum_keywords === "number" &&
    keywords &&
    data.minimum_keywords > keywords.length
  )
    error(issues, file, `Essay question "${questionId}" minimum_keywords exceeds keywords.`);
  if (
    data.tolerance !== undefined &&
    (type !== "numeric" || typeof data.tolerance !== "number" || data.tolerance < 0)
  )
    error(issues, file, `Question "${questionId}" has invalid tolerance.`);
  return {
    id: questionId,
    type: type as QuestionType,
    prompt: text(data, "prompt", file, issues) ?? "",
    options,
    answer: data.answer as Question["answer"],
    tolerance: data.tolerance as number | undefined,
    hint: text(data, "hint", file, issues, false),
    explanation: text(data, "explanation", file, issues, false),
    points: typeof data.points === "number" ? data.points : 1,
    required: typeof data.required === "boolean" ? data.required : true,
    minimumWords: data.minimum_words as number | undefined,
    minimumSentences: data.minimum_sentences as number | undefined,
    keywords,
    minimumKeywords: data.minimum_keywords as number | undefined,
  };
}

export function parseLessonSource(source: string, file: string, issues: ValidationIssue[]): Lesson {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    error(issues, file, "Lesson must begin with YAML frontmatter delimited by ---.");
    return { id: "invalid", title: "", sourcePath: file, activities: [] };
  }
  const front = readYaml(match[1] ?? "", file, issues);
  const body = match[2] ?? "";
  const activities: Activity[] = [];
  const expression =
    /:::mcf-activity\s*\r?\n([\s\S]*?)\r?\n:::\s*\r?\n([\s\S]*?)\r?\n:::mcf-end(?:\s*\r?\n|\s*$)/g;
  let cursor = 0;
  let found: RegExpExecArray | null;
  while ((found = expression.exec(body))) {
    if (
      body
        .slice(cursor, found.index)
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim()
    )
      error(issues, file, "Content exists outside an activity container.");
    cursor = expression.lastIndex;
    const meta = readYaml(found[1] ?? "", file, issues);
    const activityId = id(meta, "id", file, issues);
    const type = text(meta, "type", file, issues) ?? "invalid";
    if (!ACTIVITY_TYPES.has(type))
      error(issues, file, `Activity "${activityId}" has unsupported type "${type}".`);
    const questions: Question[] = [];
    const content = (found[2] ?? "").replace(
      /```mcf-question\s*\r?\n([\s\S]*?)\r?\n```/g,
      (_all, raw: string) => {
        const question = parseQuestion(raw, file, issues);
        questions.push(question);
        return `\n<div data-mcf-question="${question.id}"></div>\n`;
      },
    );
    const passingScore = meta.passing_score as number | undefined;
    if (
      passingScore !== undefined &&
      (type !== "assessment" ||
        typeof passingScore !== "number" ||
        passingScore < 0 ||
        passingScore > 1)
    )
      error(issues, file, `Activity "${activityId}" has invalid passing_score.`);
    activities.push({
      id: activityId,
      type: type as Activity["type"],
      title: text(meta, "title", file, issues, false),
      content,
      questions,
      passingScore,
      required: true,
      randomize: meta.randomize as boolean | undefined,
      questionPoolSize: meta.question_pool_size as number | undefined,
    });
  }
  if (
    body
      .slice(cursor)
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim()
  )
    error(issues, file, "Unclosed activity container or content outside an activity.");
  if (!activities.length) error(issues, file, "Lesson must contain at least one activity.");
  const ids = [
    ...activities.map((activity) => activity.id),
    ...activities.flatMap((activity) => activity.questions.map((question) => question.id)),
  ];
  if (new Set(ids).size !== ids.length)
    error(issues, file, "Activity and question IDs must be unique within the lesson.");
  return {
    id: id(front, "id", file, issues),
    title: text(front, "title", file, issues) ?? "",
    description: text(front, "description", file, issues, false),
    sourcePath: file,
    activities,
  };
}

export function parseCourseFiles(vfs: VirtualCourseFiles): {
  course?: ParsedCourse;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  if (!vfs.has("manifest.yaml"))
    return {
      issues: [
        {
          file: "manifest.yaml",
          severity: "error",
          message: "Required manifest.yaml does not exist.",
        },
      ],
    };
  const manifest = readYaml(vfs.text("manifest.yaml"), "manifest.yaml", issues);
  if (manifest.mcf !== "1.0")
    error(issues, "manifest.yaml", `Unsupported MCF version "${String(manifest.mcf)}".`);
  const chapters: Chapter[] = [];
  const refs = manifest.chapters;
  if (!Array.isArray(refs) || !refs.length)
    error(issues, "manifest.yaml", 'Field "chapters" must be a non-empty ordered list.');
  else
    for (const entry of refs) {
      const source = object(entry).source;
      if (typeof source !== "string") {
        error(issues, "manifest.yaml", "Each chapter entry must contain source.");
        continue;
      }
      let chapterFile: string;
      try {
        chapterFile = joinPath(source, "chapter.yaml");
      } catch {
        error(issues, "manifest.yaml", `Chapter path escapes the course root: ${source}`);
        continue;
      }
      if (!chapterFile.startsWith("chapters/") || !vfs.has(chapterFile)) {
        error(issues, "manifest.yaml", `Chapter path does not exist: ${source}`);
        continue;
      }
      const data = readYaml(vfs.text(chapterFile), chapterFile, issues);
      const lessons: Lesson[] = [];
      if (!Array.isArray(data.lessons) || !data.lessons.length)
        error(issues, chapterFile, 'Field "lessons" must be a non-empty ordered list.');
      else
        for (const reference of data.lessons) {
          if (typeof reference !== "string") {
            error(issues, chapterFile, "Lesson entries must be paths.");
            continue;
          }
          let path: string;
          try {
            path = joinPath(dirname(chapterFile), reference);
          } catch {
            error(issues, chapterFile, `Lesson path escapes the course root: ${reference}`);
            continue;
          }
          if (!path.endsWith(".mcf"))
            error(issues, chapterFile, `Lesson must use .mcf extension: ${reference}`);
          if (!vfs.has(path))
            error(issues, chapterFile, `Lesson path does not exist: ${reference}`);
          else lessons.push(parseLessonSource(vfs.text(path), path, issues));
        }
      chapters.push({
        id: id(data, "id", chapterFile, issues),
        title: text(data, "title", chapterFile, issues) ?? "",
        description: text(data, "description", chapterFile, issues, false),
        lessons,
      });
    }
  const chapterIds = chapters.map((chapter) => chapter.id);
  const lessonIds = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
  if (new Set(chapterIds).size !== chapterIds.length)
    error(issues, "manifest.yaml", "Chapter IDs must be unique within the course.");
  if (new Set(lessonIds).size !== lessonIds.length)
    error(issues, "manifest.yaml", "Lesson IDs must be unique within the course.");
  const course: ParsedCourse = {
    mcf: "1.0",
    id: id(manifest, "id", "manifest.yaml", issues),
    title: text(manifest, "title", "manifest.yaml", issues) ?? "",
    language: text(manifest, "language", "manifest.yaml", issues) ?? "",
    description: text(manifest, "description", "manifest.yaml", issues, false),
    authors: stringList(manifest.authors, "authors", "manifest.yaml", issues) ?? [],
    license: text(manifest, "license", "manifest.yaml", issues, false),
    version: text(manifest, "version", "manifest.yaml", issues, false) ?? "1.0.0",
    cover: text(manifest, "cover", "manifest.yaml", issues, false),
    chapters,
  };
  return issues.some((issue) => issue.severity === "error") ? { issues } : { course, issues };
}
