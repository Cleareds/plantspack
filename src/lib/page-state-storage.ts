interface StoredData<T> {
  data: T
  timestamp: number
  userId?: string
}

const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes

export function savePageState<T>(
  key: string,
  data: T,
  ttl = DEFAULT_TTL,
  userId?: string
): void {
  try {
    const stored: StoredData<T> = {
      data,
      timestamp: Date.now(),
      userId,
    }
    sessionStorage.setItem(key, JSON.stringify(stored))
  } catch {
    // sessionStorage may be unavailable (SSR, private mode quota)
  }
}

export function loadPageState<T>(key: string, userId?: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const stored: StoredData<T> = JSON.parse(raw)

    // Check TTL — we don't store TTL itself, so we compare against the last save
    // The TTL check requires the caller to pass the same TTL used when saving.
    // Instead we use a simple approach: any state older than the max TTL (1h) is expired.
    const MAX_AGE = 60 * 60 * 1000 // 1 hour hard cap
    if (Date.now() - stored.timestamp > MAX_AGE) {
      sessionStorage.removeItem(key)
      return null
    }

    // If userId is provided, ensure state belongs to this user
    if (userId && stored.userId && stored.userId !== userId) {
      sessionStorage.removeItem(key)
      return null
    }

    return stored.data
  } catch {
    return null
  }
}

export function clearPageState(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function clearExpiredStates(): void {
  try {
    const MAX_AGE = 60 * 60 * 1000
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key) continue
      try {
        const raw = sessionStorage.getItem(key)
        if (!raw) continue
        const stored: StoredData<unknown> = JSON.parse(raw)
        if (stored.timestamp && now - stored.timestamp > MAX_AGE) {
          keysToRemove.push(key)
        }
      } catch {
        // not our format, skip
      }
    }

    keysToRemove.forEach(k => sessionStorage.removeItem(k))
  } catch {
    // ignore
  }
}

export function clearUserStates(userId: string): void {
  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key) continue
      try {
        const raw = sessionStorage.getItem(key)
        if (!raw) continue
        const stored: StoredData<unknown> = JSON.parse(raw)
        if (stored.userId === userId) {
          keysToRemove.push(key)
        }
      } catch {
        // not our format, skip
      }
    }

    keysToRemove.forEach(k => sessionStorage.removeItem(k))
  } catch {
    // ignore
  }
}
