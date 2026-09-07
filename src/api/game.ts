import type { AnswerResponse, GameQuestion } from '../types/game'
import { mockStartGame, mockSubmitAnswer } from '../mocks/game'

export async function startGame(): Promise<GameQuestion> {
  return mockStartGame()
}

export async function submitAnswer(
  gameId: string,
  answer: string,
): Promise<AnswerResponse> {
  return mockSubmitAnswer(gameId, answer)
}
