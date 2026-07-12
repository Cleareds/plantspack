'use client'
import Link from 'next/link'
import { Sprout, Trophy } from 'lucide-react'
import { TIERS, tierFor } from '@/lib/sprouts'
import { SPROUTS_ENABLED_FOR_ALL } from '@/lib/sprouts-constants'

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
  // Renders for admins while the launch flag is off, for everyone after -
  // and only when the target has any Sprouts to show.
  if (!SPROUTS_ENABLED_FOR_ALL && !viewerIsAdmin) return null
  if (!lifetime || lifetime <= 0) return null

  const tier = tierFor(lifetime)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const nextTier = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const toNext = nextTier ? Math.max(0, nextTier.min - lifetime) : 0

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
        <div className="flex-1 min-w-0">
          <div className={`grid ${isOwnProfile ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-2`}>
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
          Sprouts detail
        </Link>
        <Link href="/sprouts" className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
          How to earn
        </Link>
      </div>
    </div>
  )
}
