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
  score: number
  clue: Clue
  answer: string
}

export type AnswerResponse = {
  correct: boolean
  score: number
  gameOver: boolean
  nextQuestion?: GameQuestion
  message?: string
}

export type GameState = 'start' | 'playing' | 'wrong' | 'solved'
