'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Smartphone, Loader2, Send, Save, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ReleaseRow {
  platform: 'ios' | 'android'
  latest_version: string
  min_supported_version: string
  store_url: string | null
  message: string | null
}

export default function AdminNotificationsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Notifications &amp; Releases</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Broadcast an announcement to every user, and control the in-app update prompt.
        </p>
      </div>
      <BroadcastCard />
      <ReleaseCard />
    </div>
  )
}

function BroadcastCard() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setError(null); setResult(null)
    if (!message.trim()) { setError('Message is required.'); return }
    if (!confirm('Send this announcement to ALL users? Everyone sees it in their in-app bell; opted-in users also get a push.')) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || undefined, message: message.trim(), url: url.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to send'); return }
      setResult(`Delivered to ${json.recipients} bells · ${json.pushed} device pushes (opted-in only).`)
      setTitle(''); setMessage(''); setUrl('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-on-surface">Broadcast announcement</h2>
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Goes to <strong>all users</strong>. OS push is sent only to users who opted in to announcements
          (App Store / Play promo-push rule). Keep it honest and relevant — no inflated claims.
        </span>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-on-surface">Push title (optional)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
          placeholder="PlantsPack"
          className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-on-surface">Message <span className="text-on-surface-variant">({message.length}/500)</span></span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3}
          placeholder="e.g. We just added 120 new vegan spots across Berlin 🌱"
          className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-on-surface">Link URL (optional)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://plantspack.com/..."
          className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
      </label>

      {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{error}</p>}
      {result && <p className="text-sm text-green-700 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />{result}</p>}

      <button onClick={send} disabled={sending}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? 'Sending…' : 'Send to all users'}
      </button>
    </section>
  )
}

function ReleaseCard() {
  const [rows, setRows] = useState<ReleaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPlatform, setSavingPlatform] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/app-release')
      .then((r) => r.json())
      .then((j) => setRows(j.rows ?? []))
      .finally(() => setLoading(false))
  }, [])

  const patch = (platform: string, p: Partial<ReleaseRow>) =>
    setRows((rs) => rs.map((r) => (r.platform === platform ? { ...r, ...p } : r)))

  const save = async (row: ReleaseRow) => {
    setMsg(null); setSavingPlatform(row.platform)
    try {
      const res = await fetch('/api/admin/app-release', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row),
      })
      const json = await res.json()
      setMsg(res.ok ? `${row.platform} saved.` : (json.error || 'Save failed'))
    } finally {
      setSavingPlatform(null)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-on-surface">App update prompt</h2>
      </div>
      <p className="text-sm text-on-surface-variant">
        The mobile app reads this on launch. Below <strong>min supported</strong> shows a blocking update screen;
        below <strong>latest</strong> shows a dismissible banner. Links to the store — no push.
      </p>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : rows.map((row) => (
        <div key={row.platform} className="rounded-md border border-outline p-4 space-y-3">
          <h3 className="font-medium text-on-surface uppercase text-xs tracking-wide">{row.platform}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-on-surface-variant">Latest version</span>
              <input value={row.latest_version} onChange={(e) => patch(row.platform, { latest_version: e.target.value })}
                className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-on-surface-variant">Min supported</span>
              <input value={row.min_supported_version} onChange={(e) => patch(row.platform, { min_supported_version: e.target.value })}
                className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-on-surface-variant">Store URL</span>
            <input value={row.store_url ?? ''} onChange={(e) => patch(row.platform, { store_url: e.target.value })}
              placeholder={row.platform === 'ios' ? 'https://apps.apple.com/app/...' : 'https://play.google.com/store/apps/details?id=...'}
              className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-on-surface-variant">Update message (optional)</span>
            <input value={row.message ?? ''} onChange={(e) => patch(row.platform, { message: e.target.value })}
              placeholder="What's new in this version"
              className="mt-1 w-full rounded-md border border-outline px-3 py-2 text-sm" />
          </label>
          <button onClick={() => save(row)} disabled={savingPlatform === row.platform}
            className="inline-flex items-center gap-2 rounded-md bg-on-surface text-white px-3 py-1.5 text-sm disabled:opacity-60">
            {savingPlatform === row.platform ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {row.platform}
          </button>
        </div>
      ))}
      {msg && <p className="text-sm text-on-surface-variant">{msg}</p>}
    </section>
  )
}
