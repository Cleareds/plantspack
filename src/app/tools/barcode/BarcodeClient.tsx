'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, Search, Loader2, CheckCircle2, AlertCircle, HelpCircle, PackageX, ShieldAlert, Plus, Clock, ExternalLink } from 'lucide-react'
import type { BarcodeResult } from '@/app/api/tools/barcode/route'
import AllergenSelector from '../_components/AllergenSelector'
import { saveBarcodeScan, getRecentBarcodeScans, type BarcodeHistoryEntry } from './barcode-history'

type Status = 'idle' | 'scanning' | 'looking-up' | 'result' | 'error'

export default function BarcodeClient() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<BarcodeResult | null>(null)
  const [allergens, setAllergens] = useState<string[]>([])
  const [allergensFromProfile, setAllergensFromProfile] = useState(false)
  const [history, setHistory] = useState<BarcodeHistoryEntry[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    fetch('/api/tools/allergens')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.allergens) && data.allergens.length > 0) {
          setAllergens(data.allergens)
          setAllergensFromProfile(true)
        }
      })
      .catch(() => {})
    void getRecentBarcodeScans(5).then(setHistory)
  }, [])

  async function persistAllergens(next: string[]) {
    const r = await fetch('/api/tools/allergens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergens: next }),
    })
    if (r.ok) setAllergensFromProfile(true)
  }

  async function startCamera() {
    setError(null)
    setResult(null)
    setStatus('scanning')

    // Wait one tick so the <video> ref mounts before ZXing attaches.
    await new Promise((r) => setTimeout(r, 0))
    if (!videoRef.current) {
      setError('Camera element not ready - try again.')
      setStatus('error')
      return
    }

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      // Use constraints to force the rear camera on mobile - decodeFromVideoDevice
      // with undefined deviceId picks the first device, which on iOS Safari is
      // usually the front-facing camera (useless for scanning a barcode in your hand).
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current,
        (res, _err, ctl) => {
          // ZXing fires this callback on every frame; _err is "NotFoundException"
          // every frame that has no barcode. We ignore it - real decoder failures
          // would surface from the outer try/catch above.
          if (res) {
            ctl.stop()
            controlsRef.current = null
            void lookup(res.getText())
          }
        },
      )
      controlsRef.current = controls
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string }
      let msg = err.message ?? 'Could not access camera'
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Allow access in browser settings.'
      else if (err.name === 'NotFoundError') msg = 'No camera found on this device.'
      else if (err.name === 'NotReadableError') msg = 'Camera is in use by another app. Close other apps and try again.'
      else if (err.name === 'OverconstrainedError') msg = 'No rear camera available. Try a phone or tablet.'
      else if (err.name === 'SecurityError') msg = 'Camera blocked - this page must be served over HTTPS.'
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
      const qs = new URLSearchParams({ barcode })
      if (allergens.length) qs.set('allergens', allergens.join(','))
      const r = await fetch(`/api/tools/barcode?${qs.toString()}`)
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || `Lookup failed (${r.status})`)
      }
      const data: BarcodeResult = await r.json()
      setResult(data)
      setStatus('result')

      // Save to local history (skip not_found - keep that for the contribute CTA)
      if (data.verdict !== 'not_found') {
        void saveBarcodeScan({
          barcode: data.barcode,
          verdict: data.verdict,
          productName: data.productName,
          brand: data.brand,
          imageUrl: data.imageUrl,
          allergenHits: data.allergenHits ?? [],
          ts: Date.now(),
        }).then(() => getRecentBarcodeScans(5).then(setHistory))
      }
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
        <>
          <div className="mb-4">
            <AllergenSelector
              value={allergens}
              onChange={setAllergens}
              savedRemote={allergensFromProfile}
              onPersist={persistAllergens}
              compact
            />
          </div>
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

          {history.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3">
                <Clock className="h-3.5 w-3.5" />
                Recent on this device
              </div>
              <div className="space-y-2">
                {history.map((h) => {
                  const verdictTheme = {
                    vegan: { Icon: CheckCircle2, color: 'text-success' },
                    not_vegan: { Icon: AlertCircle, color: 'text-error' },
                    uncertain: { Icon: HelpCircle, color: 'text-warning' },
                  }[h.verdict as 'vegan' | 'not_vegan' | 'uncertain'] ?? { Icon: HelpCircle, color: 'text-on-surface-variant' }
                  return (
                    <button
                      key={h.barcode}
                      onClick={() => void lookup(h.barcode)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg ghost-border bg-surface-container-lowest text-left hover:border-primary/30 transition"
                    >
                      <verdictTheme.Icon className={`h-4 w-4 flex-shrink-0 ${verdictTheme.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-on-surface truncate">
                          {h.productName ?? `Barcode ${h.barcode}`}
                        </div>
                        {h.brand && <div className="text-xs text-on-surface-variant truncate">{h.brand}</div>}
                      </div>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {new Date(h.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
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

        {result.verdict === 'not_found' && (
          <div className="mb-4 p-4 rounded-lg ghost-border bg-primary/5">
            <div className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              Help everyone - add this product
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
              Open Food Facts is open and community-built. Adding this barcode takes 2 minutes and makes the scanner smarter for every vegan after you.
            </p>
            <a
              href={`https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=${result.barcode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Add on Open Food Facts
            </a>
          </div>
        )}

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

        {result.allergenHits && result.allergenHits.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-warning/5 text-sm text-on-surface">
            <div className="font-semibold mb-1 text-warning flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Allergen match
            </div>
            <div className="text-on-surface-variant">Contains: {result.allergenHits.join(', ')}</div>
          </div>
        )}

        {/* E-code findings: surface every additive we recognised so the
            reader can see WHY a "not vegan" or "uncertain" verdict came
            out the way it did. Educational + builds trust. */}
        {result.eCodeHits && result.eCodeHits.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-surface-variant/40 text-sm text-on-surface">
            <div className="font-semibold mb-2 text-on-surface">Food additives detected</div>
            <ul className="space-y-1.5">
              {result.eCodeHits.map(e => (
                <li key={e.code} className="flex gap-2">
                  <span className={`mt-0.5 inline-flex items-center justify-center w-12 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                    e.status === 'non_vegan' ? 'bg-error/15 text-error' :
                    e.status === 'maybe' ? 'bg-warning/15 text-warning' :
                    'bg-emerald-500/15 text-emerald-700'
                  }`}>{e.code}</span>
                  <span className="text-on-surface-variant">
                    <span className="font-medium text-on-surface">{e.name}.</span>{' '}
                    {e.note}
                  </span>
                </li>
              ))}
            </ul>
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
