'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Loader2, Printer, Send } from 'lucide-react'
import { track } from '@/lib/analytics'

interface PlaceInfo { id: string; slug: string | null; name: string; city: string | null }
type Format = 'sticker' | 'card' | 'sheet'

const FORMATS: Array<{ id: Format; label: string; hint: string }> = [
  { id: 'sticker', label: 'Window sticker', hint: 'One round sticker, 8 cm. Print on sticker paper.' },
  { id: 'card', label: 'Table card', hint: 'A6 card for tables or the counter. Print on thick paper.' },
  { id: 'sheet', label: 'Sheet of 6 stickers', hint: 'Six 8 cm stickers on one A4 sticker sheet.' },
]

// The QR always points at www (no apex redirect) and carries UTM tags so
// scans show up in analytics. Place pages ignore query strings, so the
// cached page is served.
function qrTarget(place: PlaceInfo) {
  return `https://www.plantspack.com/place/${place.slug || place.id}?utm_source=qr&utm_medium=sticker`
}

function Sticker({ place, qr }: { place: PlaceInfo; qr: string }) {
  return (
    <div className="pk-sticker">
      <div className="pk-sticker-top">Find us on</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/plantspack-logo-real.svg" alt="" className="pk-sticker-logo" />
      <div className="pk-wordmark">PlantsPack</div>
      <div className="pk-qr pk-qr-sticker" dangerouslySetInnerHTML={{ __html: qr }} />
      <div className="pk-sticker-name">{place.name}</div>
      <div className="pk-sticker-hint">Scan for our page and reviews</div>
    </div>
  )
}

function TableCard({ place, qr }: { place: PlaceInfo; qr: string }) {
  return (
    <div className="pk-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/plantspack-logo-real.svg" alt="" className="pk-card-logo" />
      <div className="pk-wordmark pk-wordmark-card">PlantsPack</div>
      <div className="pk-card-name">{place.name}</div>
      <div className="pk-qr pk-qr-card" dangerouslySetInnerHTML={{ __html: qr }} />
      <div className="pk-card-text">Scan to see our page, menu and reviews.</div>
      <div className="pk-card-text">Enjoyed your visit? Leave a review.</div>
    </div>
  )
}

export default function PrintKit({ placeId }: { placeId: string }) {
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const [denied, setDenied] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [format, setFormat] = useState<Format>('sticker')

  useEffect(() => {
    fetch(`/api/business/places/${placeId}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) { setDenied(d.error || 'You cannot open this page.'); return }
        setPlace(d.place)
        const svg = await QRCode.toString(qrTarget(d.place), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#14532d', light: '#ffffff' } })
        setQr(svg)
      })
      .catch(() => setDenied('This page could not be loaded. Please refresh.'))
  }, [placeId])

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

      <div className="no-print flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormat(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${format === f.id ? 'bg-primary text-on-primary-btn' : 'ghost-border text-on-surface hover:bg-surface-container-low'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="no-print text-sm text-on-surface-variant">{FORMATS.find((f) => f.id === format)!.hint} Print at 100% size, not &quot;fit to page&quot;.</p>

      <div className="pk-preview">
        <div className={`print-area pk-${format}`}>
          {format === 'sticker' && <Sticker place={place} qr={qr} />}
          {format === 'card' && <TableCard place={place} qr={qr} />}
          {format === 'sheet' && Array.from({ length: 6 }, (_, i) => <Sticker key={i} place={place} qr={qr} />)}
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
        <a href={qrTarget(place)} target="_blank" rel="noopener" className="self-center text-sm text-primary font-medium hover:underline">Test the link</a>
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
        We print stickers for the window in small batches and post them to venues. Send us your address and we will reply by email.
      </p>
      {state === 'sent' ? (
        <p className="mt-3 text-sm font-medium text-primary">Thanks, we got your request. We will reply by email.</p>
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

const PRINT_CSS = `
.pk-preview { background: #f3f4f6; border-radius: 16px; padding: 24px; overflow-x: auto; }
.print-area { background: #fff; margin: 0 auto; color: #14532d; font-family: Inter, Arial, sans-serif; }
.pk-sticker-wrap, .pk-sticker { width: 80mm; height: 80mm; border-radius: 50%; border: 2.5mm solid #16a34a; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #fff; }
.pk-sticker-top { font-size: 9pt; font-weight: 600; letter-spacing: 0.04em; }
.pk-sticker-logo { height: 8mm; margin: 0.5mm 0 0; }
.pk-wordmark { font-size: 12pt; font-weight: 800; color: #14532d; margin-bottom: 1.5mm; }
.pk-wordmark-card { font-size: 18pt; margin: 1mm 0 0; }
.pk-qr svg { display: block; width: 100%; height: 100%; }
.pk-qr-sticker { width: 30mm; height: 30mm; }
.pk-sticker-name { font-size: 9pt; font-weight: 700; margin-top: 1.5mm; max-width: 56mm; line-height: 1.15; }
.pk-sticker-hint { font-size: 7pt; margin-top: 0.8mm; color: #166534; }
.pk-sticker.print-area, .print-area.pk-sticker { width: 80mm; }
.print-area.pk-sticker { display: block; width: 80mm; background: transparent; }
.print-area.pk-card { width: 105mm; }
.pk-card { width: 105mm; height: 148mm; box-sizing: border-box; border: 0.4mm solid #d1d5db; padding: 10mm 8mm;
  display: flex; flex-direction: column; align-items: center; text-align: center; background: #fff; }
.pk-card-logo { height: 12mm; }
.pk-card-name { font-size: 15pt; font-weight: 800; margin: 5mm 0 6mm; line-height: 1.15; }
.pk-qr-card { width: 55mm; height: 55mm; }
.pk-card-text { font-size: 10pt; margin-top: 4mm; color: #166534; }
.print-area.pk-sheet { width: 190mm; display: grid; grid-template-columns: 80mm 80mm; gap: 8mm 14mm; justify-content: center; background: transparent; }
@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute; left: 0; top: 0; }
  .pk-preview { background: none; padding: 0; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`
