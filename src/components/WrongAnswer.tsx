type WrongAnswerProps = {
  message: string
  onContinue: () => void
  isContinuing: boolean
}

export function WrongAnswer({ message, onContinue, isContinuing }: WrongAnswerProps) {
  return (
    <section className="wrong-answer" aria-live="polite">
      <div className="wrong-answer__icon">❌</div>
      <h2>Not quite.</h2>
      <p>{message}</p>
      <button type="button" className="secondary-button" onClick={onContinue} disabled={isContinuing}>
        {isContinuing ? 'Reviewing clues...' : 'Continue investigation'}
      </button>
    </section>
  )
}
