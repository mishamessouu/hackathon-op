import { useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'

/**
 * The MLG quickscope. A sniper scope irises in over the solved case, hitmarkers
 * land, and the screen loses its mind for three seconds. Decorative only: the
 * overlay is pointer-transparent and aria-hidden, so CASE SOLVED underneath
 * stays readable and clickable for anyone who wants to skip straight ahead.
 */

const QUICKSCOPE_MS = 3000

// Hand-placed so the ladder of hits reads as a burst rather than a scatter.
// Offsets are vmin, measured from the centre of the scope.
const HITMARKERS = [
  { x: 0, y: 0, size: 26, delay: 400 },
  { x: -17, y: -11, size: 17, delay: 620 },
  { x: 15, y: 13, size: 19, delay: 780 },
  { x: 20, y: -18, size: 14, delay: 940 },
  { x: -12, y: 17, size: 18, delay: 1100 },
]

const SHOUTS = [
  { text: 'WOW', delay: 680, x: -24, y: -26, tilt: -12 },
  { text: '360 NOSCOPE', delay: 1040, x: 22, y: 22, tilt: 9 },
  { text: 'MOM GET THE CAMERA', delay: 1480, x: -4, y: 33, tilt: -4 },
]

// 🔺 stands in for the Dorito - there is no chip emoji, and it doubles as the
// obligatory illuminati triangle.
const CONFETTI_EMOJI = ['🔺', '🥤', '🔥', '💯', '😎', '📢', '✨', '👌', '🕶️', '🎺']

type ConfettiPiece = {
  id: number
  emoji: string
  left: number
  delay: number
  duration: number
  drift: number
  spin: number
  scale: number
}

function buildConfetti(): ConfettiPiece[] {
  return Array.from({ length: 28 }, (_, index) => ({
    id: index,
    emoji: CONFETTI_EMOJI[index % CONFETTI_EMOJI.length],
    left: (index / 28) * 100 + (Math.random() * 6 - 3),
    delay: 260 + Math.random() * 1500,
    duration: 1300 + Math.random() * 900,
    drift: Math.random() * 30 - 15,
    spin: Math.random() < 0.5 ? -720 : 720,
    scale: 0.75 + Math.random() * 1.1,
  }))
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type QuickscopeProps = {
  roundScore: number
  onDone: () => void
}

export function Quickscope({ roundScore, onDone }: QuickscopeProps) {
  const confetti = useMemo(() => buildConfetti(), [])
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])

  // index.css flattens every animation under reduce, which would leave a frozen
  // scope on screen for three seconds. Skip the whole thing instead.
  useEffect(() => {
    const timer = window.setTimeout(onDone, reducedMotion ? 0 : QUICKSCOPE_MS)
    return () => window.clearTimeout(timer)
  }, [onDone, reducedMotion])

  if (reducedMotion) {
    return null
  }

  return (
    <div className="quickscope" aria-hidden="true">
      <div className="quickscope__flash" />
      <div className="quickscope__aberration quickscope__aberration--red" />
      <div className="quickscope__aberration quickscope__aberration--cyan" />

      <div className="quickscope__recoil">
        <div className="quickscope__lens">
          <div className="quickscope__reticle" />
        </div>

        {HITMARKERS.map((marker) => (
          <span
            key={`${marker.x}:${marker.y}`}
            className="quickscope__hitmarker"
            style={
              {
                '--x': `${marker.x}vmin`,
                '--y': `${marker.y}vmin`,
                '--size': `${marker.size}vmin`,
                '--delay': `${marker.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {SHOUTS.map((shout) => (
        <span
          key={shout.text}
          className="quickscope__shout"
          style={
            {
              '--x': `${shout.x}vmin`,
              '--y': `${shout.y}vmin`,
              '--tilt': `${shout.tilt}deg`,
              '--delay': `${shout.delay}ms`,
            } as CSSProperties
          }
        >
          {shout.text}
        </span>
      ))}

      <span className="quickscope__shout quickscope__points">+{roundScore}</span>

      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="quickscope__confetti"
          style={
            {
              '--left': `${piece.left}%`,
              '--delay': `${piece.delay}ms`,
              '--duration': `${piece.duration}ms`,
              '--drift': `${piece.drift}vw`,
              '--spin': `${piece.spin}deg`,
              '--scale': piece.scale,
            } as CSSProperties
          }
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  )
}
