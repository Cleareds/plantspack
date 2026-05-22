'use client'
import Link from 'next/link'
import { Sprout, Trophy, TreeDeciduous } from 'lucide-react'
import { TIERS, TREE_STAGES, tierFor, treeStageFor } from '@/lib/sprouts'

const STAGE_EMOJI = ['◯', '🌱', '🌿', '🌳', '🌳', '🌲', '🌳', '🌲']

export default function SproutsCard({
  lifetime, balance, seeded, isOwnProfile,
}: {
  lifetime: number
  balance: number
  seeded: number
  isOwnProfile: boolean
}) {
  if (!lifetime || lifetime <= 0) return null

  const tier = tierFor(lifetime)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const nextTier = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const toNext = nextTier ? Math.max(0, nextTier.min - lifetime) : 0
  const stage = treeStageFor(seeded)
  const stageIdx = TREE_STAGES.findIndex(s => s.stage === stage.stage)
  const nextStageAt = stageIdx >= 0 && stageIdx < TREE_STAGES.length - 1 ? TREE_STAGES[stageIdx + 1].min : null

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-amber-50 rounded-2xl border-2 border-emerald-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-emerald-900">Sprouts</h3>
          <Link href="/sprouts" className="text-xs text-emerald-700 hover:underline">What's this?</Link>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
          <Trophy className="w-3 h-3" /> {tier.label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-700">{lifetime.toLocaleString()}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wide">Lifetime</div>
        </div>
        {isOwnProfile && (
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">{balance.toLocaleString()}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide">Balance</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold text-rose-700 flex items-center justify-center gap-1">
            <TreeDeciduous className="w-4 h-4" /> {seeded.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wide">Seeded</div>
        </div>
        {!isOwnProfile && (
          <div className="text-center">
            <div className="text-3xl">{STAGE_EMOJI[stage.stage]}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide">{stage.label}</div>
          </div>
        )}
      </div>

      {nextTier && (
        <div className="text-xs text-gray-700 mb-1 flex justify-between">
          <span>{tier.label}</span>
          <span>{toNext.toLocaleString()} to {nextTier.label}</span>
        </div>
      )}
      {nextTier && (
        <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((lifetime / nextTier.min) * 100))}%` }} />
        </div>
      )}

      {isOwnProfile && (
        <div className="mt-3 flex gap-2">
          <Link href="/sprouts/me" className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
            View my tree
          </Link>
          <Link href="/sprouts" className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            How to earn
          </Link>
        </div>
      )}
      {!isOwnProfile && nextStageAt && (
        <div className="text-[11px] text-gray-600 mt-2">
          Tree stage: <span className="font-semibold">{stage.label}</span> · next at {nextStageAt.toLocaleString()} seeded
        </div>
      )}
    </div>
  )
}
