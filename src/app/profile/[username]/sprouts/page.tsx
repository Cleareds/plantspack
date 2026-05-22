import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getMyState, TREE_STAGES } from '@/lib/sprouts'
import { Sprout, TreeDeciduous, ArrowLeft } from 'lucide-react'
import SeedTreeButton from './SeedTreeButton'
import TreeStageSvg from '@/components/sprouts/TreeStageSvg'

export const dynamic = 'force-dynamic'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export default async function ProfileSproutsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  // Admin-only during phase 1
  const sbAuth = await createClient()
  const { data: { user: viewer } } = await sbAuth.auth.getUser()
  if (!viewer) notFound()
  const { data: viewerProf } = await sbAuth.from('users').select('role').eq('id', viewer.id).maybeSingle()
  if ((viewerProf as any)?.role !== 'admin') notFound()

  const { data: targetUser } = await admin.from('users')
    .select('id, username, avatar_url, sprouts_lifetime, sprouts_balance, sprouts_seeded, forest_size')
    .eq('username', username).maybeSingle()
  if (!targetUser) notFound()
  const forestSize = (targetUser as any).forest_size ?? 0

  const isOwn = viewer.id === targetUser.id

  // If the target has no Sprouts yet, show an empty-state page rather than 404
  const state = await getMyState(targetUser.id)
  const treeProgress = state?.tree.nextStageAt
    ? Math.min(100, Math.round((state.seeded / state.tree.nextStageAt) * 100))
    : 100

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">

        <Link href={`/profile/${username}`} className="text-sm text-gray-700 hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to @{username}
        </Link>

        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sprout className="w-7 h-7 text-emerald-600" /> {isOwn ? 'Your Sprouts' : `@${username}'s Sprouts`}
            </h1>
            <p className="text-gray-600 text-sm">
              <Link href="/sprouts" className="underline hover:text-emerald-700">What are Sprouts?</Link>
            </p>
          </div>
          {forestSize > 0 && (
            <Link
              href={`/profile/${username}/forest`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 whitespace-nowrap"
            >
              <TreeDeciduous className="w-4 h-4" /> View forest ({forestSize})
            </Link>
          )}
        </div>

        {!state || state.lifetime === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No Sprouts yet.
          </div>
        ) : (
          <>
            <div className={`grid ${isOwn ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-8`}>
              {isOwn && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <div className="text-4xl font-bold text-emerald-700">{state.balance.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 mt-1">Balance (spendable)</div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="text-4xl font-bold text-amber-700">{state.lifetime.toLocaleString()}</div>
                <div className="text-xs text-gray-600 mt-1">Lifetime ({state.tier.label})</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <div className="text-4xl font-bold text-rose-700">{state.seeded.toLocaleString()}</div>
                <div className="text-xs text-gray-600 mt-1">Seeded into tree</div>
              </div>
            </div>

            {state.nextTier && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">{state.tier.label}</span>
                  <span className="text-gray-600">{state.toNext.toLocaleString()} to {state.nextTier.label}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((state.lifetime / state.nextTier.min) * 100))}%` }} />
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TreeDeciduous className="w-5 h-5 text-emerald-700" /> {isOwn ? 'Your tree' : 'Their tree'}
                </h2>
                <span className="text-sm text-gray-600">{state.tree.label}</span>
              </div>
              <div className="flex flex-col items-center py-6">
                <TreeStageSvg stage={state.tree.stage} size={220} />
                <div className="text-sm text-gray-600 mt-2">Stage {state.tree.stage} of {TREE_STAGES.length - 1}</div>
              </div>
              {state.tree.nextStageAt && (
                <>
                  <div className="text-xs text-gray-600 mb-1 flex justify-between">
                    <span>{state.seeded.toLocaleString()}</span>
                    <span>Next: {state.tree.nextStageAt.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${treeProgress}%` }} />
                  </div>
                </>
              )}
              {isOwn && (
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  <SeedTreeButton balance={state.balance} amount={100} />
                  <SeedTreeButton balance={state.balance} amount={500} />
                  <SeedTreeButton balance={state.balance} amount={1000} />
                </div>
              )}
            </div>

            {isOwn && (
              <section className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Recent activity</h2>
                {state.recent.length === 0 && <p className="text-sm text-gray-600">No activity yet.</p>}
                <ul className="divide-y divide-gray-100">
                  {state.recent.map(r => {
                    const isStageUp = r.action_type === 'tree_stage_reached'
                    const isMatured = r.action_type === 'tree_matured'
                    const stageLabel = (r.metadata as any)?.label
                    const finalSeeded = (r.metadata as any)?.final_seeded
                    let label: string
                    if (isStageUp) label = `Reached: ${stageLabel ?? `stage ${(r.metadata as any)?.stage}`}`
                    else if (isMatured) label = `Tree matured! Planted in your forest (${finalSeeded?.toLocaleString?.() ?? ''} Sprouts)`
                    else label = r.action_type.replace(/_/g, ' ').replace(/\./g, ' / ')
                    return (
                      <li key={r.id} className="py-2 flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {(isStageUp || isMatured) && <span className="text-base shrink-0">{isMatured ? '🌳' : '🌱'}</span>}
                          <div className="min-w-0">
                            <div className={`truncate ${isMatured ? 'text-amber-800 font-semibold' : isStageUp ? 'text-emerald-800 font-semibold' : 'text-gray-900'}`}>{label}</div>
                            <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        {(isStageUp || isMatured) ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold whitespace-nowrap">milestone</span>
                        ) : (
                          <div className={`font-mono font-semibold whitespace-nowrap ${r.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {r.amount >= 0 ? `+${r.amount}` : r.amount}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
