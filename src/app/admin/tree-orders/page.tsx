'use client'

// Real-tree fulfillment queue. A queued row = a player spent 1,000 Sprouts
// (with a finished Vegan City) and is owed a real planted tree. Order it with
// the partner (Tree-Nation / One Tree Planted / ...), then mark it planted
// with the partner reference - the player gets a notification.

import { useCallback, useEffect, useState } from 'react'
import { TreeDeciduous, RefreshCw } from 'lucide-react'

interface Order {
  id: string
  user_id: string
  sprouts_spent: number
  status: string
  partner: string | null
  partner_tree_id: string | null
  tree_location: string | null
  user_message: string | null
  notes: string | null
  planted_at: string | null
  created_at: string
  users?: { username?: string | null; email?: string | null } | null
}

const TABS = ['queued', 'planted', 'all'] as const

export default function TreeOrdersAdmin() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('queued')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/tree-orders?status=${tab}`)
    const j = await res.json().catch(() => ({}))
    setOrders(j.orders ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const fulfill = async (o: Order, form: HTMLFormElement) => {
    const fd = new FormData(form)
    setBusy(o.id)
    const res = await fetch('/api/admin/tree-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: o.id,
        status: 'planted',
        partner: fd.get('partner'),
        partner_tree_id: fd.get('partner_tree_id'),
        tree_location: fd.get('tree_location'),
        notes: fd.get('notes'),
      }),
    })
    setBusy(null)
    if (res.ok) load()
    else alert('Failed to update the order')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <TreeDeciduous className="w-6 h-6 text-emerald-700" />
        <h1 className="text-2xl font-bold text-gray-900">Real tree orders</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        1,000 Sprouts + Vegan City Score 300 → one real tree. Order it with the
        partner, paste the reference here, mark planted.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${tab === t ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
          >{t}</button>
        ))}
        <button onClick={load} className="ml-auto p-2 rounded-full border border-gray-300 hover:border-gray-400" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No {tab === 'all' ? '' : tab + ' '}orders.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-bold text-gray-900">@{o.users?.username ?? o.user_id.slice(0, 8)}</span>
                  <span className="text-xs text-gray-500 ml-2">{new Date(o.created_at).toLocaleDateString()}</span>
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${o.status === 'planted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{o.status}</span>
                </div>
                <span className="text-xs text-gray-500">{o.sprouts_spent} sprouts</span>
              </div>
              {o.user_message && <p className="text-sm text-gray-700 mt-2 italic">“{o.user_message}”</p>}
              {o.status === 'planted' ? (
                <p className="text-sm text-gray-700 mt-2">
                  🌳 {o.partner ?? 'partner'} · {o.partner_tree_id ?? 'no ref'} · {o.tree_location ?? 'location n/a'}
                  {o.planted_at && <span className="text-gray-500"> · {new Date(o.planted_at).toLocaleDateString()}</span>}
                </p>
              ) : (
                <form
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3"
                  onSubmit={(e) => { e.preventDefault(); fulfill(o, e.currentTarget) }}
                >
                  <input name="partner" placeholder="Partner (e.g. Tree-Nation)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                  <input name="partner_tree_id" placeholder="Partner tree id / certificate URL" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                  <input name="tree_location" placeholder="Location (e.g. Madagascar)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input name="notes" placeholder="Notes (optional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button
                    type="submit"
                    disabled={busy === o.id}
                    className="sm:col-span-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-2 disabled:opacity-50"
                  >{busy === o.id ? 'Saving…' : 'Mark planted 🌳'}</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
