type StartScreenProps = {
  onStart: () => void
  isStarting: boolean
}

export function StartScreen({ onStart, isStarting }: StartScreenProps) {
  return (
    <section className="start-screen">
      <div className="start-screen__badge">🕵️ API DETECTIVE</div>
      <h1>Find the truth behind the missing location.</h1>
      <p className="start-screen__subtitle">
        Four suspects. One location. Find the truth.
      </p>
      <button type="button" className="primary-button" onClick={onStart} disabled={isStarting}>
        {isStarting ? 'Loading case file...' : 'Start Investigation'}
      </button>
    </section>
  )
}
