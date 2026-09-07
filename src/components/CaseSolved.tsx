type CaseSolvedProps = {
  score: number
  roundScore: number
  cluesUsed: number
  countryName: string
  countryFlag: string
  onNewInvestigation: () => void
  error?: string
}

export function CaseSolved({
  score,
  roundScore,
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
