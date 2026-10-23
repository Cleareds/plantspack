'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'

interface Row {
  placeId: string
  name: string
  slug: string | null
  where: string
  archived: boolean
  owner: { username: string; email: string; since: string } | null
  plan: { status: string; source: string; interval: string | null; periodEnd: string | null; note: string | null } | null
  menu: { status: string; checkedAt: string | null } | null
  deals: { active: number; total: number }
  lastMessage: string | null
  pilot: boolean
  pilotNote: string | null
  texts: {
    deals: Array<{ title: string; details: string | null; status: string; audience: string; ends_on: string | null }>
    messages: Array<{ message: string; at: string; test: boolean; recipients: number }>
    events: Array<{ title: string | null; privacy: string; start: string | null; cancelled: boolean }>
  }
}

export default function AdminBusinessPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(() => {
    fetch('/api/admin/business', { credentials: 'include' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setRows(d.rows) })
      .catch((e) => setError(e.message || 'Could not load'))
  }, [])
  useEffect(() => { load() }, [load])
  const setPilot = async (placeId: string, pilot: boolean) => {
    if (pilot && !confirm('Make this a pilot place? Its owner gets every tool now, and its menu, deals, events and buttons become public.')) return
    setBusy(placeId)
    await fetch('/api/admin/business', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId, pilot }) }).catch(() => null)
    setBusy(null)
    load()
  }

  const partners = rows?.filter((r) => r.plan && r.plan.status !== 'canceled').length ?? 0
  const menus = rows?.filter((r) => r.menu?.status === 'published').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Business owners</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Owner tools are {BUSINESS_TOOLS_PUBLIC ? 'live for owners' : 'in admin preview (src/lib/business/launch.ts)'}.
          {rows && ` ${rows.filter((r) => r.owner).length} claimed places, ${rows.filter((r) => r.pilot).length} pilots, ${partners} on the Partner plan, ${menus} published menus.`}
        </p>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {!rows && !error && <div className="flex items-center gap-2 text-on-surface-variant"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
      {rows && (
        <div className="overflow-x-auto rounded-xl ghost-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-left text-on-surface-variant">
              <tr><th className="p-2">Place</th><th className="p-2">Owner</th><th className="p-2">Plan</th><th className="p-2">Pilot</th><th className="p-2">Menu</th><th className="p-2">Deals</th><th className="p-2">Last message</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.placeId}>
                <tr className="border-t border-outline-variant/15 align-top">
                  <td className="p-2">
                    <Link href={`/place/${r.slug || r.placeId}`} className="font-medium text-on-surface hover:text-primary">{r.name}</Link>
                    <div className="text-xs text-on-surface-variant">{r.where}{r.archived ? ' (archived)' : ''}</div>
                  </td>
                  <td className="p-2">{r.owner ? <><div>{r.owner.username}</div><div className="text-xs text-on-surface-variant">{r.owner.email}</div></> : <span className="text-on-surface-variant">none</span>}</td>
                  <td className="p-2">{r.plan && r.plan.status !== 'canceled' ? <><div className="font-medium">Partner</div><div className="text-xs text-on-surface-variant">{r.plan.source}{r.plan.interval ? `, ${r.plan.interval}` : ''}{r.plan.note ? `: ${r.plan.note}` : ''}</div></> : 'Free'}</td>
                  <td className="p-2">
                    <button type="button" disabled={busy === r.placeId} onClick={() => setPilot(r.placeId, !r.pilot)} className={`px-2 py-1 rounded-lg text-xs font-medium ${r.pilot ? 'bg-primary text-on-primary-btn' : 'ghost-border text-on-surface'}`}>
                      {r.pilot ? 'Pilot: on' : 'Make pilot'}
                    </button>
                  </td>
                  <td className="p-2">{r.menu ? `${r.menu.status}${r.menu.checkedAt ? `, ${new Date(r.menu.checkedAt).toLocaleDateString()}` : ''}` : '-'}</td>
                  <td className="p-2">{r.deals.total ? `${r.deals.active} live / ${r.deals.total}` : '-'}</td>
                  <td className="p-2">{r.lastMessage ? new Date(r.lastMessage).toLocaleDateString() : '-'}</td>
                  <td className="p-2 whitespace-nowrap">
                    <Link href={`/business/places/${r.placeId}`} className="text-primary font-medium hover:underline">Dashboard</Link>
                    {(r.texts.deals.length + r.texts.messages.length + r.texts.events.length) > 0 && (
                      <button type="button" onClick={() => setOpen(open === r.placeId ? null : r.placeId)} className="ml-3 text-on-surface-variant hover:underline">{open === r.placeId ? 'Hide texts' : 'Review texts'}</button>
                    )}
                  </td>
                </tr>
                {open === r.placeId && (
                  <tr className="bg-surface-container-low/50">
                    <td colSpan={8} className="p-3 text-xs space-y-2">
                      {r.texts.deals.length > 0 && <div><div className="font-semibold">Deals</div>{r.texts.deals.map((d, i) => <div key={i}>[{d.status}{d.audience === 'supporters' ? ', supporters' : ''}{d.ends_on ? `, until ${d.ends_on}` : ''}] <span className="font-medium">{d.title}</span>{d.details ? `: ${d.details}` : ''}</div>)}</div>}
                      {r.texts.messages.length > 0 && <div><div className="font-semibold">Messages</div>{r.texts.messages.map((m, i) => <div key={i}>[{new Date(m.at).toLocaleDateString()}, {m.test ? 'test' : `${m.recipients} people`}] {m.message}</div>)}</div>}
                      {r.texts.events.length > 0 && <div><div className="font-semibold">Events</div>{r.texts.events.map((e, i) => <div key={i}>[{e.privacy}{e.cancelled ? ', cancelled' : ''}{e.start ? `, ${new Date(e.start).toLocaleDateString()}` : ''}] {e.title}</div>)}</div>}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
