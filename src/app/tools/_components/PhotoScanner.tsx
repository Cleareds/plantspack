'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AllergenSelector from './AllergenSelector'
import {
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Plus,
  Eye,
} from 'lucide-react'
import type { ScanResult, ToolName } from '@/lib/tool-quota'

type Status = 'idle' | 'loading' | 'scanning' | 'result' | 'error'
type Mode = 'photo' | 'text'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const MAX_IMAGES = 5

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

export default function PhotoScanner({
  tool,
  examplePrompt,
}: {
  tool: ToolName
  examplePrompt: string
}) {
  const allowMultiImage = tool === 'menu'

  const [mode, setMode] = useState<Mode>('photo')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  const [images, setImages] = useState<string[]>([]) // data URLs
  const [text, setText] = useState('')
  const [allergens, setAllergens] = useState<string[]>([])
  const [allergensFromProfile, setAllergensFromProfile] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Pull saved allergens from profile on mount. Endpoint returns [] for guests.
  useEffect(() => {
    let cancelled = false
    fetch('/api/tools/allergens')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.allergens) && data.allergens.length > 0) {
          setAllergens(data.allergens)
          setAllergensFromProfile(true)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function persistAllergens(next: string[]) {
    const r = await fetch('/api/tools/allergens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergens: next }),
    })
    if (r.ok) setAllergensFromProfile(true)
  }

  async function addFile(file: File) {
    setError(null)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')

    if (!isPdf && !isImage) {
      setError('Please upload an image (JPG/PNG/HEIC) or a PDF.')
      setStatus('error')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('File is over 30MB. Try a smaller one.')
      setStatus('error')
      return
    }
    if (isPdf && !allowMultiImage) {
      setError('PDFs are only supported for the menu scanner.')
      setStatus('error')
      return
    }

    setStatus('loading')
    try {
      if (isPdf) {
        const { pdfToImages } = await import('./pdf-to-images')
        const pages = await pdfToImages(file)
        if (pages.length === 0) {
          setError('No pages found in the PDF.')
          setStatus('error')
          return
        }
        setImages((prev) => [...prev, ...pages].slice(0, MAX_IMAGES))
        setStatus('idle')
        return
      }

      const dataUrl = await downscale(file)
      setImages((prev) => {
        const next = allowMultiImage ? [...prev, dataUrl].slice(0, MAX_IMAGES) : [dataUrl]
        if (!allowMultiImage) {
          void submitImages([dataUrl])
        } else {
          setStatus('idle')
        }
        return next
      })
    } catch (e) {
      console.error('[scanner] file processing failed:', e)
      setError('Could not read this file. Try another photo or PDF.')
      setStatus('error')
    }
  }

  async function submitImages(urls: string[]) {
    setStatus('scanning')
    setError(null)
    setResult(null)
    setCached(false)
    try {
      const r = await fetch('/api/tools/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, imageDataUrls: urls, allergens }),
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

  async function submitText() {
    if (text.trim().length < 20) {
      setError('Paste at least a few lines of the ingredient list or menu.')
      setStatus('error')
      return
    }
    setStatus('scanning')
    setError(null)
    setResult(null)
    setCached(false)
    try {
      const r = await fetch('/api/tools/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, text, allergens }),
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
    setImages([])
    setText('')
    setCached(false)
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (status === 'scanning' || status === 'loading') {
    return (
      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{status === 'loading' ? 'Preparing image...' : 'Reading...'}</span>
      </div>
    )
  }

  if (status === 'error') {
    return <ErrorCard message={error ?? 'Something went wrong.'} tier={tier} onReset={reset} />
  }

  if (status === 'result' && result) {
    return <ResultCard result={result} cached={cached} onReset={reset} />
  }

  return (
    <div>
      <div className="mb-4">
        <AllergenSelector
          value={allergens}
          onChange={setAllergens}
          savedRemote={allergensFromProfile}
          onPersist={persistAllergens}
          compact
        />
      </div>

      <div className="inline-flex p-1 rounded-full ghost-border bg-surface mb-5">
        <ModeBtn active={mode === 'photo'} onClick={() => setMode('photo')} icon={ImageIcon} label="Photo" />
        <ModeBtn active={mode === 'text'} onClick={() => setMode('text')} icon={Type} label="Paste text" />
      </div>

      {mode === 'photo' && (
        <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowMultiImage ? 'image/*,application/pdf' : 'image/*'}
            capture={allowMultiImage ? undefined : 'environment'}
            multiple={allowMultiImage}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.forEach((f) => void addFile(f))
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          />

          {allowMultiImage && images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden ghost-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg ghost-border border-dashed flex items-center justify-center text-on-surface-variant hover:border-primary/30 hover:text-primary"
                  aria-label="Add another image"
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </div>
          )}

          {(!allowMultiImage || images.length === 0) && (
            <>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    if (!allowMultiImage) fileInputRef.current.setAttribute('capture', 'environment')
                    fileInputRef.current.click()
                  }
                }}
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
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl ghost-border bg-surface text-on-surface font-semibold hover:border-primary/30"
              >
                <Upload className="h-5 w-5" />
                {allowMultiImage ? 'Upload images or PDF' : 'Upload from device'}
              </button>
            </>
          )}

          {allowMultiImage && images.length > 0 && (
            <button
              onClick={() => void submitImages(images)}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 mt-2"
            >
              Scan {images.length} {images.length === 1 ? 'image' : 'images'}
            </button>
          )}

          <p className="text-xs text-on-surface-variant text-center mt-4">
            {examplePrompt}
            {allowMultiImage && ' Up to 5 pages.'}
          </p>
        </div>
      )}

      {mode === 'text' && (
        <div className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={tool === 'ingredient' ? 6 : 10}
            placeholder={
              tool === 'ingredient'
                ? 'Paste the ingredient list here (e.g. "wheat flour, sugar, vegetable oil, salt, mono- and diglycerides...")'
                : 'Paste the menu text here. Dish names and short descriptions are enough.'
            }
            className="w-full px-4 py-3 rounded-xl ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary resize-y"
          />
          <button
            onClick={() => void submitText()}
            disabled={text.trim().length < 20}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
          >
            Analyse text
          </button>
          <p className="text-xs text-on-surface-variant text-center mt-3">
            Useful when the package text is too small to photograph, or you got the menu by email or PDF.
          </p>
        </div>
      )}
    </div>
  )
}

function ModeBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Type; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
        active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
          Try again
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
    unclear: { Icon: HelpCircle, bg: 'bg-on-surface/10', text: 'text-on-surface-variant', label: 'Unclear' },
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

        {result.visibility && result.visibility.fully_readable === false && result.visibility.issues && (
          <div className="flex gap-2 items-start p-3 rounded-lg bg-warning/5 mb-4">
            <Eye className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-warning text-xs uppercase tracking-wider mb-0.5">Visibility</div>
              <div className="text-on-surface-variant leading-relaxed">{result.visibility.issues}</div>
            </div>
          </div>
        )}

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
