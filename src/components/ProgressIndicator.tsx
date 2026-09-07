type ProgressIndicatorProps = {
  clueNumber: number
  totalClues: number
}

export function ProgressIndicator({ clueNumber, totalClues }: ProgressIndicatorProps) {
  return (
    <div className="progress-indicator" aria-label={`Investigation progress ${clueNumber} of ${totalClues}`}>
      <span className="progress-indicator__label">INVESTIGATION</span>
      <div className="progress-dots" role="progressbar" aria-valuenow={clueNumber} aria-valuemin={1} aria-valuemax={totalClues}>
        {Array.from({ length: totalClues }, (_, index) => {
          const isActive = index + 1 <= clueNumber
          return <span key={`dot-${index + 1}`} className={`dot ${isActive ? 'active' : ''}`} />
        })}
      </div>
    </div>
  )
}
