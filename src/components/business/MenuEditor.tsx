'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FileUp, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { track } from '@/lib/analytics'
import { menuFileToDataUrls } from '@/lib/business/image-prep'

interface Row {
  key: string
  section: string
  name: string
  description: string
  price: string
  currency: string
  is_vegan: boolean
}

interface PlaceInfo { id: string; slug: string | null; name: string; vegan_level: string | null }
interface MenuInfo { status: 'draft' | 'published'; checked_at: string | null; updated_at: string }

const MAX_PAGES = 5
let keySeq = 0
const newKey = () => `r${++keySeq}`

function emptyRow(section = ''): Row {
  return { key: newKey(), section, name: '', description: '', price: '', currency: '', is_vegan: false }
}

export default function MenuEditor({ placeId }: { placeId: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [deniedMsg, setDeniedMsg] = useState('')
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const [menu, setMenu] = useState<MenuInfo | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [pages, setPages] = useState<string[]>([])
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const allVegan = place?.vegan_level === 'fully_vegan'

  useEffect(() => {
    fetch(`/api/business/places/${placeId}/menu`, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (r.status === 401 || r.status === 403 || r.status === 404) {
          setDeniedMsg(data.error || 'You cannot edit this menu.')
          setState('denied')
          return
        }
        if (!r.ok) throw new Error(data.error)
        setPlace(data.place)
        setMenu(data.menu)
        setRows((data.items || []).map((it: any) => ({
          key: newKey(),
          section: it.section || '',
          name: it.name,
          description: it.description || '',
          price: it.price != null ? String(it.price) : '',
          currency: it.currency || '',
          is_vegan: !!it.is_vegan,
        })))
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [placeId])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (key: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setDirty(true)
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setMessage(null)
    try {
      const out: string[] = []
      for (const f of Array.from(files)) {
        if (f.size > 30 * 1024 * 1024) throw new Error('A file is over 30 MB. Try a smaller one.')
        out.push(...(await menuFileToDataUrls(f)))
      }
      setPages((p) => [...p, ...out].slice(0, MAX_PAGES))
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not open that file.' })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function readMenu() {
    if (rows.some((r) => r.name.trim()) && !confirm('Replace the dishes below with what we read from the menu?')) return
    setReading(true)
    setMessage(null)
    try {
      const r = await fetch(`/api/business/places/${placeId}/menu/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pasteMode ? { text: pasteText } : { imageDataUrls: pages }),
      })
      const data = await r.json().catch(() => ({}))
      if (typeof data.remaining === 'number') setRemaining(data.remaining)
      if (!r.ok) throw new Error(data.error || 'Reading the menu failed.')
      setRows((data.items || []).map((it: any) => ({
        key: newKey(),
        section: it.section || '',
        name: it.name,
        description: it.description || '',
        price: it.price != null ? String(it.price) : '',
        currency: it.currency || '',
        is_vegan: it.vegan === 'yes',
      })))
      setPages([])
      setPasteText('')
      setDirty(true)
      track('owner_tool_used', { tool: 'menu', action: 'import' })
      setMessage({ kind: 'ok', text: `We read ${data.items?.length ?? 0} dishes. Check every row, fix anything wrong, then publish.` })
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Reading the menu failed.' })
    } finally {
      setReading(false)
    }
  }

  async function save(status: 'draft' | 'published') {
    setSaving(status)
    setMessage(null)
    try {
      const r = await fetch(`/api/business/places/${placeId}/menu`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          items: rows.filter((x) => x.name.trim()).map((x) => ({
            section: x.section,
            name: x.name,
            description: x.description,
            price: x.price,
            currency: x.currency,
            is_vegan: x.is_vegan,
          })),
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Saving failed.')
      setMenu({ status, checked_at: status === 'published' ? new Date().toISOString() : menu?.checked_at ?? null, updated_at: new Date().toISOString() })
      setDirty(false)
      if (status === 'published') track('owner_menu_published', { items: data.count ?? 0 })
      setMessage({
        kind: 'ok',
        text: status === 'published'
          ? `Published: ${data.count} dishes, ${data.vegan} marked vegan. Your page shows it within a minute.`
          : menu?.status === 'published'
            ? 'Saved and hidden from your page.'
            : 'Draft saved. It is not on your page until you publish.',
      })
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Saving failed.' })
    } finally {
      setSaving(null)
    }
  }

  if (state === 'loading') {
    return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading your menu...</div>
  }
  if (state === 'denied') {
    return (
      <div className="mt-6 bg-surface-container-lowest rounded-2xl ghost-border p-8">
        <p className="text-on-surface mb-4">{deniedMsg}</p>
        <Link href="/business" className="text-primary font-medium hover:underline">How to claim your place</Link>
      </div>
    )
  }
  if (state === 'error' || !place) {
    return <p className="mt-6 text-on-surface-variant">The menu could not be loaded. Please refresh the page.</p>
  }

  const named = rows.filter((r) => r.name.trim())
  const veganCount = named.filter((r) => allVegan || r.is_vegan).length

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Menu for {place.name}</h1>
        <p className="text-on-surface-variant mt-1">
          {menu?.status === 'published'
            ? `Published on your page${menu.checked_at ? `, last checked ${new Date(menu.checked_at).toLocaleDateString()}` : ''}.`
            : 'Not on your page yet.'}
          {' '}Visitors see your dishes and how many are vegan. The vegan marks are yours, so please keep them right.
        </p>
      </div>

      <section className="bg-surface-container-lowest rounded-2xl ghost-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-on-surface flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Read your menu for you</h2>
          <button type="button" onClick={() => setPasteMode((m) => !m)} className="text-sm text-primary font-medium hover:underline">
            {pasteMode ? 'Upload a photo or PDF instead' : 'Paste the menu text instead'}
          </button>
        </div>
        {pasteMode ? (
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste your menu here, with prices if you like."
            className="w-full p-3 rounded-xl bg-surface-container-low ghost-border text-sm text-on-surface"
          />
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {pages.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Menu page ${i + 1}`} className="h-24 w-20 object-cover rounded-lg ghost-border" />
                  <button type="button" aria-label="Remove page" onClick={() => setPages((p) => p.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-surface rounded-full ghost-border p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pages.length < MAX_PAGES && (
                <button type="button" onClick={() => fileInput.current?.click()} className="h-24 w-20 rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-xs text-on-surface-variant hover:border-primary">
                  <FileUp className="h-5 w-5 mb-1" /> Add
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <p className="text-xs text-on-surface-variant">Photos or a PDF, up to {MAX_PAGES} pages.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            type="button"
            onClick={readMenu}
            disabled={reading || (pasteMode ? pasteText.trim().length < 20 : pages.length === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50"
          >
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {reading ? 'Reading the menu, about 30 seconds...' : 'Read the menu'}
          </button>
          <span className="text-xs text-on-surface-variant">
            2 menu reads per month per place{remaining !== null ? `, ${remaining} left this month` : ''}. Editing by hand is unlimited.
          </span>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl ghost-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold text-on-surface">Dishes ({named.length}{allVegan ? '' : `, ${veganCount} vegan`})</h2>
          {allVegan && <span className="text-xs text-on-surface-variant">Your place is listed as 100% vegan, so every dish counts as vegan.</span>}
        </div>

        {rows.length === 0 && <p className="text-sm text-on-surface-variant mb-4">No dishes yet. Read your menu above, or add dishes by hand.</p>}

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-surface-container-low">
              <input aria-label="Section" value={r.section} onChange={(e) => update(r.key, { section: e.target.value })} placeholder="Section" className="col-span-12 sm:col-span-3 px-2.5 py-2 rounded-lg bg-surface text-sm ghost-border" />
              <input aria-label="Dish name" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Dish name" className="col-span-12 sm:col-span-5 px-2.5 py-2 rounded-lg bg-surface text-sm ghost-border font-medium" />
              <input aria-label="Price" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} placeholder="Price" inputMode="decimal" className="col-span-5 sm:col-span-2 px-2.5 py-2 rounded-lg bg-surface text-sm ghost-border" />
              <input aria-label="Currency" value={r.currency} onChange={(e) => update(r.key, { currency: e.target.value })} placeholder="EUR" className="col-span-3 sm:col-span-1 px-2 py-2 rounded-lg bg-surface text-sm ghost-border" />
              <button type="button" aria-label="Remove dish" onClick={() => { setRows((rs) => rs.filter((x) => x.key !== r.key)); setDirty(true) }} className="col-span-4 sm:col-span-1 flex justify-center py-2 text-on-surface-variant hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
              <input aria-label="Description" value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} placeholder="Short description (optional)" className="col-span-12 sm:col-span-9 px-2.5 py-2 rounded-lg bg-surface text-sm ghost-border" />
              {!allVegan && (
                <label className="col-span-12 sm:col-span-3 flex items-center gap-2 text-sm text-on-surface py-2">
                  <input type="checkbox" checked={r.is_vegan} onChange={(e) => update(r.key, { is_vegan: e.target.checked })} className="h-4 w-4 accent-primary" />
                  Vegan
                </label>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setRows((rs) => [...rs, emptyRow(rs.at(-1)?.section || '')]); setDirty(true) }}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low"
        >
          <Plus className="h-4 w-4" /> Add a dish
        </button>
      </section>

      {message && (
        <div className={`p-3 rounded-xl text-sm ${message.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{message.text}</div>
      )}

      <div className="flex flex-wrap gap-3 sticky bottom-4">
        <button
          type="button"
          onClick={() => save('published')}
          disabled={!!saving || named.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium disabled:opacity-50 shadow"
        >
          {saving === 'published' && <Loader2 className="h-4 w-4 animate-spin" />}
          {menu?.status === 'published' ? 'Publish changes' : 'Publish on my page'}
        </button>
        <button
          type="button"
          onClick={() => save('draft')}
          disabled={!!saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface ghost-border text-on-surface font-medium disabled:opacity-50"
        >
          {saving === 'draft' && <Loader2 className="h-4 w-4 animate-spin" />}
          {menu?.status === 'published' ? 'Hide from my page' : 'Save draft'}
        </button>
        <Link href={`/place/${place.slug || place.id}#menu`} className="self-center text-sm font-medium text-primary hover:underline">View my page</Link>
      </div>
    </div>
  )
}
