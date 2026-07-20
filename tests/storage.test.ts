import { beforeEach, describe, expect, it } from "vitest";
import { localCourses, progressStore } from "../src/lib/storage";

describe("local persistence", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("theoria-core");
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
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
