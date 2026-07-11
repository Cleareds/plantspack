'use client'

// The real-tree ceremony: a finished Vegan City (cloud-synced, score 400+ in
// PlantsPack Play) + Sapling tier + 1,000 Sprouts -> one real tree, ordered
// with a reforestation partner and fulfilled from /admin/tree-orders.
// Renders on the (admin-gated) /sprouts page.
//
// The three gates are shown as explicit chips so "why is the button
// disabled" is never a mystery - including the case where the player HAS a
// great city locally but never signed in inside the game, so no cloud save
// exists for their account (the #1 support question shape).

import { useState } from 'react'
import { TreeDeciduous, Gamepad2, Award } from 'lucide-react'
import { REAL_TREE_CITY_SCORE, REAL_TREE_COST, REAL_TREE_TIER_GATE, REAL_TREE_TIER_LABEL } from '@/lib/sprouts-constants'

interface Props {
  score: number
  hasSave: boolean
  cityName?: string
  balance: number
  lifetime: number
}

export default function RealTreeCeremony({ score, hasSave, cityName, balance, lifetime }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [dedication, setDedication] = useState('')
  const [error, setError] = useState<string | null>(null)

  const scoreOk = hasSave && score >= REAL_TREE_CITY_SCORE
  const tierOk = lifetime >= REAL_TREE_TIER_GATE
  const balanceOk = balance >= REAL_TREE_COST
  const eligible = scoreOk && tierOk && balanceOk

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
      j.reason === 'city_score_locked' ? `Your cloud-synced Vegan City needs a score of ${REAL_TREE_CITY_SCORE} first.`
      : j.reason === 'tier_locked' ? `You need ${REAL_TREE_TIER_LABEL} tier (${REAL_TREE_TIER_GATE.toLocaleString()} lifetime Sprouts) first.`
      : j.reason === 'insufficient_balance' ? 'Not enough Sprouts.'
      : `Could not plant (${j.reason ?? res.status}).`)
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-lime-50 rounded-2xl border border-emerald-200 p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <TreeDeciduous className="w-5 h-5 text-emerald-700" />
        <h2 className="font-bold text-gray-900">Plant a real tree</h2>
      </div>
      <p className="text-sm text-gray-700 mb-3">
        Finish a thriving Vegan City in PlantsPack Play (score {REAL_TREE_CITY_SCORE}+), reach {REAL_TREE_TIER_LABEL} tier,
        and turn {REAL_TREE_COST.toLocaleString()} Sprouts into a real tree, planted with a reforestation partner.
        The certificate lands on your profile.
      </p>
      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${scoreOk ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          <Gamepad2 className="w-4 h-4" />
          {hasSave
            ? <>{cityName ? `${cityName} · ` : ''}City Score {score} / {REAL_TREE_CITY_SCORE} {scoreOk ? '✓' : ''}</>
            : 'No cloud city yet'}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${tierOk ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          <Award className="w-4 h-4" /> {REAL_TREE_TIER_LABEL} tier {tierOk ? '✓' : `(${lifetime.toLocaleString()} / ${REAL_TREE_TIER_GATE.toLocaleString()} lifetime)`}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${balanceOk ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
          🌱 {balance.toLocaleString()} / {REAL_TREE_COST.toLocaleString()} Sprouts {balanceOk ? '✓' : ''}
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
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <a
            href="https://play.plantspack.com"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
          >🎮 {hasSave ? 'Grow your Vegan City' : 'Build your Vegan City'}</a>
          <span className="text-xs text-gray-600">
            {hasSave
              ? `Your cloud city scores ${score} - keep building to reach ${REAL_TREE_CITY_SCORE}.`
              : 'Open the game and SIGN IN with this account - your city syncs to the cloud while signed in. A city built while signed out lives only in that browser; signing in there uploads it.'}
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
