import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getForest } from '@/lib/sprouts'
import { ArrowLeft, TreeDeciduous } from 'lucide-react'
import ForestPreview from '@/components/sprouts/ForestPreview'

export const dynamic = 'force-dynamic'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const TRUNK = '#7c4a1e'
const LEAF_DARK = '#047857'
const LEAF_MID = '#10b981'
const LEAF_LIGHT = '#6ee7b7'

// One small mature tree drawn at a given position. Centred on (cx, baseY).
function ForestTreeIcon({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const s = scale
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d={`M ${-4 * s} 0 L 0 ${-70 * s} L ${4 * s} 0 Z`} fill={TRUNK} />
      <ellipse cx={0} cy={-58 * s} rx={30 * s} ry={24 * s} fill={LEAF_DARK} />
      <ellipse cx={-16 * s} cy={-48 * s} rx={14 * s} ry={11 * s} fill={LEAF_MID} />
      <ellipse cx={16 * s} cy={-48 * s} rx={14 * s} ry={11 * s} fill={LEAF_MID} />
      <ellipse cx={-6 * s} cy={-66 * s} rx={10 * s} ry={7 * s} fill={LEAF_LIGHT} opacity="0.9" />
    </g>
  )
}

export default async function ForestPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  // Admin-only during phase 1
  const sb = await createClient()
  const { data: { user: viewer } } = await sb.auth.getUser()
  if (!viewer) notFound()
  const { data: viewerProf } = await sb.from('users').select('role').eq('id', viewer.id).maybeSingle()
  if ((viewerProf as any)?.role !== 'admin') notFound()

  const { data: target } = await admin.from('users')
    .select('id, username, avatar_url, forest_size').eq('username', username).maybeSingle()
  if (!target) notFound()
  const trees = await getForest(target.id)

  // Lay out trees in a multi-row natural-looking grid. Earlier trees in back rows.
  // We pre-compute positions so the trees don't visually overlap awkwardly.
  const positions = trees.map((_, i) => {
    const row = Math.floor(i / 5)
    const col = i % 5
    const x = 60 + col * 110 + (row % 2 ? 55 : 0)
    const y = 220 + row * 110
    const scale = 1 - row * 0.15
    return { x, y, scale: Math.max(0.5, scale) }
  })

  const width = 700
  const rows = Math.max(1, Math.ceil(trees.length / 5))
  const height = 280 + rows * 110

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link href={`/profile/${username}/sprouts`} className="text-sm text-gray-700 hover:underline inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to @{username}'s tree
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <TreeDeciduous className="w-7 h-7 text-emerald-700" /> @{username}'s forest
        </h1>
        <p className="text-gray-600 mb-6">
          {trees.length === 0
            ? 'No matured trees yet. Each tree that reaches Heritage stage is replanted here.'
            : `${trees.length} matured ${trees.length === 1 ? 'tree' : 'trees'} - each one was grown to Heritage stage from contributions on PlantsPack.`}
        </p>

        {trees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <ForestPreview count={0} size={160} showBadge={false} />
            <p className="mt-4">Plant your first tree by seeding Sprouts at <Link href={`/profile/${username}/sprouts`} className="underline text-emerald-700">the tree page</Link>.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-sky-50 via-white to-lime-50 rounded-2xl border border-gray-200 p-4 overflow-x-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${width} ${height}`}
              width="100%"
              role="img"
              aria-label={`Forest of ${trees.length} trees`}
            >
              {/* sun + clouds */}
              <circle cx={width - 80} cy={70} r={32} fill="#fde68a" opacity="0.9" />
              <circle cx={width - 80} cy={70} r={42} fill="#fde68a" opacity="0.3" />
              <ellipse cx={140} cy={90} rx={50} ry={14} fill="#fff" opacity="0.85" />
              <ellipse cx={320} cy={60} rx={62} ry={16} fill="#fff" opacity="0.85" />
              {/* ground bands (parallax) */}
              {Array.from({ length: rows + 2 }).map((_, i) => (
                <ellipse key={i} cx={width / 2} cy={200 + i * 110} rx={width * 0.7} ry={28} fill="#65a30d" opacity={0.2 + i * 0.06} />
              ))}
              {/* trees, sorted by y so back rows draw first */}
              {positions
                .map((p, i) => ({ ...p, t: trees[i], i }))
                .sort((a, b) => a.y - b.y)
                .map(({ x, y, scale, t, i }) => (
                  <g key={t.id}>
                    <ForestTreeIcon cx={x} cy={y} scale={scale} />
                    <title>{`Tree #${i + 1} - matured ${new Date(t.matured_at).toLocaleDateString()}`}</title>
                  </g>
                ))}
            </svg>
          </div>
        )}

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {trees.map((t, i) => (
            <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-3 text-sm flex items-center gap-3">
              <ForestPreview count={0} size={48} showBadge={false} />
              <div>
                <div className="font-semibold text-gray-900">Tree #{i + 1}</div>
                <div className="text-xs text-gray-600">
                  Matured {new Date(t.matured_at).toLocaleDateString()} - {t.sprouts_seeded.toLocaleString()} Sprouts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
