'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, HelpCircle, RotateCcw } from 'lucide-react'
import type { ScanResult, ToolName } from '@/lib/tool-quota'

type Status = 'idle' | 'loading' | 'scanning' | 'result' | 'error'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

async function downscale(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * ratio)
  const h = Math.round(bmp.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export default function PhotoScanner({ tool, examplePrompt }: { tool: ToolName; examplePrompt: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    setStatus('loading')
    setError(null)
    setResult(null)
    setCached(false)

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      setStatus('error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image is over 20MB. Try a smaller photo.')
      setStatus('error')
      return
    }

    let dataUrl: string
    try {
      dataUrl = await downscale(file)
    } catch {
      setError('Could not read this image. Try another photo.')
      setStatus('error')
      return
    }

    setStatus('scanning')
    try {
      const r = await fetch('/api/tools/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, imageDataUrl: dataUrl }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Scan failed')
        setTier(data.tier ?? null)
        setStatus('error')
        return
      }
      setResult(data.result)
      setTier(data.tier ?? null)
      setCached(!!data.cached)
      setStatus('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setStatus('error')
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setCached(false)
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      {status === 'idle' && (
        <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 mb-3"
          >
            <Camera className="h-5 w-5" />
            Take a photo
          </button>
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture')
                fileInputRef.current.click()
                fileInputRef.current.setAttribute('capture', 'environment')
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl ghost-border bg-surface text-on-surface font-semibold hover:border-primary/30"
          >
            <Upload className="h-5 w-5" />
            Upload from device
          </button>
          <p className="text-xs text-on-surface-variant text-center mt-4">{examplePrompt}</p>
        </div>
      )}

      {(status === 'loading' || status === 'scanning') && (
        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{status === 'loading' ? 'Preparing image...' : 'Reading the image...'}</span>
        </div>
      )}

      {status === 'error' && (
        <ErrorCard message={error ?? 'Something went wrong.'} tier={tier} onReset={reset} />
      )}

      {status === 'result' && result && (
        <ResultCard result={result} cached={cached} onReset={reset} />
      )}
    </div>
  )
}

function ErrorCard({ message, tier, onReset }: { message: string; tier: string | null; onReset: () => void }) {
  const isQuota = message.toLowerCase().includes('used') || message.toLowerCase().includes('budget')
  return (
    <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 text-center">
      <AlertCircle className="h-8 w-8 text-error mx-auto mb-3" />
      <p className="text-on-surface mb-5 leading-relaxed">{message}</p>
      <div className="flex flex-col gap-2">
        {isQuota && tier === 'guest' && (
          <Link href="/login" className="px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold">
            Sign in for 3 more scans/month
          </Link>
        )}
        {isQuota && (
          <Link href="/support" className="px-5 py-3 rounded-xl ghost-border bg-surface text-on-surface font-semibold hover:border-primary/30">
            Back PlantsPack for unlimited
          </Link>
        )}
        <button onClick={onReset} className="px-5 py-3 rounded-xl text-on-surface-variant text-sm">
          Try a different photo
        </button>
      </div>
    </div>
  )
}

function ResultCard({ result, cached, onReset }: { result: ScanResult; cached: boolean; onReset: () => void }) {
  const theme = {
    vegan: { Icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success', label: 'Vegan' },
    not_vegan: { Icon: AlertCircle, bg: 'bg-error/10', text: 'text-error', label: 'Not vegan' },
    uncertain: { Icon: HelpCircle, bg: 'bg-warning/10', text: 'text-warning', label: 'Uncertain' },
    unclear: { Icon: HelpCircle, bg: 'bg-on-surface/10', text: 'text-on-surface-variant', label: 'Unclear photo' },
    invalid_image: { Icon: AlertCircle, bg: 'bg-error/10', text: 'text-error', label: 'Wrong photo type' },
  }[result.verdict]

  return (
    <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest overflow-hidden">
      <div className={`p-5 ${theme.bg} flex items-center gap-3`}>
        <theme.Icon className={`h-7 w-7 ${theme.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs uppercase tracking-wider font-bold ${theme.text}`}>Verdict</div>
          <div className="text-xl font-extrabold text-on-surface">{theme.label}</div>
        </div>
        {cached && (
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-on-surface/10 text-on-surface-variant">
            Cached
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="text-on-surface leading-relaxed mb-4">{result.summary}</p>

        {result.items && result.items.length > 0 && (
          <div className="space-y-2 mb-5">
            {result.items.map((item, i) => {
              const it = {
                vegan: { bg: 'bg-success/5', text: 'text-success', label: 'Vegan' },
                not_vegan: { bg: 'bg-error/5', text: 'text-error', label: 'Not vegan' },
                uncertain: { bg: 'bg-warning/5', text: 'text-warning', label: 'Check' },
              }[item.status]
              return (
                <div key={i} className={`p-3 rounded-lg ${it.bg}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-semibold text-on-surface">{item.name}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${it.text}`}>{it.label}</span>
                  </div>
                  {item.note && <div className="text-sm text-on-surface-variant">{item.note}</div>}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold"
        >
          <RotateCcw className="h-4 w-4" />
          Scan another
        </button>

        <p className="text-xs text-on-surface-variant mt-4 text-center">
          AI-assisted - always double-check ingredients on the package or ask the server.
        </p>
      </div>
    </div>
  )
}
