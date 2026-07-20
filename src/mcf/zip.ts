import {
  BlobReader,
  BlobWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js";
import type { VirtualFile } from "../types";
import { normalizePath } from "./vfs";

export const ZIP_LIMITS = {
  compressed: 50 * 1024 * 1024,
  entries: 250,
  file: 20 * 1024 * 1024,
  expanded: 200 * 1024 * 1024,
} as const;
const allowed = new Set([
  "yaml",
  "yml",
  "mcf",
  "md",
  "txt",
  "json",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "mp3",
  "ogg",
  "wav",
  "m4a",
  "mp4",
  "webm",
  "vtt",
]);

export async function importZip(file: File): Promise<VirtualFile[]> {
  if (file.size > ZIP_LIMITS.compressed) throw new Error("ZIP exceeds the 50 MB compressed limit.");
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    const regular = entries.filter((entry) => !entry.directory);
    if (regular.length > ZIP_LIMITS.entries) throw new Error("ZIP contains more than 250 files.");
    let expanded = 0;
    for (const entry of regular) {
      expanded += entry.uncompressedSize;
      if (entry.uncompressedSize > ZIP_LIMITS.file)
        throw new Error(`${entry.filename} exceeds the 20 MB per-file limit.`);
      if (expanded > ZIP_LIMITS.expanded) throw new Error("ZIP exceeds the 200 MB expanded limit.");
      const unixType = (entry.unixMode ?? 0) & 0o170000;
      if (entry.executable || (unixType !== 0 && unixType !== 0o100000))
        throw new Error(`${entry.filename} is executable, linked, or a special file.`);
    }
    const names = regular.map((entry) => normalizePath(entry.filename));
    const first = names[0]?.split("/")[0];
    const stripRoot = Boolean(first && names.every((name) => name.startsWith(`${first}/`)));
    const files: VirtualFile[] = [];
    for (let index = 0; index < regular.length; index++) {
      const entry = regular[index]!;
      const original = names[index]!;
      const path = stripRoot ? original.slice(original.indexOf("/") + 1) : original;
      const extension = path.split(".").pop()?.toLowerCase() ?? "";
      if (!allowed.has(extension)) throw new Error(`${path} uses an unsupported file type.`);
      if (!entry.getData) throw new Error(`${path} cannot be extracted.`);
      files.push({ path: normalizePath(path), data: await entry.getData(new Uint8ArrayWriter()) });
    }
    return files;
  } finally {
    await reader.close();
  }
}

export async function exportZip(files: VirtualFile[]): Promise<Blob> {
  const writer = new BlobWriter("application/zip");
  const zip = new ZipWriter(writer);
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path)))
    await zip.add(normalizePath(file.path), new Uint8ArrayReader(file.data));
  await zip.close();
  return writer.getData();
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function filesFromSelection(files: FileList | File[]) {
  const list = [...files];
  if (list.length === 1 && list[0]!.name.toLowerCase().endsWith(".zip")) return importZip(list[0]!);
  const paths = list.map(
    (file) => (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  );
  const first = paths[0]?.split("/")[0];
  const strip = Boolean(first && paths.every((path) => path.startsWith(`${first}/`)));
  if (list.length > ZIP_LIMITS.entries) throw new Error("Selection contains more than 250 files.");
  let total = 0;
  return Promise.all(
    list.map(async (file, index) => {
      total += file.size;
      if (file.size > ZIP_LIMITS.file || total > ZIP_LIMITS.expanded)
        throw new Error("Selection exceeds import size limits.");
      const original = paths[index]!;
      const path = strip ? original.slice(original.indexOf("/") + 1) : original;
      return {
        path: normalizePath(path),
        data: new Uint8Array(await file.arrayBuffer()),
        type: file.type,
      };
    }),
  );
}
