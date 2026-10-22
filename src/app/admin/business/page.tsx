'use client'

import { useEffect, useState } from 'react'
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
}

export default function AdminBusinessPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/admin/business', { credentials: 'include' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setRows(d.rows) })
      .catch((e) => setError(e.message || 'Could not load'))
  }, [])

  const partners = rows?.filter((r) => r.plan && r.plan.status !== 'canceled').length ?? 0
  const menus = rows?.filter((r) => r.menu?.status === 'published').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Business owners</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Owner tools are {BUSINESS_TOOLS_PUBLIC ? 'live for owners' : 'in admin preview (src/lib/business/launch.ts)'}.
          {rows && ` ${rows.filter((r) => r.owner).length} claimed places, ${partners} on the Partner plan, ${menus} published menus.`}
        </p>
      </div>
      {error && <p className="text-red-700">{error}</p>}
      {!rows && !error && <div className="flex items-center gap-2 text-on-surface-variant"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
      {rows && (
        <div className="overflow-x-auto rounded-xl ghost-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-left text-on-surface-variant">
              <tr><th className="p-2">Place</th><th className="p-2">Owner</th><th className="p-2">Plan</th><th className="p-2">Menu</th><th className="p-2">Deals</th><th className="p-2">Last message</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.placeId} className="border-t border-outline-variant/15 align-top">
                  <td className="p-2">
                    <Link href={`/place/${r.slug || r.placeId}`} className="font-medium text-on-surface hover:text-primary">{r.name}</Link>
                    <div className="text-xs text-on-surface-variant">{r.where}{r.archived ? ' (archived)' : ''}</div>
                  </td>
                  <td className="p-2">{r.owner ? <><div>{r.owner.username}</div><div className="text-xs text-on-surface-variant">{r.owner.email}</div></> : <span className="text-on-surface-variant">none</span>}</td>
                  <td className="p-2">{r.plan && r.plan.status !== 'canceled' ? <><div className="font-medium">Partner</div><div className="text-xs text-on-surface-variant">{r.plan.source}{r.plan.interval ? `, ${r.plan.interval}` : ''}{r.plan.note ? `: ${r.plan.note}` : ''}</div></> : 'Free'}</td>
                  <td className="p-2">{r.menu ? `${r.menu.status}${r.menu.checkedAt ? `, ${new Date(r.menu.checkedAt).toLocaleDateString()}` : ''}` : '-'}</td>
                  <td className="p-2">{r.deals.total ? `${r.deals.active} live / ${r.deals.total}` : '-'}</td>
                  <td className="p-2">{r.lastMessage ? new Date(r.lastMessage).toLocaleDateString() : '-'}</td>
                  <td className="p-2"><Link href={`/business/places/${r.placeId}`} className="text-primary font-medium hover:underline">Dashboard</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
