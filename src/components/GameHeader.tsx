import quizIcon from '../../quiz-icon.jpeg'

type GameHeaderProps = {
  caseNumber: string
  score: number
  clueNumber: number
  totalClues: number
  clueValue: number
}

export function GameHeader({
  caseNumber,
  score,
  clueNumber,
  totalClues,
  clueValue,
}: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="brand-group">
        <img className="brand-mark" src={quizIcon} alt="" aria-hidden="true" />
        <div>
          <p className="eyebrow">RUNTIME REBELS</p>
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
        <span className="progress-label">
          CLUE {clueNumber} OF {totalClues}
        </span>
        <strong className="clue-value">{clueValue} PTS</strong>
      </div>
    </header>
  )
}
