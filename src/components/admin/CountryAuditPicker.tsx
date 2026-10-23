'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { toSlug } from '@/lib/slug'

type Row = {
  country: string
  total: number
  fully_vegan: number
  fv_checked: number
  mostly_vegan: number
  checked: number
  human_verified: number
  no_website: number
  no_image: number
  odd_city: number
  community: number
  last_verified_at: string | null
  cities: number
}

type SortKey = 'work' | 'total' | 'fv' | 'checked' | 'audit' | 'name'

const DEFAULT_LIMIT = 24

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0
}

function daysAgo(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/**
 * Country audits panel on /admin/data-quality. Lists EVERY country with a
 * live place (from /api/admin/data-quality/countries) ordered by open
 * work: fully-vegan rows nobody has checked yet. Search opens any country;
 * the audit page itself works for any slug.
 */
export default function CountryAuditPicker() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('work')
  const [showAll, setShowAll] = useState(false)

  const load = async (refresh = false) => {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/data-quality/countries${refresh ? '?refresh=1' : ''}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const j = await res.json()
      setRows(j.countries || [])
    } catch (e: any) {
      setErr(e?.message || 'failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    let list = needle ? rows.filter(r => r.country.toLowerCase().includes(needle)) : rows.slice()
    const work = (r: Row) => r.fully_vegan - r.fv_checked
    list.sort((a, b) => {
      switch (sort) {
        case 'total': return b.total - a.total
        case 'fv': return b.fully_vegan - a.fully_vegan
        case 'checked': return pct(b.checked, b.total) - pct(a.checked, a.total) || b.checked - a.checked
        case 'audit': return (b.last_verified_at || '').localeCompare(a.last_verified_at || '')
        case 'name': return a.country.localeCompare(b.country)
        default: return work(b) - work(a) || b.total - a.total
      }
    })
    if (!needle && !showAll) list = list.slice(0, DEFAULT_LIMIT)
    return list
  }, [rows, q, sort, showAll])

  const totals = useMemo(() => {
    if (!rows) return null
    return rows.reduce((acc, r) => ({
      countries: acc.countries + 1,
      total: acc.total + r.total,
      fv: acc.fv + r.fully_vegan,
      fvChecked: acc.fvChecked + r.fv_checked,
      human: acc.human + r.human_verified,
      odd: acc.odd + r.odd_city,
    }), { countries: 0, total: 0, fv: 0, fvChecked: 0, human: 0, odd: 0 })
  }, [rows])

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSort(k)}
      className={`px-2 py-0.5 rounded text-[11px] ${sort === k ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
      {label}
    </button>
  )

  return (
    <div className="mb-6 rounded-2xl bg-gray-900/40 border border-gray-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Country audits</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Every country with a live place. Ordered by open work: fully-vegan rows no admin has checked.
            {totals && (
              <> {totals.countries} countries · {totals.total.toLocaleString()} places · fully vegan {totals.fvChecked.toLocaleString()}/{totals.fv.toLocaleString()} checked · {totals.human} human-verified · {totals.odd} odd city labels.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/data-quality/countries" target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-emerald-400" title="JSON: this rollup">JSON ↗</a>
          <button onClick={() => load(true)} disabled={loading}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a country (Ukraine, Poland, ...)"
            className="pl-7 pr-2 py-1 w-64 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-600" />
        </label>
        <span className="text-[11px] text-gray-500 ml-1">Sort:</span>
        <SortBtn k="work" label="Open FV work" />
        <SortBtn k="total" label="Places" />
        <SortBtn k="fv" label="Fully vegan" />
        <SortBtn k="checked" label="% checked" />
        <SortBtn k="audit" label="Last audit" />
        <SortBtn k="name" label="A-Z" />
        {!q && rows && rows.length > DEFAULT_LIMIT && (
          <button onClick={() => setShowAll(v => !v)} className="ml-auto text-[11px] text-emerald-400 hover:underline">
            {showAll ? `Show top ${DEFAULT_LIMIT}` : `Show all ${rows.length}`}
          </button>
        )}
      </div>

      {err && <p className="text-xs text-red-400 mb-2">Could not load: {err}</p>}
      {!rows && !err && <p className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading countries…</p>}

      {rows && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-900 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Country</th>
                <th className="px-2 py-1.5 text-right">Places</th>
                <th className="px-2 py-1.5 text-right">Cities</th>
                <th className="px-2 py-1.5 text-left">Fully vegan checked</th>
                <th className="px-2 py-1.5 text-right" title="rows with verification_level >= 3">Checked</th>
                <th className="px-2 py-1.5 text-right" title="is_verified = true (admin clicked Confirm)">Human ✓</th>
                <th className="px-2 py-1.5 text-right">No web</th>
                <th className="px-2 py-1.5 text-right">No img</th>
                <th className="px-2 py-1.5 text-right" title="city labels like 'Lviv Urban Hromada'">Odd city</th>
                <th className="px-2 py-1.5 text-right" title="rows added by members">Members</th>
                <th className="px-2 py-1.5 text-right">Last audit</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const open = r.fully_vegan - r.fv_checked
                const slug = toSlug(r.country)
                const ago = daysAgo(r.last_verified_at)
                const fvPct = pct(r.fv_checked, r.fully_vegan)
                return (
                  <tr key={r.country} className="border-t border-gray-800 hover:bg-gray-800/40">
                    <td className="px-2 py-1.5 text-gray-100 font-medium whitespace-nowrap">{r.country}</td>
                    <td className="px-2 py-1.5 text-right text-gray-300 tabular-nums">{r.total.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">{r.cities}</td>
                    <td className="px-2 py-1.5 min-w-[11rem]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded bg-gray-800 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${fvPct}%` }} />
                        </div>
                        <span className="text-gray-300 tabular-nums">{r.fv_checked}/{r.fully_vegan}</span>
                        {open > 0 && <span className="text-amber-400 tabular-nums" title="fully vegan, not yet checked">{open} open</span>}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-300 tabular-nums">{pct(r.checked, r.total)}%</td>
                    <td className="px-2 py-1.5 text-right text-emerald-400 tabular-nums">{r.human_verified}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">{r.no_website}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">{r.no_image}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${r.odd_city ? 'text-amber-400' : 'text-gray-500'}`}>{r.odd_city}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 tabular-nums">{r.community}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 whitespace-nowrap">{ago == null ? '—' : ago === 0 ? 'today' : `${ago} d`}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <div className="flex items-stretch rounded-md overflow-hidden">
                        <Link href={`/admin/data-quality/${slug}`} className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-medium">Audit →</Link>
                        <Link href={`/admin/data-quality/${slug}?vl=fully_vegan&verif=unverified`} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border-l border-gray-700" title="only unchecked fully-vegan rows">FV open</Link>
                        <a href={`/api/admin/data-quality/coverage/${slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border-l border-gray-700" title="JSON: fully-vegan coverage payload">JSON</a>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-2 py-3 text-gray-500">No country matches “{q}”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
