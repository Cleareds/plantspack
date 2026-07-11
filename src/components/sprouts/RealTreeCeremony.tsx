'use client'

// The real-tree ceremony. Reachable from EITHER engagement loop:
//   - contribute on PlantsPack -> pay the full price in Sprouts (no game)
//   - master PlantsPack Play   -> your Vegan City Score discounts the price
//                                 (2 Sprouts per point, FREE at score 750)
// Both loops combine smoothly: score 400 city = 700 Sprouts.
//
// Only a cloud-synced city counts (the game syncs while signed in). One tree
// per account per 90 days; orders are fulfilled from /admin/tree-orders.

import { useState } from 'react'
import { TreeDeciduous, Gamepad2 } from 'lucide-react'
import { realTreeCost, REAL_TREE_BASE_COST, REAL_TREE_FREE_SCORE, REAL_TREE_SCORE_DISCOUNT } from '@/lib/sprouts-constants'

interface Props {
  score: number
  hasSave: boolean
  cityName?: string
  balance: number
}

export default function RealTreeCeremony({ score, hasSave, cityName, balance }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [dedication, setDedication] = useState('')
  const [error, setError] = useState<string | null>(null)

  const effectiveScore = hasSave ? score : 0
  const price = realTreeCost(effectiveScore)
  const discount = REAL_TREE_BASE_COST - price
  const isFree = price === 0
  const eligible = isFree || balance >= price

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
    else setError(
      j.reason === 'cooldown' ? 'One real tree per 90 days - yours is already growing. Come back soon!'
      : j.reason === 'insufficient_balance' ? 'Not enough Sprouts for the current price.'
      : `Could not plant (${j.reason ?? res.status}).`)
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-lime-50 rounded-2xl border border-emerald-200 p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <TreeDeciduous className="w-5 h-5 text-emerald-700" />
        <h2 className="font-bold text-gray-900">Plant a real tree</h2>
      </div>
      <p className="text-sm text-gray-700 mb-3">
        A real tree, planted with a reforestation partner, the certificate on your profile. Two ways to earn it:
        contribute on PlantsPack ({REAL_TREE_BASE_COST.toLocaleString()} Sprouts), or build your Vegan City in
        PlantsPack Play - every score point cuts the price by {REAL_TREE_SCORE_DISCOUNT} Sprouts, and a
        score-{REAL_TREE_FREE_SCORE} city makes it <b>free</b>. Mix both however you like.
      </p>
      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${discount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          <Gamepad2 className="w-4 h-4" />
          {hasSave
            ? <>{cityName ? `${cityName} · ` : ''}Score {score} = -{discount.toLocaleString()} Sprouts</>
            : 'No cloud city yet (full price)'}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          🌱 Your price: {isFree ? 'FREE' : `${price.toLocaleString()} Sprouts`}
          {!isFree && <> (you have {balance.toLocaleString()})</>}
          {eligible ? ' ✓' : ''}
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
      {!done && !isFree && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <a
            href="https://play.plantspack.com"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
          >🎮 {hasSave ? 'Grow your city, lower the price' : 'Build your Vegan City'}</a>
          <span className="text-xs text-gray-600">
            {hasSave
              ? `Score ${REAL_TREE_FREE_SCORE - score > 0 ? `${REAL_TREE_FREE_SCORE} (` + (REAL_TREE_FREE_SCORE - score).toLocaleString() + ' to go)' : REAL_TREE_FREE_SCORE} makes the tree free.`
              : 'Open the game and SIGN IN with this account - your city syncs to the cloud while signed in. A city built while signed out lives only in that browser; signing in there uploads it.'}
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
