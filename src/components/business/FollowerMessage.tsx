'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Megaphone } from 'lucide-react'
import { track } from '@/lib/analytics'

interface Info {
  followers: number
  history: Array<{ message: string; recipients: number; test_only: boolean; created_at: string }>
  canSend: boolean
  previewOnly: boolean
  sentThisMonth: boolean
  city: string | null
}

export default function FollowerMessage({ placeId }: { placeId: string }) {
  const [info, setInfo] = useState<Info | null>(null)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState<'test' | 'real' | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(() => {
    fetch(`/api/business/places/${placeId}/message`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 402) { setLocked(true); return }
        if (!r.ok) { setError(d.error || 'This page could not be loaded.'); return }
        setInfo(d)
      })
      .catch(() => setError('This page could not be loaded.'))
  }, [placeId])
  useEffect(() => { load() }, [load])

  const send = async (test: boolean) => {
    if (!test && !confirm(`Send this message to ${info?.followers ?? 0} people? You can send one message a month.`)) return
    setSending(test ? 'test' : 'real')
    setMsg(null)
    const r = await fetch(`/api/business/places/${placeId}/message`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, test }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    setSending(null)
    if (!r?.ok) { setMsg({ kind: 'error', text: d.error || 'Sending failed.' }); return }
    track('owner_tool_used', { tool: 'message', action: test ? 'test' : 'send' })
    setMsg({ kind: 'ok', text: test ? 'Test sent. Check your notifications on PlantsPack.' : `Sent to ${d.recipients} people.` })
    if (!test) setText('')
    load()
  }

  if (locked) {
    return (
      <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Messages to followers are part of the Partner plan</h1>
        <p className="text-on-surface-variant mb-4">Send one short message a month to people who follow your city on PlantsPack.</p>
        <Link href={`/business/places/${placeId}/plan`} className="inline-flex px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium">See the Partner plan</Link>
      </div>
    )
  }
  if (error) return <p className="text-on-surface">{error}</p>
  if (!info) return <div className="flex items-center gap-2 text-on-surface-variant py-16"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Message followers</h1>
        <p className="text-on-surface-variant mt-1">
          {info.followers.toLocaleString()} {info.followers === 1 ? 'person follows' : 'people follow'} {info.city || 'your city'} on PlantsPack.
          One message a month goes to their PlantsPack notifications, with a link to your page. No email, no push.
        </p>
      </div>

      <section className="rounded-2xl ghost-border bg-surface-container-lowest p-5 space-y-3">
        <label className="block text-sm text-on-surface">
          Your message
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={200} rows={3} placeholder="New autumn menu from Friday: pumpkin gnocchi and a chestnut tart." className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low ghost-border" />
        </label>
        <div className="flex justify-between text-xs text-on-surface-variant"><span>Write about something new: a dish, an event, new hours or a deal.</span><span>{text.length}/200</span></div>
        <div className="rounded-xl bg-surface-container-low p-3 text-sm">
          <span className="text-on-surface-variant">Preview: </span>
          <span className="inline-flex items-center gap-1 text-on-surface"><Megaphone className="h-3.5 w-3.5 text-primary" /> Your place: {text || 'your message'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => send(true)} disabled={!!sending || text.trim().length < 10} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl ghost-border text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50">
            {sending === 'test' && <Loader2 className="h-4 w-4 animate-spin" />} Send a test to me
          </button>
          <button type="button" onClick={() => send(false)} disabled={!!sending || text.trim().length < 10 || !info.canSend} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50">
            {sending === 'real' && <Loader2 className="h-4 w-4 animate-spin" />} Send to {info.followers.toLocaleString()} followers
          </button>
        </div>
        {info.sentThisMonth && <p className="text-sm text-on-surface-variant">You already sent this month&apos;s message. The next one can go out on the 1st.</p>}
        {info.previewOnly && !info.sentThisMonth && <p className="text-sm text-on-surface-variant">Only test messages for now: sending to followers opens with the Partner plan.</p>}
      </section>

      {msg && <div className={`p-3 rounded-xl text-sm ${msg.kind === 'ok' ? 'bg-primary/10 text-on-surface' : 'bg-red-50 text-red-800'}`}>{msg.text}</div>}

      {info.history.length > 0 && (
        <section>
          <h2 className="font-semibold text-on-surface mb-2">Sent</h2>
          <ul className="space-y-2">
            {info.history.map((h, i) => (
              <li key={i} className="text-sm rounded-xl ghost-border p-3">
                <div className="text-on-surface">{h.message}</div>
                <div className="text-xs text-on-surface-variant mt-1">{new Date(h.created_at).toLocaleDateString()} · {h.test_only ? 'test to you' : `${h.recipients} people`}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
