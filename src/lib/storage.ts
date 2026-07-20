import { openDB, type DBSchema } from "idb";
import type { CompilationRecord, CourseProgress, CourseSource, Enrollment } from "../types";

interface TheoriaDatabase extends DBSchema {
  courses: { key: string; value: CourseSource };
  progress: { key: string; value: CourseProgress };
  artifacts: {
    key: string;
    value: { id: string; courseId: string; blob: Blob; createdAt: string };
  };
  settings: { key: string; value: { key: string; value: unknown } };
  enrollments: { key: string; value: Enrollment };
  compilations: { key: string; value: CompilationRecord };
}

export const DB_NAME = "theoria-core";
export const DB_VERSION = 3;

function diagnostic(step: string, detail: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    const method = /failed|blocked/.test(step) ? console.error : console.info;
    method("[Theoria storage]", {
      database: DB_NAME,
      targetVersion: DB_VERSION,
      step,
      ...detail,
    });
  }
}

const database = () =>
  openDB<TheoriaDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      diagnostic("upgrade", { existingVersion: oldVersion, requestedVersion: newVersion });
      transaction.onerror = () =>
        diagnostic("upgrade transaction failed", {
          existingVersion: oldVersion,
          error: transaction.error?.name,
          message: transaction.error?.message,
        });
      // v0 → v1: the original released stores.
      if (oldVersion < 1) {
        diagnostic("migration 0→1");
        db.createObjectStore("courses", { keyPath: "id" });
        db.createObjectStore("progress", { keyPath: "courseId" });
        db.createObjectStore("artifacts", { keyPath: "id" });
        db.createObjectStore("settings", { keyPath: "key" });
      }
      // v1 → v2: local learning and compiler history. Keep this separate so existing v1 data survives.
      if (oldVersion < 2) {
        diagnostic("migration 1→2");
        if (!db.objectStoreNames.contains("enrollments"))
          db.createObjectStore("enrollments", { keyPath: "courseId" });
        if (!db.objectStoreNames.contains("compilations"))
          db.createObjectStore("compilations", { keyPath: "courseId" });
      }
      // v2 → v3: schema marker only; v2 was released with no new store requirements.
      if (oldVersion < 3) diagnostic("migration 2→3");
    },
    blocked(currentVersion, blockedVersion) {
      diagnostic("upgrade blocked", {
        existingVersion: currentVersion,
        requestedVersion: blockedVersion,
        message: "Close or reload other Theoria tabs, then retry.",
      });
      window.dispatchEvent(new CustomEvent("theoria-storage-blocked"));
    },
    blocking(currentVersion, blockedVersion, event) {
      diagnostic("stale connection closed", {
        existingVersion: currentVersion,
        requestedVersion: blockedVersion,
      });
      (event.target as IDBDatabase | null)?.close();
    },
    terminated() {
      diagnostic("connection terminated");
    },
  }).catch((error: DOMException) => {
    diagnostic("open failed", { error: error.name, message: error.message });
    throw new Error(`Browser storage could not be opened: ${error.message}`);
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

export const enrollmentStore = {
  list: async () => (await database()).getAll("enrollments"),
  get: async (id: string) => (await database()).get("enrollments", id),
  start: async (item: Enrollment) => (await database()).put("enrollments", item),
};
export const compilationStore = {
  list: async () => (await database()).getAll("compilations"),
  put: async (item: CompilationRecord) => (await database()).put("compilations", item),
  delete: async (id: string) => (await database()).delete("compilations", id),
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
