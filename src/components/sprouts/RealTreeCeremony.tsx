'use client'

// The real-tree ceremony: 1,000 Sprouts + a finished Vegan City (score 400 in
// PlantsPack Play) -> one real tree, ordered with a reforestation partner and
// fulfilled from /admin/tree-orders. Renders on the (admin-gated) /sprouts page.

import { useState } from 'react'
import { TreeDeciduous, Gamepad2 } from 'lucide-react'

const SCORE_GATE = 400
const COST = 1000

export default function RealTreeCeremony({ score, balance }: { score: number; balance: number }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [dedication, setDedication] = useState('')
  const [error, setError] = useState<string | null>(null)

  const scoreOk = score >= SCORE_GATE
  const balanceOk = balance >= COST
  const eligible = scoreOk && balanceOk

  const plant = async () => {
    setBusy(true); setError(null)
    const res = await fetch('/api/sprouts/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardType: 'real_tree', payload: dedication.trim() ? { dedication: dedication.trim() } : {} }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (j.ok) setDone(true)
    else setError(j.reason === 'city_score_locked' ? `Your Vegan City needs a score of ${SCORE_GATE} first.` : j.reason === 'insufficient_balance' ? 'Not enough Sprouts.' : `Could not plant (${j.reason ?? res.status}).`)
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-lime-50 rounded-2xl border border-emerald-200 p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <TreeDeciduous className="w-5 h-5 text-emerald-700" />
        <h2 className="font-bold text-gray-900">Plant a real tree</h2>
      </div>
      <p className="text-sm text-gray-700 mb-3">
        Finish a thriving Vegan City in PlantsPack Play (score {SCORE_GATE}+) and turn {COST.toLocaleString()} Sprouts
        into a real tree, planted with a reforestation partner. The certificate lands on your profile.
      </p>
      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${scoreOk ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          <Gamepad2 className="w-4 h-4" /> City Score {score} / {SCORE_GATE} {scoreOk ? '✓' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${balanceOk ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          🌱 {balance.toLocaleString()} / {COST.toLocaleString()} Sprouts {balanceOk ? '✓' : ''}
        </span>
      </div>
      {done ? (
        <p className="text-sm font-semibold text-emerald-800">
          🌳 Your tree is queued! We order it with the partner and you get a notification (and the certificate on your profile) once it is in the ground.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            maxLength={200}
            placeholder="Optional dedication (shown with your tree)"
            className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <button
            onClick={plant}
            disabled={!eligible || busy}
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2 disabled:opacity-40"
          >{busy ? 'Planting…' : 'Plant my tree 🌳'}</button>
        </div>
      )}
      {!scoreOk && !done && (
        <p className="text-xs text-gray-600 mt-2">
          Build your city at <a href="https://play.plantspack.com" className="text-emerald-700 font-semibold hover:underline">play.plantspack.com</a> - sign in with this account so your score counts.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
