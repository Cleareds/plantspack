'use client'

import { useMemo, useState } from 'react'
import { Search, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { E_CODES, type ECode } from '@/lib/e-codes'

const STATUS_THEME = {
  vegan: { Icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-700', label: 'Vegan' },
  non_vegan: { Icon: AlertCircle, badge: 'bg-error/15 text-error', label: 'Not vegan' },
  maybe: { Icon: HelpCircle, badge: 'bg-warning/15 text-warning', label: 'Maybe' },
} as const

export default function ECodeSearch() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'vegan' | 'non_vegan' | 'maybe'>('all')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '')
    return E_CODES.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false
      if (!q) return true
      return (
        e.code.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q)
      )
    })
  }, [query, filter])

  return (
    <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5 mb-8">
      <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">Search the list</div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a code (E471) or a name (lecithin, gelatin)..."
          className="w-full pl-9 pr-3 py-3 rounded-xl ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'non_vegan', 'maybe', 'vegan'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              filter === f
                ? 'bg-primary text-on-primary'
                : 'ghost-border bg-surface text-on-surface-variant hover:border-primary/30'
            }`}
          >
            {f === 'all' ? 'All' : f === 'non_vegan' ? 'Not vegan' : f === 'maybe' ? 'Maybe' : 'Vegan'}
          </button>
        ))}
        <span className="ml-auto text-xs text-on-surface-variant self-center">
          {results.length} of {E_CODES.length}
        </span>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          No matches. Our list focuses on the additives a vegan or allergic consumer is realistically going to encounter on a packaged-food label.
        </p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map((e: ECode) => {
            const theme = STATUS_THEME[e.status]
            return (
              <li key={e.code} className="flex gap-3 p-3 rounded-lg bg-surface ghost-border">
                <span className={`mt-0.5 inline-flex items-center justify-center w-14 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${theme.badge}`}>
                  {e.code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-on-surface">{e.name}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{e.note}</div>
                  {e.allergen && (
                    <div className="text-[10px] uppercase tracking-wider font-bold text-warning mt-1">
                      Allergen: {e.allergen}
                    </div>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold self-start mt-1 text-on-surface-variant">{theme.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
