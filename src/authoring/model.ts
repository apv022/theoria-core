import * as yaml from "js-yaml";
import type { ActivityType, CourseSource, QuestionType, VirtualFile } from "../types";

export interface DraftQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  answer: string | string[] | number | boolean | undefined;
  hint: string;
  explanation: string;
  points: number;
  required: boolean;
  minimumWords?: number;
}
export interface DraftActivity {
  id: string;
  type: ActivityType;
  title: string;
  content: string;
  passingScore?: number;
  questions: DraftQuestion[];
}
export interface DraftLesson {
  id: string;
  title: string;
  description: string;
  activities: DraftActivity[];
}
export interface DraftChapter {
  id: string;
  title: string;
  description: string;
  lessons: DraftLesson[];
}
export interface CourseDraft {
  id: string;
  title: string;
  description: string;
  author: string;
  language: string;
  version: string;
  license: string;
  cover?: string;
  chapters: DraftChapter[];
  media: VirtualFile[];
}

export const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^[^a-z]+/, "") || "item";
export function uniqueId(base: string, existing: string[]) {
  const stem = slug(base);
  let value = stem;
  let number = 2;
  while (existing.includes(value)) value = `${stem}-${number++}`;
  return value;
}
const clean = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));

function questionSource(question: DraftQuestion) {
  const answer =
    question.type === "numeric"
      ? Number(question.answer)
      : question.type === "true_false"
        ? question.answer === true || question.answer === "true"
        : question.answer;
  return yaml
    .dump(
      clean({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: ["multiple_choice", "multiple_select"].includes(question.type)
          ? question.options
          : undefined,
        answer: question.type === "essay" ? undefined : answer,
        hint: question.hint,
        explanation: question.explanation,
        points: question.points,
        required: question.required,
        minimum_words: question.type === "essay" ? question.minimumWords : undefined,
      }),
      { noRefs: true, lineWidth: 100 },
    )
    .trim();
}
function lessonSource(lesson: DraftLesson, author: string, license: string) {
  const front = yaml
    .dump(
      clean({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        authors: [author],
        license,
      }),
      { noRefs: true, lineWidth: 100 },
    )
    .trim();
  const activities = lesson.activities
    .map((activity) => {
      const meta = yaml
        .dump(
          clean({
            type: activity.type,
            id: activity.id,
            title: activity.title,
            passing_score:
              activity.type === "assessment" ? (activity.passingScore ?? 0.7) : undefined,
          }),
          { noRefs: true },
        )
        .trim();
      const questions = activity.questions
        .map((question) => `\n\n\`\`\`mcf-question\n${questionSource(question)}\n\`\`\``)
        .join("");
      return `:::mcf-activity\n${meta}\n:::\n\n${activity.content}${questions}\n\n:::mcf-end`;
    })
    .join("\n\n");
  return `---\n${front}\n---\n\n${activities}\n`;
}

export function generateSource(draft: CourseDraft): CourseSource {
  const encoder = new TextEncoder();
  const files: VirtualFile[] = [];
  const manifest = clean({
    mcf: "1.0",
    id: draft.id,
    title: draft.title,
    language: draft.language,
    description: draft.description,
    authors: [draft.author],
    license: draft.license,
    version: draft.version,
    cover: draft.cover,
    chapters: draft.chapters.map((chapter) => ({ source: `chapters/${chapter.id}` })),
  });
  files.push({
    path: "manifest.yaml",
    data: encoder.encode(yaml.dump(manifest, { noRefs: true, lineWidth: 100 })),
  });
  for (const chapter of draft.chapters) {
    const root = `chapters/${chapter.id}`;
    files.push({
      path: `${root}/chapter.yaml`,
      data: encoder.encode(
        yaml.dump(
          clean({
            id: chapter.id,
            title: chapter.title,
            description: chapter.description,
            lessons: chapter.lessons.map((lesson) => `lessons/${lesson.id}.mcf`),
          }),
          { noRefs: true, lineWidth: 100 },
        ),
      ),
    });
    for (const lesson of chapter.lessons)
      files.push({
        path: `${root}/lessons/${lesson.id}.mcf`,
        data: encoder.encode(lessonSource(lesson, draft.author, draft.license)),
      });
  }
  files.push(...draft.media);
  return {
    id: draft.id,
    title: draft.title,
    origin: "authored",
    files,
    updatedAt: new Date().toISOString(),
  };
}

export function initialDraft(): CourseDraft {
  return {
    id: "my-course",
    title: "My course",
    description: "A course made in Theoria.",
    author: "Course author",
    language: "en",
    version: "1.0.0",
    license: "CC-BY-4.0",
    media: [],
    chapters: [
      {
        id: "introduction",
        title: "Introduction",
        description: "",
        lessons: [
          {
            id: "welcome",
            title: "Welcome",
            description: "",
            activities: [
              {
                id: "welcome-notes",
                type: "notes",
                title: "Learn",
                content: "# Welcome\n\nStart writing your lesson here.",
                questions: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function newQuestion(type: QuestionType, existing: string[]): DraftQuestion {
  const id = uniqueId(`${type}-question`, existing);
  return {
    id,
    type,
    prompt: "Write the question prompt.",
    options: ["multiple_choice", "multiple_select"].includes(type)
      ? [
          { id: "a", text: "First option" },
          { id: "b", text: "Second option" },
        ]
      : [],
    answer:
      type === "multiple_select"
        ? ["a"]
        : type === "multiple_choice"
          ? "a"
          : type === "true_false"
            ? true
            : type === "numeric"
              ? 0
              : type === "essay"
                ? undefined
                : "answer",
    hint: "",
    explanation: "",
    points: 1,
    required: true,
    minimumWords: type === "essay" ? 20 : undefined,
  };
}
