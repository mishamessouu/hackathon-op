type GameHeaderProps = {
  caseNumber: string
  score: number
  clueNumber: number
}

export function GameHeader({ caseNumber, score, clueNumber }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="brand-group">
        <span className="brand-mark">🕵️</span>
        <div>
          <p className="eyebrow">API DETECTIVE</p>
        </div>
      </div>

      <div className="header-metrics">
        <div className="score-box">
          <span className="label">SCORE</span>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="header-case">
        <span className="case-label">CASE</span>
        <strong>{caseNumber}</strong>
      </div>

      <div className="header-progress">
        <span className="progress-label">CLUE {clueNumber}</span>
      </div>
    </header>
  )
}
