import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import './App.css'
import { fetchCountries, startGame, submitAnswer } from './api/game'
import { AnswerGrid } from './components/AnswerGrid'
import { CaseSolved } from './components/CaseSolved'
import { ClueCard } from './components/ClueCard'
import { GameHeader } from './components/GameHeader'
import { ProgressIndicator } from './components/ProgressIndicator'
import { StartScreen } from './components/StartScreen'
import { GlobeBoundary } from './components/GlobeBoundary'
import { WrongAnswer } from './components/WrongAnswer'
import type { Guess, GameQuestion, GameState, Option, RevealedCountry } from './types/game'

// three.js is heavy, so it must not block the first paint.
const GuessGlobe = lazy(() => import('./components/GuessGlobe'))

function App() {
  const [gameState, setGameState] = useState<GameState>('start')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [countryOptions, setCountryOptions] = useState<Option[]>([])
  const [countriesError, setCountriesError] = useState('')
  const [score, setScore] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [wrongMessage, setWrongMessage] = useState('')
  const [revealed, setRevealed] = useState<RevealedCountry | null>(null)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // The dropdown list comes from countries.csv via the API.
  const loadCountries = useCallback(() => {
    fetchCountries()
      .then((list) => {
        setCountryOptions(list)
        setCountriesError('')
      })
      .catch((error: Error) => setCountriesError(error.message))
  }, [])

  useEffect(loadCountries, [loadCountries])

  async function handleStart() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextQuestion = await startGame()
      setQuestion(nextQuestion)
      setRoundScore(0)
      setGuesses([])
      setWrongMessage('')
      setRevealed(null)
      setGameState('playing')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAnswer(option: Option) {
    if (!question || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const result = await submitAnswer(question.gameId, option.label)

      setGuesses((previous) => [
        ...previous,
        {
          iso2: option.id,
          label: option.label,
          numericCode: option.numericCode,
          lat: option.lat,
          lng: option.lng,
          correct: result.correct,
        },
      ])

      if (result.correct) {
        setRoundScore(result.score)
        setScore((previousScore) => previousScore + result.score)
        setRevealed(result.country ?? null)
        setGameState('solved')
        setWrongMessage('')
        return
      }

      setWrongMessage(result.message ?? 'Not quite. The investigation continues…')

      if (result.gameOver) {
        setRevealed(result.country ?? null)
        setGameState('lost')
        return
      }

      if (result.nextQuestion) {
        setQuestion(result.nextQuestion)
      }
      setGameState('wrong')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isGuessing = gameState === 'playing' || gameState === 'wrong'
  const hasCountries = countryOptions.length > 0

  return (
    <div className="app-shell">
      {gameState === 'start' ? (
        <StartScreen onStart={handleStart} isStarting={isLoading} error={errorMessage} />
      ) : (
        <main className="game-panel">
          {question ? (
            <>
              <GameHeader
                caseNumber={question.caseNumber}
                score={score}
                clueNumber={question.clueNumber}
                totalClues={question.totalClues}
                clueValue={question.score}
              />

              {gameState === 'wrong' && <WrongAnswer message={wrongMessage} />}

              {isGuessing && (
                <div className={gameState === 'wrong' ? 'clue-header spacing-top' : 'clue-header'}>
                  <span className="clue-badge">CASE FILE</span>
                </div>
              )}

              {/* One globe for the whole round: remounting it would restart
                  three.js and throw away the camera on every state change. */}
              <div className="game-stage">
                <div className="game-stage__main">
                  {isGuessing && <ClueCard clue={question.clue} />}

                  {gameState === 'solved' && (
                    <CaseSolved
                      score={score}
                      roundScore={roundScore}
                      cluesUsed={question.clueNumber}
                      onNewInvestigation={handleStart}
                      countryName={revealed?.name ?? 'Country'}
                      countryFlag={revealed?.flag ?? '🌍'}
                      error={errorMessage}
                    />
                  )}

                  {gameState === 'lost' && (
                    <section className="wrong-answer" aria-live="polite">
                      <div className="case-solved__flag" aria-hidden="true">
                        {revealed?.flag ?? '🌍'}
                      </div>
                      <h2>The trail goes cold.</h2>
                      <p>It was {revealed?.name ?? 'somewhere else'}.</p>
                      <button type="button" className="primary-button" onClick={handleStart}>
                        New Investigation
                      </button>
                      {errorMessage ? (
                        <p className="answer-input-error" role="alert">
                          {errorMessage}
                        </p>
                      ) : null}
                    </section>
                  )}
                </div>

                <GlobeBoundary
                  fallback={
                    <div className="guess-globe guess-globe--fallback">
                      <p>Globe unavailable in this browser.</p>
                    </div>
                  }
                >
                  <Suspense fallback={<div className="guess-globe guess-globe--loading" />}>
                    <GuessGlobe
                      guesses={guesses}
                      revealed={revealed}
                      solved={gameState === 'solved'}
                    />
                  </Suspense>
                </GlobeBoundary>
              </div>

              {isGuessing && (
                <>
                  <div className="question-title">WHERE ARE WE?</div>

                  {hasCountries ? (
                    <AnswerGrid
                      options={countryOptions}
                      onAnswer={handleAnswer}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <div className="answer-empty">
                      <p>{countriesError || 'Loading the country list…'}</p>
                      {countriesError ? (
                        <button type="button" className="secondary-button" onClick={loadCountries}>
                          Retry
                        </button>
                      ) : null}
                    </div>
                  )}

                  {errorMessage ? (
                    <p className="answer-input-error" role="alert">
                      {errorMessage}
                    </p>
                  ) : null}

                  <ProgressIndicator
                    clueNumber={question.clueNumber}
                    totalClues={question.totalClues}
                  />
                </>
              )}

            </>
          ) : null}
        </main>
      )}
    </div>
  )
}

export default App
