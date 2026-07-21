import { describe, expect, it } from "vitest";
import { generateSource, initialDraft, newQuestion, uniqueId } from "../src/authoring/model";
import { compileCourse } from "../src/mcf/compiler";
import { parseCourseFiles } from "../src/mcf/parser";
import { VirtualCourseFiles } from "../src/mcf/vfs";
import type { QuestionType } from "../src/types";

describe("authoring and compilation", () => {
  it("resolves rapid, same-title ID collisions deterministically", () => {
    const ids: string[] = [];
    for (let index = 0; index < 5; index++) ids.push(uniqueId("New lesson", ids));
    expect(ids).toEqual([
      "new-lesson",
      "new-lesson-2",
      "new-lesson-3",
      "new-lesson-4",
      "new-lesson-5",
    ]);
    expect(uniqueId("My course", ["my-course"])).toBe("my-course-2");
  });
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
  it("faithfully preserves authored titles and repeated headings", () => {
    const draft = initialDraft();
    const activity = draft.chapters[0]!.lessons[0]!.activities[0]!;
    activity.title = "Learn";
    activity.content = "# Welcome\n\n## Details\n\n# Welcome";
    const result = compileCourse(generateSource(draft));
    const html = new TextDecoder().decode(
      result.files?.find((file) => file.path === "index.html")?.data,
    );
    expect(html).toContain("<h3>Learn</h3>");
    expect(html.match(/<h1>Welcome<\/h1>/g)).toHaveLength(2);
    expect(html).toContain("<h2>Details</h2>");
  });
  it("does not invent an activity title when none was authored", () => {
    const draft = initialDraft();
    draft.chapters[0]!.lessons[0]!.activities[0]!.title = "";
    const html = new TextDecoder().decode(
      compileCourse(generateSource(draft)).files?.find((file) => file.path === "index.html")?.data,
    );
    expect(html).not.toContain("<h3>notes</h3>");
  });
  it("preserves practice and assessment titles", () => {
    const draft = initialDraft();
    const lesson = draft.chapters[0]!.lessons[0]!;
    lesson.activities.push(
      { id: "try", type: "practice", title: "Try this", content: "Practice prompt", questions: [] },
      {
        id: "check",
        type: "assessment",
        title: "Final check",
        content: "Assessment prompt",
        questions: [],
      },
    );
    const html = new TextDecoder().decode(
      compileCourse(generateSource(draft)).files?.find((file) => file.path === "index.html")?.data,
    );
    expect(html).toContain("<h3>Try this</h3>");
    expect(html).toContain("<h3>Final check</h3>");
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
    expect(html).toContain("<h1>Welcome</h1>");
    const css = new TextDecoder().decode(
      result.files?.find((file) => file.path === "styles.css")?.data,
    );
    expect(css).toContain("max-width:100%");
  });
});
