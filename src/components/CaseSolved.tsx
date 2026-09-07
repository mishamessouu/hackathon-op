type CaseSolvedProps = {
  score: number
  roundScore: number
  /** The clue's own value, before speed. Absent on a pre-timer round. */
  baseScore?: number
  timeBonus?: number
  cluesUsed: number
  countryName: string
  countryFlag: string
  onNewInvestigation: () => void
  error?: string
}

export function CaseSolved({
  score,
  roundScore,
  baseScore,
  timeBonus,
  cluesUsed,
  countryName,
  countryFlag,
  onNewInvestigation,
  error,
}: CaseSolvedProps) {
  return (
    <section className="case-solved" aria-live="polite">
      <div className="case-solved__badge">CASE SOLVED</div>
      <div className="case-solved__flag" aria-hidden="true">
        {countryFlag}
      </div>
      <h2>{countryName.toUpperCase()}</h2>
      <p>You identified the country.</p>

      <div className="case-solved__stats">
        <div>
          <span>Clues used</span>
          <strong>{cluesUsed}</strong>
        </div>
        <div>
          <span>This case</span>
          <strong>+{roundScore}</strong>
          {/* An unexplained 1187 reads as arbitrary, which makes the timer feel
              unfair. Showing the two halves is what makes it feel earned. */}
          {baseScore !== undefined && timeBonus !== undefined ? (
            <span className="case-solved__breakdown">
              {baseScore} base
              {timeBonus > 0 ? <em> + {timeBonus} speed</em> : ' + no speed bonus'}
            </span>
          ) : null}
        </div>
        <div>
          <span>Session total</span>
          <strong>{score}</strong>
        </div>
      </div>

      <button type="button" className="primary-button" onClick={onNewInvestigation}>
        New Investigation
      </button>
      {error ? (
        <p className="answer-input-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
