import type { Question } from "../types";

export function hasResponse(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : String(value ?? "").trim().length > 0;
}
export function countWords(response: string) {
  const value = response.trim();
  return value ? value.split(/\s+/u).length : 0;
}
export function countSentences(response: string) {
  const value = response.trim();
  if (!value) return 0;
  const terminal = value.match(/[^.!?]+[.!?]+/gu)?.filter((part) => part.trim()).length ?? 0;
  return terminal + (value.replace(/[^.!?]+[.!?]+/gu, "").trim() ? 1 : 0);
}
function keywordMatches(response: string, keywords: string[]) {
  const value = response.toLocaleLowerCase().replace(/\s+/gu, " ").trim();
  return new Set(
    keywords.filter((keyword) => {
      const needle = keyword.toLocaleLowerCase().trim();
      return needle && value.includes(needle);
    }),
  ).size;
}

export function evaluateQuestion(question: Question, response: unknown): boolean | null {
  switch (question.type) {
    case "multiple_select":
      return (
        JSON.stringify([...(response as string[])].sort()) ===
        JSON.stringify([...(question.answer as string[])].sort())
      );
    case "true_false":
      return (response === "true") === question.answer;
    case "numeric":
      return (
        hasResponse(response) &&
        Number.isFinite(Number(response)) &&
        Math.abs(Number(response) - Number(question.answer)) <= (question.tolerance ?? 0)
      );
    case "short_answer":
      return (
        String(response).trim().toLocaleLowerCase() ===
        String(question.answer).trim().toLocaleLowerCase()
      );
    case "essay":
      return null;
    default:
      return response === question.answer;
  }
}

export function completion(question: Question, response: unknown, requireCorrect: boolean) {
  if (question.type === "essay") {
    const value = String(response ?? "");
    const words = countWords(value);
    const sentences = countSentences(value);
    const matches = keywordMatches(value, question.keywords ?? []);
    const feedback: string[] = [];
    if (question.minimumWords && words < question.minimumWords)
      feedback.push(`Write at least ${question.minimumWords} words. Current: ${words}.`);
    if (question.minimumSentences && sentences < question.minimumSentences)
      feedback.push(
        `Write at least ${question.minimumSentences} sentences. Current: ${sentences}.`,
      );
    const needed = question.keywords?.length
      ? (question.minimumKeywords ?? question.keywords.length)
      : 0;
    if (matches < needed)
      feedback.push(`Mention at least ${needed} required concepts. Current: ${matches}.`);
    if (!question.minimumWords && !question.minimumSentences && !needed && !value.trim())
      feedback.push("Write a response before continuing.");
    return { complete: feedback.length === 0, correct: null, feedback };
  }
  if (!hasResponse(response))
    return { complete: false, correct: null, feedback: ["Add a response first."] };
  const correct = evaluateQuestion(question, response);
  return { complete: requireCorrect ? correct === true : true, correct, feedback: [] };
}
