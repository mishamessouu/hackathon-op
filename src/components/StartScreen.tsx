type StartScreenProps = {
  onStart: () => void
  isStarting: boolean
  error?: string
}

const STEPS = [
  {
    title: 'Read the clue',
    body: 'Every case opens with one fact about a country. The first is the vaguest.',
  },
  {
    title: 'Name the country',
    body: 'Search all 250 of them. Guess wrong and you see how your guess compares.',
  },
  {
    title: 'Beat the clock on points',
    body: 'A wrong guess unlocks the next clue and drops the case from 1500 to 250.',
  },
]

export function StartScreen({ onStart, isStarting, error }: StartScreenProps) {
  return (
    <section className="start-screen">
      <div className="start-screen__badge">
        <span aria-hidden="true">🕵️</span> API DETECTIVE
      </div>
      <h1>Figure out which country is hiding behind the clues</h1>
      <p className="start-screen__subtitle">

      </p>

      <ol className="start-steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className="start-step">
            <span className="start-step__number" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="primary-button start-button"
        onClick={onStart}
        disabled={isStarting}
      >
        {isStarting ? 'Loading case file...' : 'Start the game'}
      </button>
      {error ? (
        <p className="answer-input-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
