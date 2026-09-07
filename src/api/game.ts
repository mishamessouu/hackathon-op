import type { AnswerResponse, GameQuestion, Option } from '../types/game'

// Same-origin in production; the Vite dev server proxies /api to Flask.
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.error ?? `Request to ${path} failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export async function fetchCountries(): Promise<Option[]> {
  const payload = await request<{ countries: Option[] }>('/api/countries')
  return payload.countries
}

// The run token carries the running total. It is opaque and server-signed, so
// the client only ever hands back whatever it was last given.
export async function startGame(runId: string | null): Promise<GameQuestion> {
  return request<GameQuestion>('/api/game', {
    method: 'POST',
    body: JSON.stringify({ runId }),
  })
}

export async function submitAnswer(
  gameId: string,
  answer: string,
  runId: string | null,
): Promise<AnswerResponse> {
  return request<AnswerResponse>('/api/game/guess', {
    method: 'POST',
    body: JSON.stringify({ gameId, answer, runId }),
  })
}
