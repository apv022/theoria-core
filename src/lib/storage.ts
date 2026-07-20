import { openDB, type DBSchema } from "idb";
import type { CourseProgress, CourseSource } from "../types";

interface TheoriaDatabase extends DBSchema {
  courses: { key: string; value: CourseSource };
  progress: { key: string; value: CourseProgress };
  artifacts: {
    key: string;
    value: { id: string; courseId: string; blob: Blob; createdAt: string };
  };
  settings: { key: string; value: { key: string; value: unknown } };
}

const database = () =>
  openDB<TheoriaDatabase>("theoria-core", 1, {
    upgrade(db) {
      db.createObjectStore("courses", { keyPath: "id" });
      db.createObjectStore("progress", { keyPath: "courseId" });
      db.createObjectStore("artifacts", { keyPath: "id" });
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });

export const localCourses = {
  list: async () => (await database()).getAll("courses"),
  get: async (id: string) => (await database()).get("courses", id),
  put: async (course: CourseSource) => (await database()).put("courses", course),
  delete: async (id: string) => {
    const db = await database();
    const transaction = db.transaction(["courses", "progress"], "readwrite");
    await transaction.objectStore("courses").delete(id);
    await transaction.objectStore("progress").delete(id);
    await transaction.done;
  },
};

export const progressStore = {
  get: async (courseId: string) => (await database()).get("progress", courseId),
  put: async (progress: CourseProgress) => (await database()).put("progress", progress),
  reset: async (courseId: string) => (await database()).delete("progress", courseId),
};

export const settingsStore = {
  get: async <T>(key: string) =>
    (await database()).get("settings", key).then((item) => item?.value as T | undefined),
  put: async (key: string, value: unknown) => (await database()).put("settings", { key, value }),
};

export async function storageUsage() {
  if (!navigator.storage?.estimate) return { usage: undefined, quota: undefined };
  return navigator.storage.estimate();
}
