import { useState } from "react";
import type { Question } from "../types";
import { completion } from "../mcf/grading";

export function QuestionView({
  question,
  response,
  onChange,
  assessment,
  render,
}: {
  question: Question;
  response: unknown;
  onChange: (value: unknown) => void;
  assessment: boolean;
  render: (source: string) => string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const input =
    question.type === "multiple_choice" || question.type === "true_false" ? (
      (question.type === "true_false"
        ? [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ]
        : (question.options ?? [])
      ).map((option) => (
        <label className="option" key={option.id}>
          <input
            type="radio"
            name={question.id}
            value={option.id}
            checked={response === option.id}
            onChange={(event) => onChange(event.target.value)}
          />
          <span dangerouslySetInnerHTML={{ __html: render(option.text) }} />
        </label>
      ))
    ) : question.type === "multiple_select" ? (
      (question.options ?? []).map((option) => {
        const selected = Array.isArray(response) ? (response as string[]) : [];
        return (
          <label className="option" key={option.id}>
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            <span dangerouslySetInnerHTML={{ __html: render(option.text) }} />
          </label>
        );
      })
    ) : question.type === "essay" ? (
      <textarea
        rows={7}
        value={String(response ?? "")}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Essay response"
      />
    ) : (
      <input
        type={question.type === "numeric" ? "number" : "text"}
        step={question.type === "numeric" ? "any" : undefined}
        value={String(response ?? "")}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Response"
      />
    );
  return (
    <div className="question">
      <div className="rich" dangerouslySetInnerHTML={{ __html: render(question.prompt) }} />
      <div className="responses">{input}</div>
      <div className="question-actions">
        {question.hint ? (
          <button className="text-button" onClick={() => setHint(!hint)} type="button">
            {hint ? "Hide hint" : "Show hint"}
          </button>
        ) : null}
        {!assessment ? (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              const result = completion(question, response, true);
              setFeedback(
                result.feedback[0] ??
                  (result.correct === null
                    ? "Completion requirements met."
                    : result.correct
                      ? "Correct — nicely done."
                      : "Not quite. Try again."),
              );
            }}
          >
            Check {question.type === "essay" ? "completion" : "answer"}
          </button>
        ) : null}
      </div>
      {hint ? (
        <div
          className="feedback"
          dangerouslySetInnerHTML={{ __html: render(question.hint ?? "") }}
        />
      ) : null}
      {feedback ? (
        <p className="feedback" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
