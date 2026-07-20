import { copyFile, access } from "node:fs/promises";

await access(new URL("../dist/index.html", import.meta.url));
await copyFile(
  new URL("../dist/index.html", import.meta.url),
  new URL("../dist/404.html", import.meta.url),
);
