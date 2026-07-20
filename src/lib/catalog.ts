import type { CatalogCourse, CourseSource } from "../types";

export const catalog: CatalogCourse[] = [
  {
    id: "calculus-i",
    title: "Calculus I: Change and Accumulation",
    description: "Functions, limits, derivatives, integrals, and their applications.",
    author: "MCF Project",
    subject: "Mathematics",
    difficulty: "Intermediate",
    featured: true,
    addedAt: "2026-07-15",
    cover: "assets/images/cover.svg",
  },
  {
    id: "ancient-egypt",
    title: "Ancient Egypt: River, Kingdom, Memory",
    description: "People, beliefs, institutions, and the long afterlife of ancient Egypt.",
    author: "Theoria Learning Studio",
    subject: "History",
    difficulty: "Beginner",
    featured: true,
    addedAt: "2026-07-19",
    cover: "assets/images/cover.svg",
  },
  {
    id: "edgar-allan-poe",
    title: "Edgar Allan Poe: Sound, Shadow, and Story",
    description: "Poe’s life, poetic techniques, Gothic fiction, and detective stories.",
    author: "Theoria Learning Studio",
    subject: "Literature",
    difficulty: "Intermediate",
    featured: false,
    addedAt: "2026-07-19",
    cover: "assets/images/cover.svg",
  },
  {
    id: "history-of-computer-science",
    title: "A Brief History of Computer Science",
    description:
      "Algorithms, early machines, networks, languages, and computing’s social questions.",
    author: "Theoria Learning Studio",
    subject: "Computer Science",
    difficulty: "Beginner",
    featured: true,
    addedAt: "2026-07-19",
    cover: "assets/images/cover.svg",
  },
  {
    id: "basic-arithmetic",
    title: "Basic Arithmetic: Number Sense and Operations",
    description: "Place value, the four operations, and everyday problem solving.",
    author: "Theoria Learning Studio",
    subject: "Mathematics",
    difficulty: "Beginner",
    featured: false,
    addedAt: "2026-07-19",
    cover: "assets/images/cover.svg",
  },
];

type SerializedBundle = {
  files: Array<{ path: string; encoding: "utf8" | "base64"; data: string }>;
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function loadBundledSource(id: string): Promise<CourseSource> {
  const response = await fetch(`${import.meta.env.BASE_URL}bundled/${encodeURIComponent(id)}.json`);
  if (!response.ok) throw new Error(`Bundled course ${id} could not be loaded.`);
  const bundle = (await response.json()) as SerializedBundle;
  const meta = catalog.find((course) => course.id === id);
  if (!meta) throw new Error(`Unknown bundled course ${id}.`);
  return {
    id,
    title: meta.title,
    origin: "bundled",
    updatedAt: meta.addedAt,
    files: bundle.files.map((file) => ({
      path: file.path,
      data:
        file.encoding === "utf8" ? new TextEncoder().encode(file.data) : decodeBase64(file.data),
    })),
  };
}
