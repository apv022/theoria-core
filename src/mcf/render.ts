import DOMPurify from "dompurify";
import katex from "katex";
import { marked } from "marked";
import type { Lesson } from "../types";
import { dirname, joinPath, VirtualCourseFiles } from "./vfs";

export class AssetUrls {
  private urls = new Map<string, string>();
  constructor(private vfs: VirtualCourseFiles) {}
  resolve(reference: string, lesson: Lesson) {
    if (/^(https?:|mailto:|#)/i.test(reference)) return reference;
    try {
      const path = joinPath(dirname(lesson.sourcePath), reference);
      const existing = this.urls.get(path);
      if (existing) return existing;
      const file = this.vfs.files.get(path);
      if (!file) return "#";
      const url = URL.createObjectURL(new Blob([file.data as BlobPart], { type: file.type }));
      this.urls.set(path, url);
      return url;
    } catch {
      return "#";
    }
  }
  revoke() {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}

export function withoutDuplicateLessonHeading(source: string, lessonTitle: string) {
  const lines = source.replace(/^\s+/, "").split("\n");
  const heading = lines[0]?.match(/^#\s+(.+?)\s*#?\s*$/)?.[1];
  return heading?.localeCompare(lessonTitle, undefined, { sensitivity: "base" }) === 0
    ? lines.slice(1).join("\n").replace(/^\s+/, "")
    : source;
}

function youtubeId(source: string) {
  if (/^youtube:[A-Za-z0-9_-]+$/.test(source)) return source.slice(8);
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host))
      return (
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)/)?.[1]
      );
  } catch {
    return undefined;
  }
}

export function richHtml(source: string, lesson: Lesson, assets: AssetUrls) {
  const expressions: Array<{ value: string; display: boolean }> = [];
  const token = "THEORIAMATH";
  let input = withoutDuplicateLessonHeading(source, lesson.title)
    .replace(
      /\$\$([\s\S]*?)\$\$/g,
      (_match, value: string) =>
        `${token}${expressions.push({ value: value.trim(), display: true }) - 1}END`,
    )
    .replace(
      /(?<!\\)\$([^\n$]+)\$/g,
      (_match, value: string) => `${token}${expressions.push({ value, display: false }) - 1}END`,
    );
  input = input.replace(
    /@\[(audio|video)\]\((\S+)(?:\s+"([^"]*)")?\)/g,
    (_all, kind: string, reference: string, label: string) => {
      const videoId = kind === "video" ? youtubeId(reference) : undefined;
      if (videoId)
        return `<div class="remote-media"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${label || "Remote video"}" loading="lazy" allowfullscreen></iframe><small>Remote media — internet required.</small></div>`;
      return `<figure><${kind} controls preload="metadata" src="${assets.resolve(reference, lesson)}"></${kind}>${label ? `<figcaption>${label}</figcaption>` : ""}</figure>`;
    },
  );
  input = input.replace(
    /(!\[[^\]]*\]\()(.+?)(\s+(?:"[^"]*"|'[^']*'))?\)/g,
    (_all, open: string, reference: string, title: string | undefined) =>
      `${open}${assets.resolve(reference.trim(), lesson)}${title ?? ""})`,
  );
  const rendered = (marked.parse(input, { async: false }) as string).replace(
    new RegExp(`${token}(\\d+)END`, "g"),
    (_match, index: string) => {
      const item = expressions[Number(index)];
      return item
        ? katex.renderToString(item.value, { displayMode: item.display, throwOnError: false })
        : "";
    },
  );
  return DOMPurify.sanitize(rendered, {
    ADD_TAGS: ["iframe", "audio", "video", "source", "figure", "figcaption", "small"],
    ADD_ATTR: [
      "allowfullscreen",
      "controls",
      "preload",
      "loading",
      "referrerpolicy",
      "target",
      "rel",
      "class",
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|#|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
  });
}
