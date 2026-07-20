export function CompletionStatus({ complete }: { complete: boolean }) {
  return complete ? <span className="completion-status">Complete ✓</span> : null;
}
