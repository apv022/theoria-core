export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type QuestionType =
  "multiple_choice" | "multiple_select" | "true_false" | "numeric" | "short_answer" | "essay";
export type ActivityType = "notes" | "practice" | "assessment";

export interface VirtualFile {
  path: string;
  data: Uint8Array;
  type?: string;
}
export interface CourseSource {
  id: string;
  title: string;
  origin: "bundled" | "authored" | "imported";
  files: VirtualFile[];
  updatedAt: string;
}
export interface Enrollment {
  courseId: string;
  title: string;
  sourceType: CourseSource["origin"];
  startingLessonId?: string;
  lastLessonId?: string;
  startedAt: string;
  lastOpenedAt: string;
}
export interface CompilationRecord {
  courseId: string;
  title: string;
  source: CourseSource;
  artifact?: Blob;
  compiledAt: string;
  warningCount: number;
  outputSize: number;
  status: "valid" | "warnings";
}
export interface CatalogCourse {
  id: string;
  title: string;
  description: string;
  author: string;
  subject: string;
  difficulty: Difficulty;
  featured: boolean;
  addedAt: string;
  cover: string;
}
export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: Array<{ id: string; text: string }>;
  answer?: string | string[] | number | boolean;
  tolerance?: number;
  hint?: string;
  explanation?: string;
  points: number;
  required: boolean;
  minimumWords?: number;
  minimumSentences?: number;
  keywords?: string[];
  minimumKeywords?: number;
}
export interface Activity {
  id: string;
  type: ActivityType;
  title?: string;
  content: string;
  questions: Question[];
  passingScore?: number;
  required: boolean;
  randomize?: boolean;
  questionPoolSize?: number;
}
export interface Lesson {
  id: string;
  title: string;
  description?: string;
  sourcePath: string;
  activities: Activity[];
}
export interface Chapter {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}
export interface ParsedCourse {
  mcf: "1.0";
  id: string;
  title: string;
  language: string;
  description?: string;
  authors: string[];
  license?: string;
  version: string;
  cover?: string;
  chapters: Chapter[];
}
export interface ValidationIssue {
  file: string;
  message: string;
  severity: "error" | "warning";
}
export interface CourseProgress {
  courseId: string;
  currentLessonId?: string;
  completedNotes: string[];
  completedPractices?: string[];
  completedLessons: string[];
  responses: Record<string, unknown>;
  assessments: Record<string, { score: number; passed: boolean; attemptedAt: string }>;
  updatedAt: string;
}
