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
 * Companion POC, admin-only for now.
 *
 * Lifecycle model:
 *   - Each companion has a fixed lifespan_days (default 50).
 *   - "Alive" = ageDays < lifespan_days. Passed companions stay in the
 *     DB for history but don't count against the concurrency cap.
 *   - Stage is proportional to lifespan: baby <20%, juvenile 20-60%,
 *     adult 60-100%. Means stage thresholds scale automatically if
 *     we ever ship longer-lived tiers.
 *
 * Concurrency:
 *   - Admin: 3 simultaneous alive companions
 *   - Everyone else (when feature opens): 1
 *   - Once a companion passes, that slot frees up.
 *
 * Naming: this product is always "companion", never "pet". Internal
 * types, DB rows, UI copy.
 */

interface CompanionRow {
  id: string
  user_id: string
  species: Species
  name: string
  created_at: string
  lifespan_days: number
}

type Stage = 'baby' | 'juvenile' | 'adult' | 'passed'

interface StageInfo {
  stage: Stage
  ageDays: number
  daysRemaining: number
  isAlive: boolean
  scale: number // visual scale to give a sense of growth without new art
}

function stageFromAge(createdAt: string, lifespanDays: number): StageInfo {
  const ms = Date.now() - new Date(createdAt).getTime()
  const ageDays = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
  const isAlive = ageDays < lifespanDays
  const daysRemaining = Math.max(0, lifespanDays - ageDays)
  if (!isAlive) return { stage: 'passed', ageDays, daysRemaining: 0, isAlive: false, scale: 1 }
  const pct = lifespanDays > 0 ? ageDays / lifespanDays : 0
  if (pct < 0.2) return { stage: 'baby', ageDays, daysRemaining, isAlive: true, scale: 0.7 }
  if (pct < 0.6) return { stage: 'juvenile', ageDays, daysRemaining, isAlive: true, scale: 0.85 }
  return { stage: 'adult', ageDays, daysRemaining, isAlive: true, scale: 1 }
}

const ANIMALS: Record<Species, () => ReactElement> = {
  chicken: Chicken,
  pig: Pig,
  cow: Cow,
}

const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const DEFAULT_LIFESPAN_DAYS = 50

function getMaxCompanions(userId: string): number {
  // For now, only admin can use this feature, and admin gets 3 slots.
  // When/if this opens to all users, free tier = 1, paid tiers TBD.
  if (userId === ADMIN_ID) return 3
  return 1
}

const SPECIES_DEFAULT_NAMES: Record<Species, string[]> = {
  chicken: ['Pip', 'Henrietta', 'Goldie', 'Coco', 'Maple'],
  pig: ['Truffle', 'Pearl', 'Hammond', 'Olive', 'Beans'],
  cow: ['Daisy', 'Buttercup', 'Clover', 'Patch', 'Moo'],
}

function pickDefaultName(species: Species, existingNames: string[]): string {
  const pool = SPECIES_DEFAULT_NAMES[species].filter((n) => !existingNames.includes(n))
  const list = pool.length ? pool : SPECIES_DEFAULT_NAMES[species]
  return list[Math.floor(Math.random() * list.length)]
}

export default function CompanionClient() {
  const { user } = useAuth()
  const [allCompanions, setAllCompanions] = useState<CompanionRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [context, setContext] = useState<CompanionContext>({})
  const [messageByCompanion, setMessageByCompanion] = useState<Record<string, string>>({})

  // Adoption-flow state
  const [adoptOpen, setAdoptOpen] = useState(false)
  const [adoptSpecies, setAdoptSpecies] = useState<Species>('chicken')
  const [adoptName, setAdoptName] = useState('')

  const maxSlots = user ? getMaxCompanions(user.id) : 1

  const alive = useMemo(
    () => allCompanions.filter((c) => stageFromAge(c.created_at, c.lifespan_days).isAlive),
    [allCompanions],
  )
  const slotsFree = Math.max(0, maxSlots - alive.length)
  const active = useMemo(() => alive.find((c) => c.id === activeId) || alive[0] || null, [alive, activeId])

  // Initial load
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('companions')
        .select('id, user_id, species, name, created_at, lifespan_days')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        setSaveError(error.message)
        setLoading(false)
        return
      }
      setAllCompanions((data || []) as CompanionRow[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

  // Default active = first alive companion
  useEffect(() => {
    if (!activeId && alive.length > 0) {
      setActiveId(alive[0].id)
    } else if (activeId && !alive.find((c) => c.id === activeId)) {
      // The active companion passed during the session — fall back.
      setActiveId(alive[0]?.id ?? null)
    }
  }, [alive, activeId])

  // Pull platform context once; messages use it across all companions.
  useEffect(() => {
    if (!user) return
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
        /* non-fatal */
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // Roll a message for the active companion when its species or the
  // shared platform context changes.
  useEffect(() => {
    if (!active) return
    setMessageByCompanion((prev) =>
      prev[active.id] ? prev : { ...prev, [active.id]: pickMessage(active.species, context) },
    )
  }, [active?.id, active?.species, context])

  async function updateActive(patch: { species?: Species; name?: string }) {
    if (!active || !user) return
    const next = { ...active, ...patch }
    setAllCompanions((prev) => prev.map((c) => (c.id === active.id ? next : c)))
    setSaveError(null)
    const { error } = await supabase
      .from('companions')
      .update({
        ...(patch.species ? { species: patch.species } : {}),
        ...(patch.name ? { name: patch.name } : {}),
      })
      .eq('id', active.id)
    if (error) {
      // Roll back local state on DB error
      setAllCompanions((prev) => prev.map((c) => (c.id === active.id ? active : c)))
      setSaveError(error.message)
    }
  }

  async function adopt() {
    if (!user) return
    const trimmedName = adoptName.trim() || pickDefaultName(adoptSpecies, alive.map((c) => c.name))
    setSaveError(null)
    const { data, error } = await supabase
      .from('companions')
      .insert({
        user_id: user.id,
        species: adoptSpecies,
        name: trimmedName,
        lifespan_days: DEFAULT_LIFESPAN_DAYS,
      })
      .select('id, user_id, species, name, created_at, lifespan_days')
      .single()
    if (error) {
      setSaveError(error.message)
      return
    }
    if (data) {
      const newRow = data as CompanionRow
      setAllCompanions((prev) => [...prev, newRow])
      setActiveId(newRow.id)
      setAdoptOpen(false)
      setAdoptName('')
    }
  }

  const ActiveAnimal = active ? ANIMALS[active.species] : null
  const activeStage = active ? stageFromAge(active.created_at, active.lifespan_days) : null
  const activeMessage = active ? messageByCompanion[active.id] : ''

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-sm text-on-surface-variant">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Companions</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Admin POC. Non-AI. Each companion lives {DEFAULT_LIFESPAN_DAYS} days.
          </p>
        </div>
        <div className="text-xs text-on-surface-variant text-right">
          <p className="font-medium">{alive.length} / {maxSlots} slots</p>
          {slotsFree > 0 && (
            <p className="text-primary">{slotsFree} free</p>
          )}
        </div>
      </div>

      {/* Carousel: thumbnails for each alive companion + an empty adopt slot */}
      <div className="flex flex-wrap gap-2 mb-4">
        {alive.map((c) => {
          const Sp = ANIMALS[c.species]
          const isActive = active?.id === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ghost-border ${
                isActive
                  ? 'border-primary/40 bg-primary/5'
                  : 'bg-surface-container-lowest hover:border-primary/20'
              }`}
            >
              <span className="block w-7 h-7"><Sp /></span>
              <span className="font-medium text-on-surface">{c.name}</span>
            </button>
          )
        })}
        {slotsFree > 0 && !adoptOpen && (
          <button
            type="button"
            onClick={() => {
              setAdoptOpen(true)
              setAdoptSpecies('chicken')
              setAdoptName(pickDefaultName('chicken', alive.map((c) => c.name)))
            }}
            className="px-3 py-2 rounded-xl text-sm font-medium ghost-border text-primary hover:border-primary/40"
          >
            + Adopt
          </button>
        )}
      </div>

      {/* Adoption form */}
      {adoptOpen && (
        <div className="mb-6 bg-primary/5 ghost-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface">Adopt a new companion</h2>
            <button
              type="button"
              onClick={() => { setAdoptOpen(false); setAdoptName('') }}
              className="text-xs text-on-surface-variant hover:text-on-surface"
            >
              cancel
            </button>
          </div>
          <div>
            <span className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Species</span>
            <div className="flex flex-wrap gap-2">
              {SPECIES_ORDER.map((sp) => {
                const sel = adoptSpecies === sp
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      setAdoptSpecies(sp)
                      setAdoptName(pickDefaultName(sp, alive.map((c) => c.name)))
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      sel ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-lowest text-on-surface ghost-border hover:border-primary/30'
                    }`}
                    aria-pressed={sel}
                  >
                    {SPECIES_LABEL[sp]}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label htmlFor="adopt-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">Name</label>
            <input
              id="adopt-name"
              type="text"
              value={adoptName}
              maxLength={32}
              placeholder={pickDefaultName(adoptSpecies, alive.map((c) => c.name))}
              onChange={(e) => setAdoptName(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg ghost-border bg-surface-container-lowest text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={adopt}
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary-btn text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Welcome them home
          </button>
        </div>
      )}

      {/* Active companion stage */}
      <div className="bg-surface-container-lowest ghost-border rounded-2xl p-6 md:p-8">
        {loading ? (
          <div className="text-center text-sm text-on-surface-variant py-12">Waking up…</div>
        ) : !active || !ActiveAnimal || !activeStage ? (
          <div className="text-center py-12">
            <p className="text-sm text-on-surface-variant mb-4">No companions yet.</p>
            {!adoptOpen && (
              <button
                type="button"
                onClick={() => {
                  setAdoptOpen(true)
                  setAdoptSpecies('chicken')
                  setAdoptName(pickDefaultName('chicken', []))
                }}
                className="px-5 py-2.5 rounded-full bg-primary text-on-primary-btn text-sm font-bold hover:opacity-90"
              >
                Adopt your first companion
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`${styles.bubble} ${!activeMessage ? styles.empty : ''}`} aria-live="polite">
              {activeMessage || `${active.name} is thinking…`}
            </div>
            <button
              type="button"
              onClick={() => setMessageByCompanion((p) => ({ ...p, [active.id]: pickMessage(active.species, context) }))}
              className={styles.stage}
              aria-label={`Tap ${active.name} to talk`}
              style={{
                display: 'block',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                padding: 0,
                transform: `scale(${activeStage.scale})`,
                transformOrigin: 'center bottom',
                transition: 'transform 600ms ease-in-out',
              }}
            >
              <ActiveAnimal />
            </button>
            <p className="text-center text-xs text-on-surface-variant mt-2">tap to talk</p>
          </>
        )}
      </div>

      {/* Active companion stats */}
      {active && activeStage && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Stage</p>
            <p className="text-base font-semibold text-on-surface capitalize">{activeStage.stage}</p>
          </div>
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Age</p>
            <p className="text-base font-semibold text-on-surface">{activeStage.ageDays}d</p>
          </div>
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Days left</p>
            <p className="text-base font-semibold text-on-surface">{activeStage.daysRemaining}d</p>
          </div>
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Lifespan</p>
            <p className="text-base font-semibold text-on-surface">{active.lifespan_days}d</p>
          </div>
        </div>
      )}

      {/* Active companion edit */}
      {active && activeStage?.isAlive && (
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="companion-name" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
              Name
            </label>
            <input
              id="companion-name"
              type="text"
              value={active.name}
              maxLength={32}
              onChange={(e) =>
                setAllCompanions((prev) => prev.map((c) => (c.id === active.id ? { ...c, name: e.target.value } : c)))
              }
              onBlur={() => {
                const trimmed = active.name.trim()
                if (trimmed) updateActive({ name: trimmed })
                else
                  setAllCompanions((prev) =>
                    prev.map((c) => (c.id === active.id ? { ...c, name: pickDefaultName(c.species, []) } : c)),
                  )
              }}
              className="w-full max-w-xs px-3 py-2 rounded-lg ghost-border bg-surface-container-lowest text-sm focus:outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Look</span>
            <div className="flex flex-wrap gap-2">
              {SPECIES_ORDER.map((sp) => {
                const a = active.species === sp
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => updateActive({ species: sp })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      a ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-lowest text-on-surface ghost-border hover:border-primary/30'
                    }`}
                    aria-pressed={a}
                  >
                    {SPECIES_LABEL[sp]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {saveError && (
        <p className="mt-4 text-xs text-red-600 bg-red-50 ghost-border rounded-lg px-3 py-2">
          Save failed: {saveError}
        </p>
      )}

      <p className="mt-6 text-[11px] text-on-surface-variant max-w-md leading-relaxed">
        Companions are stored in Supabase (RLS-scoped to your user). After {DEFAULT_LIFESPAN_DAYS} days each one passes and frees its slot; their row stays in the DB for history.
      </p>
    </div>
  )
}
