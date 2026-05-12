'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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
 * Persistence: Supabase `companions` table with RLS. Each user has at
 * most one companion (UNIQUE on user_id). Reads/writes are scoped to
 * auth.uid() so even if this route is ever opened to all users, no one
 * can read another person's companion row.
 *
 * Local state mirrors the DB row plus an in-memory `message` string
 * that's rolled client-side from non-AI templates.
 *
 * Growth model: stage is derived from created_at in app code, not
 * stored. baby -> juvenile -> adult thresholds live in stageFromAge()
 * below so they're easy to iterate without a migration.
 *
 * Naming rule: this product is *always* called "companion", never
 * "pet". User-facing copy + internal identifiers respect that.
 */

interface CompanionRow {
  id: string
  user_id: string
  species: Species
  name: string
  created_at: string
}

type Stage = 'baby' | 'juvenile' | 'adult'

interface StageInfo {
  stage: Stage
  label: string
  ageDays: number
  nextStageAt: number | null
}

function stageFromAge(createdAt: string): StageInfo {
  const ms = Date.now() - new Date(createdAt).getTime()
  const ageDays = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
  if (ageDays < 7) return { stage: 'baby', label: 'baby', ageDays, nextStageAt: 7 }
  if (ageDays < 30) return { stage: 'juvenile', label: 'juvenile', ageDays, nextStageAt: 30 }
  return { stage: 'adult', label: 'adult', ageDays, nextStageAt: null }
}

const ANIMALS: Record<Species, () => ReactElement> = {
  chicken: Chicken,
  pig: Pig,
  cow: Cow,
}

const DEFAULT_NAME = 'Mira'
const DEFAULT_SPECIES: Species = 'chicken'

export default function CompanionClient() {
  const { user } = useAuth()
  const [row, setRow] = useState<CompanionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [context, setContext] = useState<CompanionContext>({})
  const [message, setMessage] = useState<string>('')

  // Initial fetch: read the user's companion row, or insert a default
  // one if they don't have one yet. This is the "first visit" flow.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('companions')
        .select('id, user_id, species, name, created_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setSaveError(error.message)
        setLoading(false)
        return
      }
      if (data) {
        setRow(data as CompanionRow)
        setLoading(false)
        return
      }
      // No companion yet — adopt a default. The created_at on this row
      // starts the growth clock.
      const { data: inserted, error: insErr } = await supabase
        .from('companions')
        .insert({
          user_id: user.id,
          species: DEFAULT_SPECIES,
          name: DEFAULT_NAME,
        })
        .select('id, user_id, species, name, created_at')
        .single()
      if (cancelled) return
      if (insErr) {
        setSaveError(insErr.message)
      } else if (inserted) {
        setRow(inserted as CompanionRow)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

  // Pull a small slice of platform data so the companion can reference
  // real numbers. Fires after mount; never blocks initial render.
  useEffect(() => {
    if (!row) return
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
        /* swallow — companion still works without platform data */
      }
    })()
    return () => { cancelled = true }
  }, [row])

  // Roll a fresh message whenever the species or context changes.
  useEffect(() => {
    if (!row) return
    setMessage(pickMessage(row.species, context))
  }, [row?.species, context])

  const Animal = useMemo(() => (row ? ANIMALS[row.species] : null), [row?.species])
  const stageInfo = useMemo(() => (row ? stageFromAge(row.created_at) : null), [row?.created_at])

  // Optimistic update: mutate local state instantly, fire-and-forget
  // the DB write. RLS guarantees only this user's row can be touched
  // even if the client lies.
  async function update(patch: { species?: Species; name?: string }) {
    if (!row || !user) return
    const next = { ...row, ...patch }
    setRow(next)
    setSaveError(null)
    const { error } = await supabase
      .from('companions')
      .update({
        ...(patch.species ? { species: patch.species } : {}),
        ...(patch.name ? { name: patch.name } : {}),
      })
      .eq('user_id', user.id)
    if (error) {
      // Roll back local state if the DB rejected the write.
      setRow(row)
      setSaveError(error.message)
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-sm text-on-surface-variant">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Companion</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Admin POC. Non-AI: tap your companion for a thought. Free tier only for now.
        </p>
      </div>

      <div className="bg-surface-container-lowest ghost-border rounded-2xl p-6 md:p-8">
        {loading || !row || !Animal ? (
          <div className="text-center text-sm text-on-surface-variant py-12">Waking up…</div>
        ) : (
          <>
            <div className={`${styles.bubble} ${!message ? styles.empty : ''}`} aria-live="polite">
              {message || `${row.name} is thinking…`}
            </div>
            <button
              type="button"
              onClick={() => setMessage(pickMessage(row.species, context))}
              className={styles.stage}
              aria-label={`Tap ${row.name} to talk`}
              style={{ display: 'block', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
            >
              <Animal />
            </button>
            <p className="text-center text-xs text-on-surface-variant mt-2">tap to talk</p>
          </>
        )}
      </div>

      {row && stageInfo && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Stage</p>
            <p className="text-base font-semibold text-on-surface capitalize">{stageInfo.label}</p>
          </div>
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Age</p>
            <p className="text-base font-semibold text-on-surface">{stageInfo.ageDays}d</p>
          </div>
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Next stage</p>
            <p className="text-base font-semibold text-on-surface">
              {stageInfo.nextStageAt === null ? '—' : `${stageInfo.nextStageAt - stageInfo.ageDays}d`}
            </p>
          </div>
        </div>
      )}

      {row && (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="companion-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Name
            </label>
            <input
              id="companion-name"
              type="text"
              value={row.name}
              maxLength={32}
              onChange={(e) => setRow({ ...row, name: e.target.value })}
              onBlur={() => {
                const trimmed = row.name.trim()
                if (trimmed && trimmed !== DEFAULT_NAME) update({ name: trimmed })
                else if (!trimmed) setRow({ ...row, name: DEFAULT_NAME })
              }}
              className="w-full max-w-xs px-3 py-2 rounded-lg ghost-border bg-surface-container-lowest text-sm focus:outline-none focus:border-primary/40"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Look
            </span>
            <div className="flex flex-wrap gap-2">
              {SPECIES_ORDER.map((sp) => {
                const active = row.species === sp
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

          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 ghost-border rounded-lg px-3 py-2">
              Save failed: {saveError}
            </p>
          )}

          <p className="text-[11px] text-on-surface-variant max-w-md leading-relaxed">
            Companion persists in the `companions` Supabase table (RLS-scoped to your user_id). Growth is derived from the row's created_at on each visit.
          </p>
        </div>
      )}
    </div>
  )
}
