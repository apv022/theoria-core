import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../content/courses/", import.meta.url);
const output = new URL("../public/bundled/", import.meta.url);
const textExtensions = new Set([".md", ".yaml", ".yml", ".txt", ".svg", ".json"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
}

await mkdir(output, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join(root.pathname, entry.name);
  const files = await Promise.all(
    (await walk(directory)).sort().map(async (file) => {
      const bytes = await readFile(file);
      const textual = textExtensions.has(extname(file).toLowerCase());
      return {
        path: relative(directory, file).split("\\").join("/"),
        encoding: textual ? "utf8" : "base64",
        data: textual ? bytes.toString("utf8") : bytes.toString("base64"),
      };
    }),
  );
  await writeFile(new URL(`${entry.name}.json`, output), JSON.stringify({ id: entry.name, files }));
}
