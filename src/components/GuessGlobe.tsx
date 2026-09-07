import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MeshLambertMaterial } from 'three'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import type { Guess, RevealedCountry } from '../types/game'

type GuessGlobeProps = {
  guesses: Guess[]
  revealed: RevealedCountry | null
  solved: boolean
}

const COLOR_UNGUESSED = 'rgba(148, 163, 184, 0.30)'
const COLOR_WRONG = '#ef4444'
const COLOR_CORRECT = '#22c55e'
// The answer after a loss: distinct, because the player never guessed it.
const COLOR_REVEALED = '#f59e0b'

const FLY_MS = 700

// A plain dark sphere: no texture to fetch, and the coloured countries carry
// all the meaning.
const globeMaterial = new MeshLambertMaterial({ color: '#0b1220' })

type CountryFeature = { id?: string | number }

// The atlas is static, so build the feature list once for the whole module.
const countries = feature(
  worldAtlas as unknown as Topology,
  (worldAtlas as unknown as Topology).objects.countries,
) as unknown as FeatureCollection<Geometry>

/** world-atlas ids drop leading zeros ("4"), our CSV keeps them ("004"). */
function normaliseCode(code: string | number | undefined): string {
  const digits = String(code ?? '').replace(/\D/g, '')
  return digits ? String(Number(digits)) : ''
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export default function GuessGlobe({ guesses, revealed, solved }: GuessGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState(0)

  // width/height default to the window, which would overflow the panel.
  useEffect(() => {
    const element = wrapperRef.current
    if (!element) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      setSize(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const colorByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const guess of guesses) {
      map.set(normaliseCode(guess.numericCode), guess.correct ? COLOR_CORRECT : COLOR_WRONG)
    }
    // Losing reveals the answer, which by definition was never guessed.
    if (revealed && !solved) {
      map.set(normaliseCode(revealed.numericCode), COLOR_REVEALED)
    }
    return map
  }, [guesses, revealed, solved])

  // Countries with no polygon at this resolution still need to show up.
  const markers = useMemo(
    () =>
      guesses
        .filter(
          (guess) =>
            guess.lat !== null &&
            guess.lng !== null &&
            !countries.features.some(
              (item) => normaliseCode((item as CountryFeature).id) === normaliseCode(guess.numericCode),
            ),
        )
        .map((guess) => ({
          lat: guess.lat as number,
          lng: guess.lng as number,
          color: guess.correct ? COLOR_CORRECT : COLOR_WRONG,
        })),
    [guesses],
  )

  const latest = guesses.at(-1)
  const focus = revealed && !solved ? revealed : latest

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !focus || focus.lat === null || focus.lng === null) {
      return
    }
    globe.pointOfView(
      { lat: focus.lat, lng: focus.lng, altitude: 1.8 },
      prefersReducedMotion() ? 0 : FLY_MS,
    )
  }, [focus])

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) {
      return
    }
    controls.autoRotate = false
    controls.enableZoom = false
    // On touch, a one-finger drag over the canvas would rotate the globe
    // instead of scrolling the page, trapping the answer field below it. The
    // camera still flies to each guess, which is the part that carries meaning.
    controls.enableRotate = !window.matchMedia?.('(pointer: coarse)').matches
  }, [size])

  return (
    <div className="guess-globe" ref={wrapperRef}>
      {size > 0 ? (
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#2dd4bf"
          atmosphereAltitude={0.16}
          globeImageUrl={null}
          globeMaterial={globeMaterial}
          showGraticules
          polygonsData={countries.features}
          polygonAltitude={0.012}
          polygonCapColor={(item: object) =>
            colorByCode.get(normaliseCode((item as CountryFeature).id)) ?? COLOR_UNGUESSED
          }
          polygonSideColor={() => 'rgba(15, 23, 42, 0.6)'}
          polygonStrokeColor={() => 'rgba(148, 163, 184, 0.35)'}
          pointsData={markers}
          pointColor={(item: object) => (item as { color: string }).color}
          pointAltitude={0.06}
          pointRadius={0.7}
        />
      ) : null}

      <p className="visually-hidden" aria-live="polite">
        {guesses.length === 0
          ? 'No guesses yet.'
          : `Wrong so far: ${
              guesses
                .filter((guess) => !guess.correct)
                .map((guess) => guess.label)
                .join(', ') || 'none'
            }.${solved && latest ? ` Correct: ${latest.label}.` : ''}${
              revealed && !solved ? ` The answer was ${revealed.name}.` : ''
            }`}
      </p>
    </div>
  )
}
