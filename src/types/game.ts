export type Option = {
  id: string
  label: string
  /** ISO 3166-1 numeric — how world-atlas keys its country polygons. */
  numericCode: string
  lat: number | null
  lng: number | null
}

/** A country the player has committed to this round. */
export type Guess = {
  iso2: string
  label: string
  numericCode: string
  lat: number | null
  lng: number | null
  correct: boolean
}

export type Clue = {
  id: string
  category: string
  text: string
}

/**
 * The run token and what it carries. Returned beside a question when a round
 * starts and at the top level of every answer - never inside `nextQuestion`,
 * which is why it is not part of GameQuestion.
 */
export type RunState = {
  /** Opaque, server-signed. Carries the running total; hand it back untouched. */
  runId: string
  runTotal: number
  runRounds: number
}

export type GameQuestion = {
  gameId: string
  caseNumber: string
  score: number
  clue: Clue
  clueNumber: number
  totalClues: number
  /** How long the speed bonus takes to drain, restarted on every clue. */
  timerMs: number
  /** Opening stretch worth full marks, so reading the clue is free. */
  graceMs: number
  maxTimeBonus: number
}

export type RevealedCountry = {
  name: string
  iso2: string
  flag: string
  numericCode: string
  lat: number | null
  lng: number | null
}

/** How the guessed country answers the clue that was on screen. */
export type GuessComparison = {
  name: string
  category: string
  value: string
  target: string
  /** True when the guess answers this clue the same way the answer does. */
  matches: boolean
}

export type AnswerResponse = RunState & {
  correct: boolean
  /** Total awarded: the clue's base value plus the speed bonus. */
  score: number
  /** Present on a correct answer. The server's clock is the authority here. */
  baseScore?: number
  timeBonus?: number
  gameOver: boolean
  message?: string
  nextQuestion?: GameQuestion
  country?: RevealedCountry
  comparison?: GuessComparison | null
}

export type GameState = 'start' | 'playing' | 'wrong' | 'solved' | 'lost'
