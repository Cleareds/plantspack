'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bricolage_Grotesque } from 'next/font/google'
import { Loader2, Printer, Send } from 'lucide-react'
import { track } from '@/lib/analytics'
import { FORMATS, PRINT_CSS, Sticker, TableCard, qrPath, qrTarget, type Format, type PlaceInfo } from './print-designs'

const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], weight: ['400', '600', '800'], display: 'swap' })

export default function PrintKit({ placeId }: { placeId: string }) {
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const [denied, setDenied] = useState<string | null>(null)
  const [format, setFormat] = useState<Format>('sticker')

  useEffect(() => {
    fetch(`/api/business/places/${placeId}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setDenied(d.error || 'You cannot open this page.'); return }
        setPlace(d.place)
      })
      .catch(() => setDenied('This page could not be loaded. Please refresh.'))
  }, [placeId])

  const qr = useMemo(() => (place ? qrPath(qrTarget(place)) : null), [place])

  if (denied) {
    return (
      <div className="mt-6 bg-surface-container-lowest rounded-2xl ghost-border p-8">
        <p className="text-on-surface mb-4">{denied}</p>
        <Link href="/business" className="text-primary font-medium hover:underline">How to claim your place</Link>
      </div>
    )
  }
  if (!place || !qr) {
    return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Preparing your QR code...</div>
  }

  return (
    <div className="mt-4 space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Sticker and table card</h1>
        <p className="text-on-surface-variant mt-1">
          The QR code opens your PlantsPack page. Choose a format, then print it or save it as a PDF.
        </p>
      </div>

      <div className="no-print flex flex-wrap gap-2" role="tablist" aria-label="Format">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={format === f.id}
            onClick={() => setFormat(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${format === f.id ? 'bg-primary text-on-primary-btn' : 'ghost-border text-on-surface hover:bg-surface-container-low'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="no-print text-sm text-on-surface-variant">{FORMATS.find((f) => f.id === format)!.hint} Print at 100% size, not &quot;fit to page&quot;.</p>

      <div className="pk-preview">
        <div className={`print-area pk-${format}`}>
          {format === 'sticker' && <Sticker place={place} qr={qr} uid="s0" fontFamily={bricolage.style.fontFamily} />}
          {format === 'card' && <TableCard place={place} qr={qr} fontClass={bricolage.className} />}
          {format === 'sheet' && Array.from({ length: 6 }, (_, i) => <Sticker key={i} place={place} qr={qr} uid={`s${i}`} fontFamily={bricolage.style.fontFamily} />)}
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { track('owner_tool_used', { tool: 'print', action: format }); window.print() }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium"
        >
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
        <a href={qrTarget(place)} target="_blank" rel="noopener" className="self-center text-sm text-primary font-medium hover:underline">Open the page the QR code leads to</a>
      </div>

      <StickerRequest placeId={place.id} />
    </div>
  )
}

function StickerRequest({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(2)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setState('sending')
    setError(null)
    const r = await fetch(`/api/business/places/${placeId}/sticker-request`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, address, note }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    if (r?.ok) {
      setState('sent')
      track('owner_tool_used', { tool: 'sticker_request', action: 'sent' })
    } else {
      setState('idle')
      setError(d.error || 'Sending failed. Please write to hello@plantspack.com.')
    }
  }

  return (
    <section className="no-print bg-surface-container-lowest rounded-2xl ghost-border p-5">
      <h2 className="font-semibold text-on-surface">Want a printed, weatherproof sticker?</h2>
      <p className="text-sm text-on-surface-variant mt-1">
        We print window stickers in small batches and post them to venues. Send us your address and we will reply by email.
      </p>
      {state === 'sent' ? (
        <p className="mt-3 text-sm font-medium text-primary">Request sent. We will reply by email.</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low">
          <Send className="h-4 w-4" /> Ask for stickers
        </button>
      ) : (
        <div className="mt-4 space-y-3 max-w-lg">
          <label className="block text-sm text-on-surface">
            How many
            <input type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-24 block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <label className="block text-sm text-on-surface">
            Postal address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={4} className="mt-1 w-full block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          <label className="block text-sm text-on-surface">
            Note (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full block px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" onClick={send} disabled={state === 'sending' || address.trim().length < 10} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
            {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />} Send request
          </button>
        </div>
      )}
    </section>
  )
}

