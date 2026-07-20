import { describe, expect, it } from "vitest";
import { generateSource, initialDraft, newQuestion } from "../src/authoring/model";
import { compileCourse } from "../src/mcf/compiler";
import { parseCourseFiles } from "../src/mcf/parser";
import { VirtualCourseFiles } from "../src/mcf/vfs";
import type { QuestionType } from "../src/types";

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
});
