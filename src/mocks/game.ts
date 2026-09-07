import type { AnswerResponse, GameQuestion, Option } from '../types/game'

const CASES = [
  {
    gameId: 'case-042',
    correctCountry: 'Sweden',
    clues: [
      {
        id: 'clue-1',
        category: '🌍 Geography',
        text: 'This country has more than 1,000 islands spread across its coastline.',
      },
      {
        id: 'clue-2',
        category: '💰 Currency',
        text: 'The local currency is the Swedish krona.',
      },
      {
        id: 'clue-3',
        category: '🏙️ Capital',
        text: 'Its capital city is Stockholm, a major Nordic innovation hub.',
      },
      {
        id: 'clue-4',
        category: '📍 Location',
        text: 'It sits in northern Europe, bordering the Gulf of Bothnia and the Baltic Sea.',
      },
    ],
  },
  {
    gameId: 'case-043',
    correctCountry: 'Japan',
    clues: [
      {
        id: 'clue-1',
        category: '🕐 Timezone',
        text: 'This country is known for being ahead of many global time zones, thanks to JST.',
      },
      {
        id: 'clue-2',
        category: '👥 Population',
        text: 'It is home to more than 125 million people, making it one of the world’s most populous countries.',
      },
      {
        id: 'clue-3',
        category: '🏙️ Capital',
        text: 'Its capital is Tokyo, one of the largest metropolitan regions on Earth.',
      },
      {
        id: 'clue-4',
        category: '📍 Location',
        text: 'It is an island nation in East Asia, stretching across a chain of volcanic islands.',
      },
    ],
  },
] as const

export const ALL_COUNTRY_OPTIONS: Option[] = [
  { id: 'SE', label: 'Sweden', flag: '🇸🇪' },
  { id: 'NO', label: 'Norway', flag: '🇳🇴' },
  { id: 'FI', label: 'Finland', flag: '🇫🇮' },
  { id: 'DK', label: 'Denmark', flag: '🇩🇰' },
  { id: 'JP', label: 'Japan', flag: '🇯🇵' },
  { id: 'KR', label: 'South Korea', flag: '🇰🇷' },
  { id: 'CN', label: 'China', flag: '🇨🇳' },
  { id: 'TH', label: 'Thailand', flag: '🇹🇭' },
  { id: 'FR', label: 'France', flag: '🇫🇷' },
  { id: 'DE', label: 'Germany', flag: '🇩🇪' },
  { id: 'ES', label: 'Spain', flag: '🇪🇸' },
  { id: 'IT', label: 'Italy', flag: '🇮🇹' },
  { id: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { id: 'US', label: 'United States', flag: '🇺🇸' },
  { id: 'CA', label: 'Canada', flag: '🇨🇦' },
  { id: 'BR', label: 'Brazil', flag: '🇧🇷' },
  { id: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { id: 'MX', label: 'Mexico', flag: '🇲🇽' },
  { id: 'AU', label: 'Australia', flag: '🇦🇺' },
  { id: 'NZ', label: 'New Zealand', flag: '🇳🇿' },
  { id: 'IN', label: 'India', flag: '🇮🇳' },
  { id: 'ID', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'MY', label: 'Malaysia', flag: '🇲🇾' },
  { id: 'SG', label: 'Singapore', flag: '🇸🇬' },
  { id: 'ZA', label: 'South Africa', flag: '🇿🇦' },
  { id: 'EG', label: 'Egypt', flag: '🇪🇬' },
  { id: 'NG', label: 'Nigeria', flag: '🇳🇬' },
  { id: 'KE', label: 'Kenya', flag: '🇰🇪' },
  { id: 'TR', label: 'Turkey', flag: '🇹🇷' },
  { id: 'GR', label: 'Greece', flag: '🇬🇷' },
  { id: 'PT', label: 'Portugal', flag: '🇵🇹' },
  { id: 'PL', label: 'Poland', flag: '🇵🇱' },
  { id: 'NL', label: 'Netherlands', flag: '🇳🇱' },
  { id: 'BE', label: 'Belgium', flag: '🇧🇪' },
  { id: 'CH', label: 'Switzerland', flag: '🇨🇭' },
]

const clueScores = [1000, 750, 500, 250] as const
const sessions = new Map<string, { caseIndex: number; clueIndex: number }>()
let nextCaseIndex = 0

function withDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 350)
  })
}

function buildQuestion(gameId: string, clueIndex: number): GameQuestion {
  const selectedCase = CASES.find((caseEntry) => caseEntry.gameId === gameId)

  if (!selectedCase) {
    throw new Error(`Unknown case: ${gameId}`)
  }

  const clue = selectedCase.clues[clueIndex]

  return {
    gameId: selectedCase.gameId,
    score: clueScores[clueIndex],
    clue,
    answer: selectedCase.correctCountry,
  }
}

export async function mockStartGame(): Promise<GameQuestion> {
  const caseIndex = nextCaseIndex % CASES.length
  nextCaseIndex += 1
  const selectedCase = CASES[caseIndex]

  sessions.set(selectedCase.gameId, { caseIndex, clueIndex: 0 })

  return withDelay(buildQuestion(selectedCase.gameId, 0))
}

export async function mockSubmitAnswer(
  gameId: string,
  answer: string,
): Promise<AnswerResponse> {
  const selectedCase = CASES.find((caseEntry) => caseEntry.gameId === gameId)

  if (!selectedCase) {
    return withDelay({
      correct: false,
      score: 0,
      gameOver: true,
      message: 'Unknown case file.',
    })
  }

  const session = sessions.get(gameId) ?? { caseIndex: CASES.findIndex((caseEntry) => caseEntry.gameId === gameId), clueIndex: 0 }
  const currentClueIndex = session.clueIndex
  const currentQuestion = buildQuestion(gameId, currentClueIndex)
  const normalizedAnswer = answer.trim().toLowerCase()
  const normalizedCorrect = selectedCase.correctCountry.trim().toLowerCase()
  const isCorrect = normalizedAnswer === normalizedCorrect

  if (isCorrect) {
    sessions.delete(gameId)
    return withDelay({
      correct: true,
      score: currentQuestion.score,
      gameOver: true,
      message: 'Case solved.',
    })
  }

  const nextClueIndex = currentClueIndex + 1

  if (nextClueIndex >= selectedCase.clues.length) {
    sessions.set(gameId, { caseIndex: session.caseIndex, clueIndex: nextClueIndex })
    return withDelay({
      correct: false,
      score: currentQuestion.score,
      gameOver: true,
      message: 'The trail goes cold. Start a new investigation.',
    })
  }

  sessions.set(gameId, { caseIndex: session.caseIndex, clueIndex: nextClueIndex })

  return withDelay({
    correct: false,
    score: currentQuestion.score,
    gameOver: false,
    nextQuestion: buildQuestion(gameId, nextClueIndex),
    message: 'Not quite. The investigation continues…',
  })
}
