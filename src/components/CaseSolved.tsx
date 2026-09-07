type CaseSolvedProps = {
  caseNumber: string
  score: number
  cluesUsed: number
  countryName: string
  countryFlag: string
  onNewInvestigation: () => void
  error?: string
}

export function CaseSolved({
  caseNumber,
  score,
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
          <span>Final score</span>
          <strong>{score}</strong>
        </div>
        <div>
          <span>Case</span>
          <strong>{caseNumber}</strong>
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
