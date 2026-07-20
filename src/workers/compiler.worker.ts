/// <reference lib="webworker" />
import { compileCourse } from "../mcf/compiler";
import type { CourseSource } from "../types";

self.onmessage = (event: MessageEvent<{ id: string; source: CourseSource }>) => {
  try {
    self.postMessage({ id: event.data.id, result: compileCourse(event.data.source) });
  } catch (error) {
    self.postMessage({ id: event.data.id, error: (error as Error).message });
  }
};
