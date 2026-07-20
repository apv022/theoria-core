import { describe, expect, it } from "vitest";
import { generateSource, initialDraft, newQuestion } from "../src/authoring/model";
import { compileCourse } from "../src/mcf/compiler";
import { parseCourseFiles } from "../src/mcf/parser";
import { VirtualCourseFiles } from "../src/mcf/vfs";
import type { QuestionType } from "../src/types";
import { withoutDuplicateLessonHeading } from "../src/mcf/render";

describe("authoring and compilation", () => {
  it("generates valid source containing all six question types", () => {
    const draft = initialDraft();
    const types: QuestionType[] = [
      "multiple_choice",
      "multiple_select",
      "true_false",
      "numeric",
      "short_answer",
      "essay",
    ];
    const questions = types.reduce<ReturnType<typeof newQuestion>[]>((items, type) => {
      items.push(
        newQuestion(
          type,
          items.map((item) => item.id),
        ),
      );
      return items;
    }, []);
    draft.chapters[0]!.lessons[0]!.activities.push({
      id: "knowledge-check",
      type: "assessment",
      title: "Assessment",
      content: "",
      passingScore: 0.7,
      questions,
    });
    const result = parseCourseFiles(new VirtualCourseFiles(generateSource(draft).files));
    expect(result.issues).toEqual([]);
    expect(result.course?.chapters[0]?.lessons[0]?.activities[1]?.questions).toHaveLength(6);
  });
  it("creates a safe multi-file Theoria output", () => {
    const draft = initialDraft();
    draft.chapters[0]!.lessons[0]!.activities[0]!.content = "<script>alert(1)</script>";
    const result = compileCourse(generateSource(draft));
    const html = new TextDecoder().decode(
      result.files?.find((file) => file.path === "index.html")?.data,
    );
    expect(result.course).toBeDefined();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(result.files?.map((file) => file.path)).toEqual(
      expect.arrayContaining(["index.html", "course.json", "styles.css", "player.js"]),
    );
    const player = new TextDecoder().decode(
      result.files?.find((file) => file.path === "player.js")?.data,
    );
    expect(player).toContain("multiple_select");
    expect(player).toContain("assessment-submit");
  });
  it("removes only a repeated structured lesson heading", () => {
    expect(withoutDuplicateLessonHeading("# Welcome\n\nBody", "Welcome")).toBe("Body");
    expect(withoutDuplicateLessonHeading("# Different\n\nBody", "Welcome")).toContain(
      "# Different",
    );
  });
  it("preserves local image bytes and portable paths in compiled output", () => {
    const draft = initialDraft();
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    draft.media.push({ path: "assets/lesson image.png", data: bytes, type: "image/png" });
    draft.chapters[0]!.lessons[0]!.activities[0]!.content =
      "# Welcome\n\n![Diagram](../../../assets/lesson image.png)";
    const result = compileCourse(generateSource(draft));
    const asset = result.files?.find((file) => file.path === "assets/lesson image.png");
    const html = new TextDecoder().decode(
      result.files?.find((file) => file.path === "index.html")?.data,
    );
    expect(asset?.data).toEqual(bytes);
    expect(html).toContain("assets/lesson image.png");
    expect(html).not.toMatch(/blob:|localhost/);
    expect(html.match(/<h2>Welcome<\/h2>/g)).toHaveLength(1);
  });
});
