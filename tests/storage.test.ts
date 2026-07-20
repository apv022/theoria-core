import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { DB_NAME, DB_VERSION, localCourses, progressStore } from "../src/lib/storage";

describe("local persistence", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  it("upgrades populated version-one courses and progress without recreating stores", async () => {
    const old = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore("courses", { keyPath: "id" });
        db.createObjectStore("progress", { keyPath: "courseId" });
        db.createObjectStore("artifacts", { keyPath: "id" });
        db.createObjectStore("settings", { keyPath: "key" });
      },
    });
    await old.put("courses", {
      id: "old",
      title: "Old course",
      origin: "imported",
      files: [],
      updatedAt: "2026-01-01",
    });
    await old.put("progress", {
      courseId: "old",
      completedNotes: [],
      completedLessons: [],
      responses: {},
      assessments: {},
      updatedAt: "2026-01-01",
    });
    old.close();
    expect((await localCourses.get("old"))?.title).toBe("Old course");
    const current = await openDB(DB_NAME, DB_VERSION);
    expect([...current.objectStoreNames]).toEqual([
      "artifacts",
      "compilations",
      "courses",
      "enrollments",
      "progress",
      "settings",
    ]);
    current.close();
  });
  it("stores courses and learner progress in IndexedDB", async () => {
    await localCourses.put({
      id: "local",
      title: "Local",
      origin: "authored",
      files: [],
      updatedAt: new Date().toISOString(),
    });
    await progressStore.put({
      courseId: "local",
      currentLessonId: "one",
      completedNotes: [],
      completedLessons: [],
      responses: {},
      assessments: {},
      updatedAt: new Date().toISOString(),
    });
    expect((await localCourses.get("local"))?.title).toBe("Local");
    expect((await progressStore.get("local"))?.currentLessonId).toBe("one");
  });
});
