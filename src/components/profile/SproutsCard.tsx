'use client'
import Link from 'next/link'
import { Sprout, Trophy, TreeDeciduous } from 'lucide-react'
import { TIERS, TREE_STAGES, tierFor, treeStageFor } from '@/lib/sprouts'
import TreeStageSvg from '@/components/sprouts/TreeStageSvg'
import ForestPreview from '@/components/sprouts/ForestPreview'

export default function SproutsCard({
  username, lifetime, balance, seeded, forestSize, isOwnProfile, viewerIsAdmin = false,
}: {
  username: string
  lifetime: number
  balance: number
  seeded: number
  forestSize?: number
  isOwnProfile: boolean
  viewerIsAdmin?: boolean
}) {
  // Phase 1: Sprouts UI is admin-only. Card only renders when the
  // viewer is an admin and the target has any Sprouts to show.
  if (!viewerIsAdmin) return null
  if (!lifetime || lifetime <= 0) return null

  const tier = tierFor(lifetime)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const nextTier = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const toNext = nextTier ? Math.max(0, nextTier.min - lifetime) : 0
  const stage = treeStageFor(seeded)
  const stageIdx = TREE_STAGES.findIndex(s => s.stage === stage.stage)
  const nextStageAt = stageIdx >= 0 && stageIdx < TREE_STAGES.length - 1 ? TREE_STAGES[stageIdx + 1].min : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-gray-900">Sprouts</h3>
          <Link href="/sprouts" className="text-xs text-emerald-700 hover:underline">What's this?</Link>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${tier.chip}`}>
          <Trophy className="w-3 h-3" /> {tier.label}
        </div>
      </div>

      <div className="flex items-center gap-5">
        {(forestSize ?? 0) > 0 ? (
          <Link href={`/profile/${username}/forest`} className="shrink-0 hover:opacity-90" title={`Forest of ${forestSize}`}>
            <ForestPreview count={forestSize ?? 0} size={108} />
          </Link>
        ) : (
          <Link href={`/profile/${username}/sprouts`} className="shrink-0 hover:opacity-90" title={stage.label}>
            <TreeStageSvg stage={stage.stage} size={96} />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className={`grid ${isOwnProfile ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-2`}>
            <div>
              <div className="text-xl font-bold text-emerald-700">{lifetime.toLocaleString()}</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Lifetime</div>
            </div>
            {isOwnProfile && (
              <div>
                <div className="text-xl font-bold text-amber-700">{balance.toLocaleString()}</div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Balance</div>
              </div>
            )}
            <div>
              <div className="text-xl font-bold text-rose-700 flex items-center gap-1">
                <TreeDeciduous className="w-3.5 h-3.5" /> {seeded.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wide">Seeded</div>
            </div>
          </div>

          {nextTier && (
            <>
              <div className="text-xs text-gray-700 mb-1 flex justify-between">
                <span>{tier.label}</span>
                <span>{toNext.toLocaleString()} to {nextTier.label}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((lifetime / nextTier.min) * 100))}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/profile/${username}/sprouts`} className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
          {isOwnProfile ? 'View my tree' : 'View tree'}
        </Link>
        {(forestSize ?? 0) > 0 && (
          <Link href={`/profile/${username}/forest`} className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
            View forest ({forestSize})
          </Link>
        )}
        <Link href="/sprouts" className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
          How to earn
        </Link>
      </div>
      {!isOwnProfile && nextStageAt && (
        <div className="text-[11px] text-gray-600 mt-2">
          Tree stage: <span className="font-semibold">{stage.label}</span> · next at {nextStageAt.toLocaleString()} seeded
        </div>
      )}
    </div>
  )
}
