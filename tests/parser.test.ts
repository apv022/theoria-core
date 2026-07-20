import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCourseFiles } from "../src/mcf/parser";
import { VirtualCourseFiles } from "../src/mcf/vfs";

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
      ),
    )
  ).flat();
}

describe("browser MCF parser", () => {
  for (const id of [
    "calculus-i",
    "ancient-egypt",
    "edgar-allan-poe",
    "history-of-computer-science",
    "basic-arithmetic",
  ]) {
    it(`validates bundled ${id}`, async () => {
      const root = join(process.cwd(), "content/courses", id);
      const files = await Promise.all(
        (await walk(root)).map(async (path) => ({
          path: relative(root, path),
          data: new Uint8Array(await readFile(path)),
        })),
      );
      const result = parseCourseFiles(new VirtualCourseFiles(files));
      expect(result.issues).toEqual([]);
      expect(result.course?.id).toBe(id);
      expect(result.course?.chapters.length).toBeGreaterThan(0);
    });
  }
  it("rejects duplicate IDs and traversal", () => {
    expect(
      () => new VirtualCourseFiles([{ path: "../manifest.yaml", data: new Uint8Array() }]),
    ).toThrow(/escapes|Unsafe/);
    expect(
      () =>
        new VirtualCourseFiles([
          { path: "manifest.yaml", data: new Uint8Array() },
          { path: "manifest.yaml", data: new Uint8Array() },
        ]),
    ).toThrow(/Duplicate/);
  });
});
