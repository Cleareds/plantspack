import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getMyState, TREE_STAGES } from '@/lib/sprouts'
import { Sprout, TreeDeciduous, ArrowLeft } from 'lucide-react'
import SeedTreeButton from './SeedTreeButton'

export const dynamic = 'force-dynamic'

export default async function MySproutsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/')
  const { data: profile } = await sb.from('users').select('role, username').eq('id', user.id).maybeSingle()
  if ((profile as any)?.role !== 'admin') redirect('/sprouts')

  const state = await getMyState(user.id)
  if (!state) redirect('/sprouts')

  const stageEmoji = ['◯','🌱','🌿','🌳','🌳','🌲','🌳','🌲']
  const treeProgress = state.tree.nextStageAt
    ? Math.min(100, Math.round((state.seeded / state.tree.nextStageAt) * 100))
    : 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="mx-auto max-w-3xl px-4 py-10">

        <Link href="/sprouts" className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sprouts
        </Link>

        <h1 className="text-3xl font-bold text-emerald-900 mb-1 flex items-center gap-2">
          <Sprout className="w-7 h-7 text-emerald-600" /> Your Sprouts
        </h1>
        <p className="text-gray-600 mb-6">@{(profile as any)?.username || 'admin'}</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
            <div className="text-4xl font-bold text-emerald-700">{state.balance.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-1">Balance (spendable)</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5 text-center">
            <div className="text-4xl font-bold text-amber-700">{state.lifetime.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-1">Lifetime ({state.tier.label})</div>
          </div>
          <div className="bg-white rounded-xl border border-rose-200 p-5 text-center">
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

        {/* Tree */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
              <TreeDeciduous className="w-5 h-5" /> Your tree
            </h2>
            <span className="text-sm text-gray-600">{state.tree.label}</span>
          </div>
          <div className="text-center py-6">
            <div className="text-7xl">{stageEmoji[state.tree.stage]}</div>
            <div className="text-sm text-gray-600 mt-2">Stage {state.tree.stage} of {TREE_STAGES.length - 1}</div>
          </div>
          {state.tree.nextStageAt && (
            <>
              <div className="text-xs text-gray-600 mb-1 flex justify-between">
                <span>{state.seeded.toLocaleString()}</span>
                <span>Next: {state.tree.nextStageAt.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-emerald-50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${treeProgress}%` }} />
              </div>
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            <SeedTreeButton balance={state.balance} amount={100} />
            <SeedTreeButton balance={state.balance} amount={500} />
            <SeedTreeButton balance={state.balance} amount={1000} />
          </div>
        </div>

        {/* Recent ledger */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-emerald-900 mb-3">Recent activity</h2>
          {state.recent.length === 0 && <p className="text-sm text-gray-600">No activity yet.</p>}
          <ul className="divide-y divide-gray-100">
            {state.recent.map(r => (
              <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="text-gray-900">{r.action_type.replace(/_/g, ' ').replace(/\./g, ' / ')}</div>
                  <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className={`font-mono font-semibold ${r.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {r.amount >= 0 ? `+${r.amount}` : r.amount}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
