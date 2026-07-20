import { describe, expect, it } from "vitest";
import { completion, evaluateQuestion } from "../src/mcf/grading";
import type { Question, QuestionType } from "../src/types";

const question = (type: QuestionType, answer?: Question["answer"]): Question => ({
  id: `q-${type}`,
  type,
  prompt: "Prompt",
  answer,
  points: 1,
  required: true,
});
describe("all MCF question types", () => {
  it("grades objective responses", () => {
    expect(evaluateQuestion(question("multiple_choice", "a"), "a")).toBe(true);
    expect(evaluateQuestion(question("multiple_select", ["a", "b"]), ["b", "a"])).toBe(true);
    expect(evaluateQuestion(question("true_false", true), "true")).toBe(true);
    expect(evaluateQuestion({ ...question("numeric", 10), tolerance: 0.1 }, "10.05")).toBe(true);
    expect(evaluateQuestion(question("short_answer", "Paris"), " paris ")).toBe(true);
  });
  it("completion-checks essays without grading them", () => {
    const essay = { ...question("essay"), minimumWords: 4, minimumSentences: 1 };
    expect(completion(essay, "Three words only", false).complete).toBe(false);
    expect(completion(essay, "These are four words.", false)).toMatchObject({
      complete: true,
      correct: null,
    });
  });
});
