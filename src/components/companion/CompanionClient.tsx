'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { supabase } from '@/lib/supabase'
import Chicken from './animals/Chicken'
import Pig from './animals/Pig'
import Cow from './animals/Cow'
import {
  type Species,
  type CompanionContext,
  SPECIES_LABEL,
  SPECIES_ORDER,
  pickMessage,
} from './messages'
import styles from './CompanionClient.module.css'

/**
 * Companion POC (admin-only).
 *
 * What it is:
 *   - A non-AI companion. No LLM calls. Messages are template-based and
 *     can reference platform data (place counts, user's city, etc.).
 *   - Persistence is localStorage for the POC. Promoting to Supabase
 *     storage is a one-table migration if/when this becomes a real
 *     feature.
 *
 * What it isn't (yet):
 *   - Not a "pet" — internal + user-facing copy must always say
 *     "companion" per product naming rule.
 *   - Not chat. Tap to roll a new message; that's the entire interaction
 *     loop for the POC.
 *   - Not exposed anywhere outside this route. Route is server-gated
 *     to admin only; no link from sidebar/nav/footer/sitemap.
 */

const STORAGE_KEY = 'plantspack_companion_v1'

interface CompanionState {
  species: Species
  name: string
}

const DEFAULT_STATE: CompanionState = {
  species: 'chicken',
  name: 'Mira',
}

function loadState(): CompanionState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<CompanionState>
    return {
      species: SPECIES_ORDER.includes(parsed.species as Species)
        ? (parsed.species as Species)
        : DEFAULT_STATE.species,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : DEFAULT_STATE.name,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(s: CompanionState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* quota exceeded or private mode — non-fatal */
  }
}

const ANIMALS: Record<Species, () => ReactElement> = {
  chicken: Chicken,
  pig: Pig,
  cow: Cow,
}

export default function CompanionClient() {
  // Hydrate state from localStorage after mount so SSR + first CSR render
  // match (both produce the DEFAULT_STATE before useEffect runs). Avoids
  // any hydration mismatch the way the homepage hit earlier this week.
  const [state, setState] = useState<CompanionState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [context, setContext] = useState<CompanionContext>({})
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  // Pull a small slice of platform data so the companion can reference
  // real numbers. All queries are read-only, cached at the Supabase
  // edge, and run after first paint — never block the initial render.
  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    ;(async () => {
      try {
        const [{ count: totalPlaces }, recent] = await Promise.all([
          supabase.from('places').select('id', { count: 'exact', head: true }).is('archived_at', null),
          supabase
            .from('places')
            .select('city')
            .is('archived_at', null)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(500),
        ])
        if (cancelled) return
        const newPlacesThisWeek = recent.data?.length ?? 0
        // Pick the city with the most fresh entries this week as a
        // light "what's buzzing today" signal — purely cosmetic.
        const counts: Record<string, number> = {}
        for (const r of recent.data || []) {
          const c = (r as { city: string | null }).city
          if (c) counts[c] = (counts[c] || 0) + 1
        }
        const topCityToday = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
        const userCity = typeof window !== 'undefined'
          ? (localStorage.getItem('pinned_city_name') || localStorage.getItem('user_city') || null)
          : null
        setContext({ totalPlaces: totalPlaces ?? undefined, newPlacesThisWeek, topCityToday, userCity })
      } catch {
        /* if the queries fail, the companion still works with no-data templates */
      }
    })()
    return () => { cancelled = true }
  }, [hydrated])

  // Re-roll a message whenever the species changes or context arrives.
  useEffect(() => {
    if (!hydrated) return
    setMessage(pickMessage(state.species, context))
  }, [hydrated, state.species, context])

  const Animal = useMemo(() => ANIMALS[state.species], [state.species])

  const update = (patch: Partial<CompanionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveState(next)
      return next
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Companion</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Admin POC — non-AI. Tap your companion to hear something. Choose a look below.
        </p>
      </div>

      {/* Stage: speech bubble + animated SVG */}
      <div className="bg-surface-container-lowest ghost-border rounded-2xl p-6 md:p-8">
        <div className={`${styles.bubble} ${!message ? styles.empty : ''}`} aria-live="polite">
          {message || `${state.name} is thinking…`}
        </div>
        <button
          type="button"
          onClick={() => setMessage(pickMessage(state.species, context))}
          className={styles.stage}
          aria-label={`Tap ${state.name} to talk`}
          style={{ display: 'block', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
        >
          <Animal />
        </button>
        <p className="text-center text-xs text-on-surface-variant mt-2">
          tap to talk
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="companion-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
            Name
          </label>
          <input
            id="companion-name"
            type="text"
            value={state.name}
            maxLength={32}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full max-w-xs px-3 py-2 rounded-lg ghost-border bg-surface-container-lowest text-sm focus:outline-none focus:border-primary/40"
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
            Look
          </span>
          <div className="flex flex-wrap gap-2">
            {SPECIES_ORDER.map((sp) => {
              const active = state.species === sp
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => update({ species: sp })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-on-primary-btn'
                      : 'bg-surface-container-lowest text-on-surface ghost-border hover:border-primary/30'
                  }`}
                  aria-pressed={active}
                >
                  {SPECIES_LABEL[sp]}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[11px] text-on-surface-variant max-w-md leading-relaxed">
          Note: state is stored in this browser only (no DB row yet).
          Reload to verify persistence. Tier gating and Supabase persistence
          come when this graduates out of POC.
        </p>
      </div>
    </div>
  )
}
