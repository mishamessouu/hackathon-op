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

export type GameQuestion = {
  gameId: string
  caseNumber: string
  score: number
  clue: Clue
  clueNumber: number
  totalClues: number
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

export type AnswerResponse = {
  correct: boolean
  score: number
  gameOver: boolean
  message?: string
  nextQuestion?: GameQuestion
  country?: RevealedCountry
  comparison?: GuessComparison | null
}

export type GameState = 'start' | 'playing' | 'wrong' | 'solved' | 'lost'
