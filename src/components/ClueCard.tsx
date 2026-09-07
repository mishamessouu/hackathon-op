import type { Clue } from '../types/game'

type ClueCardProps = {
  clue: Clue
}

export function ClueCard({ clue }: ClueCardProps) {
  return (
    <section className="clue-card" aria-live="polite">
      <div className="clue-card__meta">
        <span>{clue.category}</span>
      </div>
      <p className="clue-card__text">{clue.text}</p>
    </section>
  )
}
