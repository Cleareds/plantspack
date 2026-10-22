'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface Data {
  place: { name: string; city: string | null }
  weeks: Array<{ start: string; views: number; saves: number }>
  views30: number
  cityMedian30: number | null
  taps: Record<'directions' | 'website' | 'phone' | 'menu', { last30: number; prev30: number }>
  reviews: { total: number; average: number | null; last30: number }
}

const TAP_LABEL = { directions: 'Directions', website: 'Website', phone: 'Phone' } as const

function WeekBars({ weeks, field, label }: { weeks: Data['weeks']; field: 'views' | 'saves'; label: string }) {
  const max = Math.max(1, ...weeks.map((w) => w[field]))
  const total = weeks.reduce((s, w) => s + w[field], 0)
  return (
    <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-on-surface">{label}, last 12 weeks</h2>
        <span className="text-sm text-on-surface-variant">{total.toLocaleString()} in total</span>
      </div>
      <div className="mt-4 flex items-end gap-1.5 h-32" role="img" aria-label={`${label} per week for the last 12 weeks`}>
        {weeks.map((w) => (
          <div key={w.start} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-on-surface-variant mb-1">{w[field] || ''}</span>
            <div className="w-full rounded-t bg-primary/70" style={{ height: `${(w[field] / max) * 100}%`, minHeight: w[field] ? 3 : 1 }} title={`Week of ${w.start}: ${w[field]}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-on-surface-variant mt-1">
        <span>{new Date(weeks[0].start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>This week</span>
      </div>
    </section>
  )
}

function change(now: number, before: number): string {
  if (before === 0) return now > 0 ? 'new' : ''
  const pct = Math.round(((now - before) / before) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export default function Insights({ placeId }: { placeId: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    fetch(`/api/business/places/${placeId}/insights`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 402) { setLocked(true); return }
        if (!r.ok) { setError(d.error || 'Stats could not be loaded.'); return }
        setData(d)
      })
      .catch(() => setError('Stats could not be loaded.'))
  }, [placeId])

  if (locked) {
    return (
      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Detailed stats are part of the Partner plan</h1>
        <p className="text-on-surface-variant mb-4">See 12-week trends, taps on directions, website and phone, and how you compare with your city.</p>
        <Link href={`/business/places/${placeId}/plan`} className="inline-flex px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">See the Partner plan</Link>
      </div>
    )
  }
  if (error) return <p className="text-on-surface">{error}</p>
  if (!data) return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading your stats...</div>

  const vsCity = data.cityMedian30 && data.cityMedian30 > 0 ? data.views30 / data.cityMedian30 : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Detailed stats</h1>
        <p className="text-on-surface-variant mt-1">{data.place.name}. Page views count visits on our website and app since 30 July 2026; taps are counted since October 2026.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-4">
          <div className="text-2xl font-extrabold text-on-surface">{data.views30.toLocaleString()}</div>
          <div className="text-sm text-on-surface-variant">page views, last 30 days</div>
        </div>
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-4">
          <div className="text-2xl font-extrabold text-on-surface">{vsCity === null ? '–' : vsCity >= 1 ? `${vsCity.toFixed(1)}×` : `${Math.round(vsCity * 100)}%`}</div>
          <div className="text-sm text-on-surface-variant">
            {vsCity === null ? `Not enough data for ${data.place.city || 'your city'} yet` : `of a typical place in ${data.place.city} (median ${Math.round(data.cityMedian30!)} views)`}
          </div>
        </div>
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-4">
          <div className="text-2xl font-extrabold text-on-surface">{data.reviews.average ? data.reviews.average.toFixed(1) : '–'}</div>
          <div className="text-sm text-on-surface-variant">average rating, {data.reviews.total} review{data.reviews.total === 1 ? '' : 's'} ({data.reviews.last30} in the last 30 days)</div>
        </div>
      </div>

      <WeekBars weeks={data.weeks} field="views" label="Page views" />

      <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
        <h2 className="font-semibold text-on-surface">Taps on your page, last 30 days</h2>
        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant"><th className="font-medium py-1">Action</th><th className="font-medium py-1 text-right">Last 30 days</th><th className="font-medium py-1 text-right">30 days before</th><th className="font-medium py-1 text-right">Change</th></tr>
          </thead>
          <tbody>
            {(Object.keys(TAP_LABEL) as Array<keyof typeof TAP_LABEL>).map((k) => (
              <tr key={k} className="border-t border-outline-variant/15">
                <td className="py-2 text-on-surface">{TAP_LABEL[k]}</td>
                <td className="py-2 text-right font-semibold text-on-surface">{data.taps[k].last30}</td>
                <td className="py-2 text-right text-on-surface-variant">{data.taps[k].prev30}</td>
                <td className="py-2 text-right text-on-surface-variant">{change(data.taps[k].last30, data.taps[k].prev30)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <WeekBars weeks={data.weeks} field="saves" label="New saves" />
    </div>
  )
}
