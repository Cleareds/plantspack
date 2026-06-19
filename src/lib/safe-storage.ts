/**
 * Safe wrappers around localStorage / sessionStorage.
 *
 * Browser storage access can throw SecurityError when the page is loaded in
 * any of these third-party-iframe contexts:
 *   - Google Translate proxy (xxx.translate.goog)
 *   - Safari ITP / Brave Strict / Firefox ETP strict for cross-origin frames
 *   - Sandboxed <iframe> without allow-same-origin
 *   - Some social media in-app browsers with strict storage partitioning
 *
 * Direct `localStorage.getItem(...)` in module-level or useEffect code
 * would throw and cascade up to our ErrorBoundary, showing a broken page
 * instead of the real one. Wrap every access through these helpers so a
 * SecurityError silently degrades to "no persistence" instead of crashing.
 *
 * The helpers also no-op cleanly during SSR (no `window`).
 *
 * Usage:
 *   import { safeStorage } from '@/lib/safe-storage'
 *   const value = safeStorage.local.get('foo')
 *   safeStorage.local.set('foo', 'bar')
 *   safeStorage.session.remove('temp')
 */

type Store = 'localStorage' | 'sessionStorage'

function read(store: Store, key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window[store].getItem(key)
  } catch {
    return null
  }
}

function write(store: Store, key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window[store].setItem(key, value)
    return true
  } catch {
    return false
  }
}

function remove(store: Store, key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window[store].removeItem(key)
    return true
  } catch {
    return false
  }
}

export const safeStorage = {
  local: {
    get: (key: string) => read('localStorage', key),
    set: (key: string, value: string) => write('localStorage', key, value),
    remove: (key: string) => remove('localStorage', key),
  },
  session: {
    get: (key: string) => read('sessionStorage', key),
    set: (key: string, value: string) => write('sessionStorage', key, value),
    remove: (key: string) => remove('sessionStorage', key),
  },
} as const

/**
 * Returns true if the browser allows web storage on this origin. Useful for
 * gating UI that requires persistence (e.g. "Remember me" checkbox).
 */
export function isStorageAvailable(store: Store = 'localStorage'): boolean {
  if (typeof window === 'undefined') return false
  try {
    const probe = '__storage_probe__'
    window[store].setItem(probe, '1')
    window[store].removeItem(probe)
    return true
  } catch {
    return false
  }
}
