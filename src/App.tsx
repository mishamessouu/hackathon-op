import { useEffect, useState } from 'react'
import './App.css'
import { fetchCountries, startGame, submitAnswer } from './api/game'
import { AnswerGrid } from './components/AnswerGrid'
import { CaseSolved } from './components/CaseSolved'
import { ClueCard } from './components/ClueCard'
import { GameHeader } from './components/GameHeader'
import { ProgressIndicator } from './components/ProgressIndicator'
import { StartScreen } from './components/StartScreen'
import { WrongAnswer } from './components/WrongAnswer'
import type { GameQuestion, GameState, Option, RevealedCountry } from './types/game'

function App() {
  const [gameState, setGameState] = useState<GameState>('start')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [countryOptions, setCountryOptions] = useState<Option[]>([])
  const [score, setScore] = useState(0)
  const [wrongMessage, setWrongMessage] = useState('')
  const [revealed, setRevealed] = useState<RevealedCountry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // The dropdown list comes from countries.csv via the API.
  useEffect(() => {
    fetchCountries()
      .then(setCountryOptions)
      .catch((error: Error) => setErrorMessage(error.message))
  }, [])

  async function handleStart() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextQuestion = await startGame()
      setQuestion(nextQuestion)
      setScore(0)
      setWrongMessage('')
      setRevealed(null)
      setGameState('playing')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAnswer(answer: string) {
    if (!question || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const result = await submitAnswer(question.gameId, answer)

      if (result.correct) {
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

  function continueInvestigation() {
    setGameState('playing')
    setWrongMessage('')
  }

  const isGuessing = gameState === 'playing' || gameState === 'wrong'

  return (
    <div className="app-shell">
      {gameState === 'start' ? (
        <StartScreen onStart={handleStart} isStarting={isLoading} />
      ) : (
        <main className="game-panel">
          {question ? (
            <>
              <GameHeader
                caseNumber={question.caseNumber}
                score={score}
                clueNumber={question.clueNumber}
              />

              {gameState === 'wrong' && (
                <WrongAnswer
                  message={wrongMessage}
                  onContinue={continueInvestigation}
                  isContinuing={isSubmitting}
                />
              )}

              {isGuessing && (
                <>
                  <div className={gameState === 'wrong' ? 'clue-header spacing-top' : 'clue-header'}>
                    <span className="clue-badge">CASE FILE</span>
                  </div>
                  <ClueCard clue={question.clue} />
                  <div className="question-title">WHERE ARE WE?</div>
                  <AnswerGrid
                    options={countryOptions}
                    onAnswer={handleAnswer}
                    disabled={isSubmitting || countryOptions.length === 0}
                  />
                  <ProgressIndicator
                    clueNumber={question.clueNumber}
                    totalClues={question.totalClues}
                  />
                </>
              )}

              {gameState === 'lost' && (
                <section className="wrong-answer" aria-live="polite">
                  <div className="case-solved__flag">{revealed?.flag ?? '🌍'}</div>
                  <h2>The trail goes cold.</h2>
                  <p>It was {revealed?.name ?? 'somewhere else'}.</p>
                  <button type="button" className="primary-button" onClick={handleStart}>
                    New Investigation
                  </button>
                </section>
              )}

              {gameState === 'solved' && (
                <CaseSolved
                  caseNumber={question.caseNumber}
                  score={score}
                  cluesUsed={question.clueNumber}
                  onNewInvestigation={handleStart}
                  countryName={revealed?.name ?? 'Country'}
                  countryFlag={revealed?.flag ?? '🌍'}
                />
              )}
            </>
          ) : null}
        </main>
      )}

      {errorMessage ? <p className="answer-input-error">{errorMessage}</p> : null}
    </div>
  )
}

export default App
