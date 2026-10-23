'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, Loader2, ShoppingBag } from 'lucide-react'
import { track } from '@/lib/analytics'

export default function ButtonsEditor({ placeId }: { placeId: string }) {
  const [booking, setBooking] = useState('')
  const [order, setOrder] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'error'>('loading')
  const [isPartner, setIsPartner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/business/places/${placeId}/buttons`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 402) { setState('locked'); return }
        if (!r.ok) { setState('error'); return }
        setBooking(d.booking_url || '')
        setOrder(d.order_url || '')
        setIsPartner(!!d.isPartner)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [placeId])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const r = await fetch(`/api/business/places/${placeId}/buttons`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_url: booking, order_url: order }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setSaving(false)
    if (!r?.ok) { setMsg({ kind: 'error', text: d.error || 'Saving failed.' }); return }
    track('owner_tool_used', { tool: 'buttons', action: 'save' })
    setMsg({ kind: 'ok', text: 'Saved. The buttons show on your page within a minute.' })
  }

  if (state === 'loading') return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
  if (state === 'error') return <p className="text-on-surface">This page could not be loaded. Please refresh.</p>
  if (state === 'locked') {
    return (
      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Booking and order buttons are part of the Partner plan</h1>
        <p className="text-on-surface-variant mb-4">Add &quot;Book a table&quot; and &quot;Order online&quot; buttons to your page, linked to your own booking or ordering system.</p>
        <Link href={`/business/places/${placeId}/plan`} className="inline-flex px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">See the Partner plan</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Booking and order buttons</h1>
        <p className="text-on-surface-variant mt-1">Link your own booking page or online ordering. The buttons show on your PlantsPack page and in the app. Leave a field empty to hide that button.</p>
        {!isPartner && <p className="mt-2 text-sm text-on-surface-variant">Admin: this place has no Partner plan, so the buttons are saved but not shown publicly.</p>}
      </div>
      <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5 space-y-4">
        <label className="block text-sm text-on-surface">
          Booking link (for &quot;Book a table&quot;)
          <input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="https://your-booking-page" className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
        </label>
        <label className="block text-sm text-on-surface">
          Ordering link (for &quot;Order online&quot;)
          <input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="https://your-online-ordering" className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-sm text-on-surface-variant self-center">Preview:</span>
          {booking.trim() && <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium"><CalendarCheck className="h-4 w-4" /> Book a table</span>}
          {order.trim() && <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface"><ShoppingBag className="h-4 w-4" /> Order online</span>}
          {!booking.trim() && !order.trim() && <span className="text-sm text-on-surface-variant self-center">no buttons</span>}
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </section>
      {msg && <div className={`p-3 rounded-xl text-sm ${msg.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}
    </div>
  )
}
