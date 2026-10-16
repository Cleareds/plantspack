'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { setPendingAction, type PendingAction } from '@/lib/pending-action'
import { track } from '@/lib/analytics'

// The forms carry Turnstile and the username check; load them only when the
// sheet opens so hub and dish pages do not pay for them.
const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), { ssr: false })
const SignupForm = dynamic(() => import('@/components/auth/SignupForm'), { ssr: false })

/**
 * Inline sign-in sheet. A guest who clicks "save" or "follow" gets this
 * instead of a trip to /auth that lands them on the homepage. The sheet
 * names the action ("Sign in to save Nordvegan"), stores it as the pending
 * action, and OAuth / email sign-up return to the current page, where the
 * button that opened the sheet completes the action.
 */
export interface AuthSheetOptions {
  /** One line naming the benefit: "Sign in to save Nordvegan". */
  reason: string
  /** GA4 `cta_click_signup` source: card_save, hub_follow, dish_follow, place_save. */
  from: string
  pending?: PendingAction
  mode?: 'signin' | 'signup'
}

interface AuthSheetContextValue {
  openAuthSheet: (opts: AuthSheetOptions) => void
  closeAuthSheet: () => void
}

const AuthSheetContext = createContext<AuthSheetContextValue>({ openAuthSheet: () => {}, closeAuthSheet: () => {} })

export function useAuthSheet() {
  return useContext(AuthSheetContext)
}

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<AuthSheetOptions | null>(null)
  const openAuthSheet = useCallback((o: AuthSheetOptions) => {
    if (o.pending) setPendingAction(o.pending)
    track('cta_click_signup', { from: o.from, cta: 'auth_sheet' })
    setOpts(o)
  }, [])
  const closeAuthSheet = useCallback(() => setOpts(null), [])
  const value = useMemo(() => ({ openAuthSheet, closeAuthSheet }), [openAuthSheet, closeAuthSheet])
  return (
    <AuthSheetContext.Provider value={value}>
      {children}
      {opts && <AuthSheet opts={opts} onClose={closeAuthSheet} />}
    </AuthSheetContext.Provider>
  )
}

function AuthSheet({ opts, onClose }: { opts: AuthSheetOptions; onClose: () => void }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(opts.mode ?? 'signup')
  // The current page, read from the browser (the sheet only renders after a
  // click, never on the server, so no useSearchParams / Suspense concerns).
  const redirectTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/'

  // Signed in (email + password path): the page keeps its state, the button
  // that opened the sheet runs the pending action.
  useEffect(() => {
    if (user) onClose()
  }, [user, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div>
            <h2 id="auth-sheet-title" className="font-headline font-bold text-lg text-on-surface leading-tight">{opts.reason}</h2>
            <p className="text-xs text-on-surface-variant mt-1">Free. Your saved places and followed cities sync with the app.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-2 pb-4">
          {mode === 'signin' ? (
            <LoginForm onToggle={() => setMode('signup')} redirectTo={redirectTo} />
          ) : (
            <SignupForm onToggle={() => setMode('signin')} redirectTo={redirectTo} />
          )}
        </div>
      </div>
    </div>
  )
}
