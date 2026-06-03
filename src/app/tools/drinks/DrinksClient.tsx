'use client'

import { useMemo, useState } from 'react'
import { Search, CheckCircle2, AlertCircle, HelpCircle, Wine, Beer, Martini, GlassWater } from 'lucide-react'
import {
  VEGAN_DRINKS,
  DRINK_KINDS,
  type Drink,
  type DrinkKind,
} from '@/lib/vegan-drinks-data'

const STATUS_THEME = {
  vegan: { Icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-700', label: 'Vegan' },
  not_vegan: { Icon: AlertCircle, badge: 'bg-error/15 text-error', label: 'Not vegan' },
  varies: { Icon: HelpCircle, badge: 'bg-warning/15 text-warning', label: 'Varies' },
} as const

const KIND_ICON: Record<DrinkKind, typeof Wine> = {
  beer: Beer,
  wine: Wine,
  spirit: Martini,
  liqueur: Martini,
  cider: GlassWater,
  mixer: GlassWater,
}

export default function DrinksClient() {
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<DrinkKind | 'all'>('all')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VEGAN_DRINKS.filter((d) => {
      if (kindFilter !== 'all' && d.kind !== kindFilter) return false
      if (!q) return true
      const hay = `${d.name} ${d.brand ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [query, kindFilter])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-5 md:p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Guinness, Stella, Hendrick's..."
            className="w-full pl-9 pr-3 py-3 rounded-xl ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKindFilter('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              kindFilter === 'all'
                ? 'bg-primary text-on-primary'
                : 'ghost-border bg-surface text-on-surface-variant hover:border-primary/30'
            }`}
          >
            All
          </button>
          {DRINK_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKindFilter(k.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                kindFilter === k.key
                  ? 'bg-primary text-on-primary'
                  : 'ghost-border bg-surface text-on-surface-variant hover:border-primary/30'
              }`}
            >
              {k.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-on-surface-variant self-center">
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="p-5 rounded-2xl ghost-border bg-surface-container-lowest text-center">
          <p className="text-sm text-on-surface mb-3">
            We don&apos;t have <strong>{query || 'that one'}</strong> in our curated list yet.
          </p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Our list focuses on confirmed mainstream brands. Check the producer&apos;s website or look for a Vegan Society / V-Label mark on the bottle.{' '}
            <a
              href={`mailto:hello@plantspack.com?subject=Add%20drink%20to%20PlantsPack&body=Brand%20%2F%20product%3A%20${encodeURIComponent(query)}%0A%0ALink%20to%20manufacturer%20vegan%20statement%3A%0A`}
              className="text-primary underline"
            >
              Suggest a brand
            </a>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((d: Drink, idx) => {
            const theme = STATUS_THEME[d.status]
            const KindIcon = KIND_ICON[d.kind]
            return (
              <li key={`${d.name}-${idx}`} className="flex gap-3 p-4 rounded-xl ghost-border bg-surface-container-lowest">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <KindIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-on-surface">{d.name}</div>
                      {d.brand && d.brand !== d.name && (
                        <div className="text-xs text-on-surface-variant">{d.brand}</div>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${theme.badge}`}>
                      <theme.Icon className="h-3 w-3" />
                      {theme.label}
                    </span>
                  </div>
                  {d.note && (
                    <div className="text-xs text-on-surface-variant mt-1 leading-relaxed">{d.note}</div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="p-4 rounded-xl bg-surface-container-lowest ghost-border text-xs text-on-surface-variant leading-relaxed">
        <strong className="text-on-surface">About this list.</strong> Curated against manufacturer public statements, Vegan Society / V-Label certifications, and historical Barnivore data. We deliberately ship a small, reliable set rather than an auto-imported list with stale claims. Always double-check the bottle for a vegan certification mark — recipes change.
      </div>
    </div>
  )
}
