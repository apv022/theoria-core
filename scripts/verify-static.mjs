import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../dist/", import.meta.url);
for (const file of ["index.html", "404.html", "manifest.webmanifest", "sw.js", "_redirects"])
  await access(new URL(file, root));

const [index, fallback, manifest] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("404.html", root), "utf8"),
  readFile(new URL("manifest.webmanifest", root), "utf8").then(JSON.parse),
]);
if (index !== fallback) throw new Error("GitHub Pages fallback does not match index.html.");
if (manifest.display !== "standalone" || !manifest.icons?.length)
  throw new Error("PWA manifest is incomplete.");

const bundles = (await readdir(new URL("bundled/", root))).filter((file) => file.endsWith(".json"));
if (bundles.length !== 5)
  throw new Error(`Expected five bundled courses; found ${bundles.length}.`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
for (const file of await walk(root.pathname)) {
  if (!/\.(?:html|js|css|json|webmanifest)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  if (/DATABASE_URL|BETTER_AUTH_SECRET|\/api\/auth/.test(content))
    throw new Error(`Server-only configuration leaked into ${file}.`);
}

console.log(
  "Static export verified: SPA fallback, PWA, five course bundles, and no server secrets.",
);
