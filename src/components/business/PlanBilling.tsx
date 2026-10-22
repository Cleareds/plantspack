'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { PARTNER_FEATURES, PARTNER_PRICE } from '@/lib/business/plan'
import { track } from '@/lib/analytics'
import { useToolPlace } from './useToolPlace'

const FREE_TOOLS = [
  'Edit hours, address, website, phone and photos',
  'Reply to reviews',
  'Publish your menu from a photo or PDF',
  'Page views, saves and a monthly email summary',
  'Window sticker, table card and website badge',
]

export default function PlanBilling({ placeId }: { placeId: string }) {
  const { place, plan, isAdmin, error, reload } = useToolPlace(placeId)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [note, setNote] = useState('')

  if (error) return <p className="text-on-surface">{error}</p>
  if (!place || !plan) return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>

  const isPartner = plan.plan === 'partner'

  const checkout = async (interval: 'month' | 'year') => {
    setBusy(interval)
    setMessage(null)
    track('owner_tool_used', { tool: 'plan', action: `checkout_${interval}` })
    const r = await fetch(`/api/business/places/${placeId}/checkout`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interval }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    if (r?.ok && d.url) { window.location.href = d.url; return }
    setMessage({ kind: 'error', text: d.error || 'Checkout could not start.' })
    setBusy(null)
  }

  const adminPlan = async (action: 'grant' | 'revoke') => {
    setBusy(action)
    setMessage(null)
    const r = await fetch(`/api/business/places/${placeId}/plan`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setBusy(null)
    if (r?.ok) { setMessage({ kind: 'ok', text: action === 'grant' ? 'Partner plan granted.' : 'Partner plan ended.' }); reload() }
    else setMessage({ kind: 'error', text: d.error || 'Saving failed.' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Plan and billing</h1>
        <p className="text-on-surface-variant mt-1">{place.name}: {isPartner ? 'Partner plan' : 'free plan'}.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className={`rounded-2xl p-5 ${!isPartner ? 'ring-2 ring-primary/40' : 'ghost-border'} bg-surface-container-lowest`}>
          <h2 className="font-bold text-on-surface text-lg">Free</h2>
          <p className="text-sm text-on-surface-variant mb-3">For every verified owner.</p>
          <ul className="space-y-1.5 text-sm text-on-surface">
            {FREE_TOOLS.map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />{t}</li>)}
          </ul>
          {!isPartner && <p className="mt-4 text-sm font-medium text-primary">Your current plan</p>}
        </section>

        <section className={`rounded-2xl p-5 ${isPartner ? 'ring-2 ring-primary/40' : 'ghost-border'} bg-surface-container-lowest`}>
          <h2 className="font-bold text-on-surface text-lg">Partner</h2>
          <p className="text-sm text-on-surface-variant mb-3">€{PARTNER_PRICE.monthEur} a month, or €{PARTNER_PRICE.yearEur} a year. Everything in Free, plus:</p>
          <ul className="space-y-2 text-sm text-on-surface">
            {PARTNER_FEATURES.map((f) => (
              <li key={f.key} className="flex gap-2"><Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /><span><span className="font-medium">{f.title}.</span> {f.text}</span></li>
            ))}
          </ul>
          {isPartner ? (
            <p className="mt-4 text-sm font-medium text-primary">
              Your current plan{plan.source === 'admin' ? ', granted by PlantsPack' : plan.periodEnd ? `, renews ${new Date(plan.periodEnd).toLocaleDateString()}` : ''}.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => checkout('month')} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
                {busy === 'month' && <Loader2 className="h-4 w-4 animate-spin" />} €{PARTNER_PRICE.monthEur} a month
              </button>
              <button type="button" onClick={() => checkout('year')} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50">
                {busy === 'year' && <Loader2 className="h-4 w-4 animate-spin" />} €{PARTNER_PRICE.yearEur} a year
              </button>
            </div>
          )}
        </section>
      </div>

      <p className="flex items-start gap-2 text-sm text-on-surface-variant">
        <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        The Partner plan buys tools. It never changes your position in lists, your vegan level, your verification or your reviews. You can cancel at any time; the free tools stay.
      </p>

      {message && <div className={`p-3 rounded-xl text-sm ${message.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{message.text}</div>}

      {isAdmin && (
        <section className="rounded-2xl border border-dashed border-primary/50 p-5">
          <h2 className="font-semibold text-on-surface">Admin: grant the plan without payment</h2>
          <p className="text-sm text-on-surface-variant mt-1">For founding venues and tests. A plan paid through Stripe cannot be changed here.</p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note, for example: founding venue, sticker deal" className="mt-3 w-full max-w-md px-3 py-2 rounded-lg bg-surface-container-low ghost-border text-sm" />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => adminPlan('grant')} disabled={!!busy || isPartner} className="px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-40">Grant Partner plan</button>
            <button type="button" onClick={() => adminPlan('revoke')} disabled={!!busy || !isPartner || plan.source === 'stripe'} className="px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface disabled:opacity-40">End Partner plan</button>
          </div>
        </section>
      )}

      <p className="text-sm text-on-surface-variant">
        Questions about billing? Write to <a href="mailto:hello@plantspack.com" className="text-primary font-medium hover:underline">hello@plantspack.com</a>. <Link href={`/business/places/${placeId}`} className="text-primary font-medium hover:underline">Back to the dashboard</Link>
      </p>
    </div>
  )
}
