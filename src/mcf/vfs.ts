import type { VirtualFile } from "../types";

const decoder = new TextDecoder();

export function normalizePath(input: string): string {
  if (
    !input ||
    input.includes("\0") ||
    input.includes("\\") ||
    input.startsWith("/") ||
    /^[A-Za-z]:/.test(input)
  )
    throw new Error(`Unsafe path: ${input}`);
  const parts: string[] = [];
  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) throw new Error(`Path escapes course root: ${input}`);
      parts.pop();
    } else parts.push(part);
  }
  if (!parts.length) throw new Error(`Unsafe path: ${input}`);
  return parts.join("/");
}

export function dirname(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}
export function joinPath(base: string, reference: string): string {
  return normalizePath(base ? `${base}/${reference}` : reference);
}

export class VirtualCourseFiles {
  readonly files: Map<string, VirtualFile>;
  constructor(files: VirtualFile[]) {
    this.files = new Map();
    for (const file of files) {
      const path = normalizePath(file.path);
      if (this.files.has(path)) throw new Error(`Duplicate file path: ${path}`);
      this.files.set(path, { ...file, path });
    }
  }
  has(path: string) {
    try {
      return this.files.has(normalizePath(path));
    } catch {
      return false;
    }
  }
  bytes(path: string) {
    const file = this.files.get(normalizePath(path));
    if (!file) throw new Error(`Missing file: ${path}`);
    return file.data;
  }
  text(path: string) {
    return decoder.decode(this.bytes(path));
  }
  list() {
    return [...this.files.values()];
  }
}
