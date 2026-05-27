'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowRight, AlertTriangle, ShieldAlert } from 'lucide-react'
import { SUBSTITUTES, CATEGORIES, type SubCategory, type Substitute } from './substitutes-data'
import AllergenSelector from '../_components/AllergenSelector'

// Inline keyword map — same allergen vocabulary as
// src/app/api/tools/barcode ALLERGEN_KEYWORDS. Kept here as a closed
// helper so a single substitute string like "Cashew cheese" gets
// flagged for nut allergies without per-entry tagging.
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  nuts: ['almond', 'cashew', 'hazelnut', 'walnut', 'pecan', 'pistachio', 'macadamia', 'brazil nut', 'pine nut'],
  peanuts: ['peanut'],
  soy: ['soy', 'soja', 'tofu', 'tempeh', 'edamame'],
  gluten: ['wheat', 'barley', 'rye', 'spelt', 'seitan', 'vital wheat'],
  sesame: ['sesame', 'tahini'],
  coconut: ['coconut'],
  corn: ['corn ', 'cornstarch', 'corn starch', 'high-fructose'],
}

function swapAllergens(swap: string, notes: string): string[] {
  const hay = (swap + ' ' + notes).toLowerCase()
  const hits: string[] = []
  for (const [allergen, kws] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (kws.some(k => hay.includes(k))) hits.push(allergen)
  }
  return hits
}

export default function SubstitutesClient() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SubCategory | 'all'>('all')
  const [allergens, setAllergens] = useState<string[]>([])
  const [allergensFromProfile, setAllergensFromProfile] = useState(false)

  // Pull profile allergens once; cross-tool reuse via the same endpoint
  // backing barcode + ingredient + menu + cards.
  useEffect(() => {
    fetch('/api/tools/allergens')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.allergens) && data.allergens.length > 0) {
          setAllergens(data.allergens)
          setAllergensFromProfile(true)
        }
      })
      .catch(() => {})
  }, [])

  const setAndPersistAllergens = async (next: string[]) => {
    setAllergens(next)
    setAllergensFromProfile(false)
    try {
      const r = await fetch('/api/tools/allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergens: next }),
      })
      if (r.ok) setAllergensFromProfile(true)
    } catch { /* non-blocking */ }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SUBSTITUTES.filter((entry) => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) return false
      if (!q) return true
      const haystack = [entry.name, ...(entry.aliases ?? []), entry.context ?? '', ...entry.subs.flatMap((s) => [s.swap, s.notes, s.bestFor ?? ''])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [query, activeCategory])

  return (
    <div>
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ingredient (milk, gelatin, egg in baking...)"
          className="w-full pl-10 pr-4 py-3 rounded-xl ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary"
        />
      </div>

      {/* Allergen profile — shared across tools, so the user only tells
          us once. Substitutes that contain a flagged allergen get a
          warning badge and are listed last within their entry. */}
      <div className="mb-4">
        <AllergenSelector
          value={allergens}
          onChange={setAndPersistAllergens}
          savedRemote={allergensFromProfile}
        />
        {allergens.length > 0 && (
          <p className="text-xs text-on-surface-variant mt-2">
            Substitutes containing {allergens.join(', ')} will be flagged below.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <CatBtn active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="All" />
        {CATEGORIES.map((c) => (
          <CatBtn
            key={c.key}
            active={activeCategory === c.key}
            onClick={() => setActiveCategory(c.key)}
            label={c.label}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-on-surface-variant text-center py-8">
          No substitutes match &quot;{query}&quot;. Try a more generic term (e.g. &quot;cheese&quot; instead of a brand name).
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => {
            // Sort allergen-safe swaps first so the user sees usable
            // options at the top of each entry.
            const ranked = [...entry.subs].sort((a, b) => {
              const aHit = swapAllergens(a.swap, a.notes).some(x => allergens.includes(x))
              const bHit = swapAllergens(b.swap, b.notes).some(x => allergens.includes(x))
              return (aHit ? 1 : 0) - (bHit ? 1 : 0)
            })
            return (
              <article key={entry.name} className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-5 md:p-6">
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold text-on-surface">{entry.name}</h2>
                  {entry.context && <span className="text-xs text-on-surface-variant">({entry.context})</span>}
                </div>

                {entry.warning && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 text-sm text-on-surface mb-3">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <span>{entry.warning}</span>
                  </div>
                )}

                <div className="space-y-2 mt-3">
                  {ranked.map((s, i) => <SwapRow key={i} swap={s} userAllergens={allergens} />)}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SwapRow({ swap, userAllergens }: { swap: Substitute; userAllergens: string[] }) {
  const swapAls = swapAllergens(swap.swap, swap.notes)
  const conflicts = swapAls.filter(a => userAllergens.includes(a))
  const hasConflict = conflicts.length > 0
  return (
    <div className={`flex gap-3 items-start ${hasConflict ? 'opacity-60' : ''}`}>
      <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-on-surface">{swap.swap}</span>
          {hasConflict && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded bg-warning/15 text-warning">
              <ShieldAlert className="h-3 w-3" />
              Contains {conflicts.join(', ')}
            </span>
          )}
        </div>
        <div className="text-sm text-on-surface-variant leading-relaxed">{swap.notes}</div>
        {swap.bestFor && (
          <div className="text-xs text-on-surface-variant mt-0.5">
            <span className="font-semibold">Best for:</span> {swap.bestFor}
          </div>
        )}
      </div>
    </div>
  )
}

function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
        active ? 'bg-primary text-on-primary' : 'ghost-border bg-surface text-on-surface hover:border-primary/30'
      }`}
    >
      {label}
    </button>
  )
}
