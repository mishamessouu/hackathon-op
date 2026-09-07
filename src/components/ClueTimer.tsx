import { useEffect, useState } from 'react'

/**
 * The draining speed-bonus meter for the clue on screen.
 *
 * Cosmetic by design. The server stamps the clue's start time inside the
 * encrypted gameId and scores the answer off its own clock, so this component
 * only animates a duration it was handed - nothing it displays can be gamed,
 * and it needs no clock synchronisation. Mount it with `key={gameId}` so each
 * clue gets a fresh meter.
 */

// 10Hz. Fast enough that the CSS transition below reads as continuous, slow
// enough to stay far away from a per-frame re-render.
const TICK_MS = 100

function bonusFraction(elapsedMs: number, windowMs: number, graceMs: number): number {
  if (elapsedMs <= graceMs) {
    return 1
  }
  if (elapsedMs >= windowMs) {
    return 0
  }
  return (windowMs - elapsedMs) / (windowMs - graceMs)
}

type ClueTimerProps = {
  windowMs: number
  graceMs: number
  maxBonus: number
}

export function ClueTimer({ windowMs, graceMs, maxBonus }: ClueTimerProps) {
  // Deliberately local state. Lifting this into App would re-render GuessGlobe
  // ten times a second and drag three.js along with it.
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const startedAt = performance.now()
    const ticker = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      setElapsedMs(elapsed)
      if (elapsed >= windowMs) {
        window.clearInterval(ticker)
      }
    }, TICK_MS)
    return () => window.clearInterval(ticker)
  }, [windowMs])

  const fraction = bonusFraction(elapsedMs, windowMs, graceMs)
  // An estimate: the authoritative figure comes back with the answer, since
  // the round trip is time the server counts and the browser cannot see.
  const bonus = Math.round(maxBonus * fraction)
  const spent = fraction <= 0

  return (
    // Hidden from assistive tech on purpose - a value changing ten times a
    // second is unusable as a live region. The bonus that actually landed is
    // announced by the CASE SOLVED panel, which is where it matters.
    <div className="clue-timer" data-spent={spent || undefined} aria-hidden="true">
      <div className="clue-timer__label">
        <span>{spent ? 'NO SPEED BONUS' : 'SPEED BONUS'}</span>
        <strong>+{bonus}</strong>
      </div>
      <div className="clue-timer__track">
        <div
          className="clue-timer__fill"
          style={{
            transform: `scaleX(${fraction})`,
            // Teal when there is time, red as it runs out.
            ['--fill-hue' as string]: `${Math.round(fraction * 172)}`,
          }}
        />
      </div>
    </div>
  )
}
