export type Option = {
  id: string
  label: string
  flag?: string
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
  flag: string
}

export type AnswerResponse = {
  correct: boolean
  score: number
  gameOver: boolean
  message?: string
  nextQuestion?: GameQuestion
  country?: RevealedCountry
}

export type GameState = 'start' | 'playing' | 'wrong' | 'solved' | 'lost'
