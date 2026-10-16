/**
 * The action a guest tried before signing in (save a place, follow a city).
 * Stored in sessionStorage so it survives the OAuth round trip through
 * /auth/callback?next=<page>. The button that owns the action runs it once
 * the user is signed in and clears it. Expires after 30 minutes.
 */
export type PendingAction =
  | { type: 'save'; placeId: string }
  | { type: 'follow'; city: string; country: string; score?: number; grade?: string }

const KEY = 'pp_pending_action'
const TTL_MS = 30 * 60 * 1000

export function setPendingAction(action: PendingAction): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...action, at: Date.now() }))
  } catch {}
}

export function peekPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingAction & { at?: number }
    if (!parsed.at || Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPendingAction(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
}
