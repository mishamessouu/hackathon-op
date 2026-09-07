import { useState } from 'react'
import './App.css'
import { startGame, submitAnswer } from './api/game'
import { AnswerGrid } from './components/AnswerGrid'
import { CaseSolved } from './components/CaseSolved'
import { ClueCard } from './components/ClueCard'
import { GameHeader } from './components/GameHeader'
import { ProgressIndicator } from './components/ProgressIndicator'
import { StartScreen } from './components/StartScreen'
import { WrongAnswer } from './components/WrongAnswer'
import { ALL_COUNTRY_OPTIONS } from './mocks/game'
import type { GameQuestion, GameState } from './types/game'

const TOTAL_CLUES = 4

function App() {
  const [gameState, setGameState] = useState<GameState>('start')
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [score, setScore] = useState(0)
  const [clueNumber, setClueNumber] = useState(1)
  const [wrongMessage, setWrongMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvedOption, setResolvedOption] = useState<{ label: string; flag?: string } | null>(null)

  const caseNumber = question?.gameId.replace('case-', '#') ?? '---'

  async function handleStart() {
    setIsLoading(true)

    try {
      const nextQuestion = await startGame()
      setQuestion(nextQuestion)
      setScore(0)
      setClueNumber(1)
      setWrongMessage('')
      setResolvedOption(null)
      setGameState('playing')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAnswer(answer: string) {
    if (!question || isSubmitting) {
      return
    }

    const normalizedAnswer = answer.trim()
    if (!normalizedAnswer) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitAnswer(question.gameId, normalizedAnswer)

      if (result.correct) {
        setScore((previousScore) => previousScore + result.score)
        setResolvedOption({ label: normalizedAnswer, flag: '🌍' })
        setGameState('solved')
        setWrongMessage('')
        return
      }

      setWrongMessage(result.message ?? 'Not quite. The investigation continues…')
      if (result.nextQuestion) {
        setQuestion(result.nextQuestion)
        setClueNumber((previous) => Math.min(previous + 1, TOTAL_CLUES))
      }
      setGameState('wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  function continueInvestigation() {
    setGameState('playing')
    setWrongMessage('')
  }

  function handleNewInvestigation() {
    void handleStart()
  }

  return (
    <div className="app-shell">
      {gameState === 'start' ? (
        <StartScreen onStart={handleStart} isStarting={isLoading} />
      ) : (
        <main className="game-panel">
          {question ? (
            <>
              <GameHeader caseNumber={caseNumber} score={score} clueNumber={clueNumber} />

              {gameState === 'playing' && (
                <>
                  <div className="clue-header">
                    <span className="clue-badge">CASE FILE</span>
                  </div>
                  <ClueCard clue={question.clue} />
                  <div className="question-title">WHERE ARE WE?</div>
                  <AnswerGrid
                    options={[]}
                    countryOptions={ALL_COUNTRY_OPTIONS}
                    onAnswer={handleAnswer}
                    disabled={isSubmitting}
                  />
                  <ProgressIndicator clueNumber={clueNumber} totalClues={TOTAL_CLUES} />
                </>
              )}

              {gameState === 'wrong' && (
                <>
                  <WrongAnswer
                    message={wrongMessage}
                    onContinue={continueInvestigation}
                    isContinuing={isSubmitting}
                  />
                  <div className="clue-header spacing-top">
                    <span className="clue-badge">CASE FILE</span>
                  </div>
                  <ClueCard clue={question.clue} />
                  <div className="question-title">WHERE ARE WE?</div>
                  <AnswerGrid
                    options={[]}
                    countryOptions={ALL_COUNTRY_OPTIONS}
                    onAnswer={handleAnswer}
                    disabled={isSubmitting}
                  />
                  <ProgressIndicator clueNumber={clueNumber} totalClues={TOTAL_CLUES} />
                </>
              )}

              {gameState === 'solved' && (
                <CaseSolved
                  caseNumber={caseNumber}
                  score={score}
                  cluesUsed={clueNumber}
                  onNewInvestigation={handleNewInvestigation}
                  countryName={resolvedOption?.label ?? 'Country'}
                  countryFlag={resolvedOption?.flag ?? '🌍'}
                />
              )}
            </>
          ) : null}
        </main>
      )}
    </div>
  )
}

export default App
