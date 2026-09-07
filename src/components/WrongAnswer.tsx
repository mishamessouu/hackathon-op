import type { GuessComparison } from '../types/game'

type WrongAnswerProps = {
  message: string
  comparison?: GuessComparison | null
  /** A skip is not a wrong answer, so it gets its own mark. */
  icon?: string
}

// The clue card and answer field stay live underneath, so this is feedback
// only - it needs no button of its own to move the round on.
export function WrongAnswer({ message, comparison, icon = '❌' }: WrongAnswerProps) {
  return (
    <section className="wrong-answer wrong-answer--inline" aria-live="polite">
      <span className="wrong-answer__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="wrong-answer__body">
        <p>{message}</p>
        {comparison ? (
          <p className="guess-compare">
            {/* The clue has already advanced by the time this renders, so it
                has to name the clue it is actually talking about. */}
            <span className="guess-compare__category">{comparison.category}</span>
            <span className="guess-compare__name">{comparison.name}</span>
            <span className="guess-compare__value">{comparison.value}</span>
            {comparison.matches ? (
              <span className="guess-compare__same">— same, but not the country</span>
            ) : (
              <>
                <span className="guess-compare__sep" aria-hidden="true">
                  →
                </span>
                <span className="guess-compare__label">you need</span>
                <span className="guess-compare__target">{comparison.target}</span>
              </>
            )}
          </p>
        ) : null}
      </div>
    </section>
  )
}
