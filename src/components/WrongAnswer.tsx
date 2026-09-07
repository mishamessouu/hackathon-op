type WrongAnswerProps = {
  message: string
}

// The clue card and answer field stay live underneath, so this is feedback
// only - it needs no button of its own to move the round on.
export function WrongAnswer({ message }: WrongAnswerProps) {
  return (
    <section className="wrong-answer wrong-answer--inline" aria-live="polite">
      <span className="wrong-answer__icon" aria-hidden="true">
        ❌
      </span>
      <p>{message}</p>
    </section>
  )
}
