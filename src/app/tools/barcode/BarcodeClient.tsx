'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, Search, Loader2, CheckCircle2, AlertCircle, HelpCircle, PackageX } from 'lucide-react'
import type { BarcodeResult } from '@/app/api/tools/barcode/route'

type Status = 'idle' | 'scanning' | 'looking-up' | 'result' | 'error'

export default function BarcodeClient() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<BarcodeResult | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
    }
  }, [])

  async function startCamera() {
    setError(null)
    setResult(null)
    setStatus('scanning')

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (res, _err, ctl) => {
          if (res) {
            ctl.stop()
            controlsRef.current = null
            void lookup(res.getText())
          }
        },
      )
      controlsRef.current = controls
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not access camera'
      setError(msg)
      setStatus('error')
    }
  }

  function stopCamera() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setStatus('idle')
  }

  async function lookup(barcode: string) {
    setStatus('looking-up')
    setError(null)
    try {
      const r = await fetch(`/api/tools/barcode?barcode=${encodeURIComponent(barcode)}`)
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || `Lookup failed (${r.status})`)
      }
      const data: BarcodeResult = await r.json()
      setResult(data)
      setStatus('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lookup failed')
      setStatus('error')
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = manual.replace(/\D/g, '')
    if (cleaned.length < 6) {
      setError('Barcode should be 6-14 digits')
      setStatus('error')
      return
    }
    void lookup(cleaned)
  }

  function reset() {
    setResult(null)
    setError(null)
    setManual('')
    setStatus('idle')
  }

  return (
    <div>
      {status === 'idle' && (
        <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8">
          <button
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 mb-4"
          >
            <Camera className="h-5 w-5" />
            Scan with camera
          </button>

          <div className="flex items-center gap-3 my-5 text-xs text-on-surface-variant">
            <div className="flex-1 h-px bg-on-surface/10" />
            <span>or enter barcode</span>
            <div className="flex-1 h-px bg-on-surface/10" />
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 5000159407236"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl ghost-border bg-surface text-on-surface font-mono focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="px-4 py-3 rounded-xl ghost-border bg-surface-container-lowest hover:border-primary/30"
              aria-label="Look up"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {status === 'scanning' && (
        <div className="rounded-2xl overflow-hidden ghost-border editorial-shadow bg-black relative">
          <video ref={videoRef} className="w-full aspect-square object-cover" autoPlay playsInline muted />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/80 pointer-events-none" />
          <button
            onClick={stopCamera}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Stop scanning"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 text-center text-white/80 text-xs">
            Centre the barcode in the frame
          </div>
        </div>
      )}

      {status === 'looking-up' && (
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8 flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking Open Food Facts...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-6 text-center">
          <AlertCircle className="h-8 w-8 text-error mx-auto mb-3" />
          <p className="text-on-surface mb-4">{error}</p>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold">
            Try again
          </button>
        </div>
      )}

      {status === 'result' && result && <ResultCard result={result} onReset={reset} />}
    </div>
  )
}

function ResultCard({ result, onReset }: { result: BarcodeResult; onReset: () => void }) {
  const verdictTheme = {
    vegan: { Icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success', label: 'Vegan' },
    not_vegan: { Icon: AlertCircle, bg: 'bg-error/10', text: 'text-error', label: 'Not vegan' },
    uncertain: { Icon: HelpCircle, bg: 'bg-warning/10', text: 'text-warning', label: 'Uncertain' },
    not_found: { Icon: PackageX, bg: 'bg-on-surface/10', text: 'text-on-surface-variant', label: 'Not in database' },
  }[result.verdict]

  return (
    <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest overflow-hidden">
      <div className={`p-5 ${verdictTheme.bg} flex items-center gap-3`}>
        <verdictTheme.Icon className={`h-7 w-7 ${verdictTheme.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs uppercase tracking-wider font-bold ${verdictTheme.text}`}>Verdict</div>
          <div className="text-xl font-extrabold text-on-surface">{verdictTheme.label}</div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{result.reason}</p>

        {(result.productName || result.brand) && (
          <div className="flex gap-3 mb-4 items-start">
            {result.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg ghost-border flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-semibold text-on-surface">{result.productName ?? 'Unknown product'}</div>
              {result.brand && <div className="text-sm text-on-surface-variant">{result.brand}</div>}
              <div className="text-xs text-on-surface-variant mt-1 font-mono">{result.barcode}</div>
            </div>
          </div>
        )}

        {result.ingredients && (
          <details className="mb-4">
            <summary className="text-sm font-semibold text-on-surface cursor-pointer mb-2">Ingredients</summary>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{result.ingredients}</p>
          </details>
        )}

        {result.nonVeganHits.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-error/5 text-sm text-on-surface">
            <div className="font-semibold mb-1 text-error">Flagged ingredients</div>
            <div className="text-on-surface-variant">{result.nonVeganHits.join(', ')}</div>
          </div>
        )}

        <button onClick={onReset} className="w-full px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold">
          Scan another
        </button>

        <p className="text-xs text-on-surface-variant mt-4 text-center">
          Data from{' '}
          <a href={`https://world.openfoodfacts.org/product/${result.barcode}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Open Food Facts
          </a>
          . Always double-check the label - data can be incomplete or out of date.
        </p>
      </div>
    </div>
  )
}
