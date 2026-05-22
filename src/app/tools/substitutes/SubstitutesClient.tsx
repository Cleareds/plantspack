'use client'

import { useMemo, useState } from 'react'
import { Search, ArrowRight, AlertTriangle } from 'lucide-react'
import { SUBSTITUTES, CATEGORIES, type SubCategory } from './substitutes-data'

export default function SubstitutesClient() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SubCategory | 'all'>('all')

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
          {filtered.map((entry) => (
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
                {entry.subs.map((s, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-on-surface">{s.swap}</div>
                      <div className="text-sm text-on-surface-variant leading-relaxed">{s.notes}</div>
                      {s.bestFor && (
                        <div className="text-xs text-on-surface-variant mt-0.5">
                          <span className="font-semibold">Best for:</span> {s.bestFor}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
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
