/**
 * Where the run token is parked between page loads.
 *
 * The token itself is opaque and server-signed - the running total lives inside
 * it, encrypted, so nothing here can inflate a score. All this buys is that a
 * refresh no longer drops the player back to zero.
 */

const STORAGE_KEY = 'api-detective:run'

// Private windows and blocked site data make these throw rather than return
// null, so every access is guarded. Losing the token only costs a fresh run.
export function readRunId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeRunId(runId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, runId)
  } catch {
    // Storage unavailable: the run still works, it just will not outlive the tab.
  }
}
