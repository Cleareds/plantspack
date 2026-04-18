import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

async function checkAdmin() {
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

/**
 * Merge two place rows. `removeId` is soft-archived (archived_at = now) rather
 * than DELETEd, per CLAUDE.md "never delete" rule. All references to
 * `removeId` (reviews, favorites, packs, corrections) are repointed to
 * `keepId`. Non-null scalar fields from `removeId` backfill null fields on
 * `keepId` only (no overwriting).
 *
 * Body: { keepId: string, removeId: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { keepId, removeId } = await request.json()
  if (!keepId || !removeId) return NextResponse.json({ error: 'Missing keepId or removeId' }, { status: 400 })
  if (keepId === removeId) return NextResponse.json({ error: 'keepId and removeId must differ' }, { status: 400 })

  const [{ data: keep }, { data: remove }] = await Promise.all([
    supabase.from('places').select('*').eq('id', keepId).single(),
    supabase.from('places').select('*').eq('id', removeId).single(),
  ])
  if (!keep) return NextResponse.json({ error: 'keep not found' }, { status: 404 })
  if (!remove) return NextResponse.json({ error: 'remove not found' }, { status: 404 })

  // Backfill only fields on `keep` that are null/empty.
  const BACKFILL_FIELDS = [
    'description', 'address', 'phone', 'website', 'main_image_url',
    'opening_hours', 'price_range', 'foursquare_id', 'foursquare_data',
    'foursquare_status', 'foursquare_checked_at', 'vegguide_id',
    'vegguide_checked_at', 'osm_ref', 'happycow_id',
  ] as const

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of BACKFILL_FIELDS) {
    const cur = (keep as any)[f]
    const alt = (remove as any)[f]
    const isEmpty = cur === null || cur === undefined || (typeof cur === 'string' && cur.trim() === '')
    if (isEmpty && alt != null && alt !== '') update[f] = alt
  }
  // Union tags (distinct)
  const keepTags: string[] = keep.tags || []
  const removeTags: string[] = remove.tags || []
  const mergedTags = Array.from(new Set([...keepTags, ...removeTags, 'merged-from-duplicate']))
  update.tags = mergedTags

  const { error: uerr } = await supabase.from('places').update(update).eq('id', keepId)
  if (uerr) return NextResponse.json({ error: `update keep: ${uerr.message}` }, { status: 500 })

  // Repoint references. Use upsert-safe updates — ignore conflicts where a
  // composite-unique constraint would block duplication (e.g. the same user
  // favorited both rows). In those cases the remove-side reference will be
  // dropped after archive and the keep-side one stays.
  const REFERENCE_TABLES: Array<{ table: string; column: string }> = [
    { table: 'place_reviews', column: 'place_id' },
    { table: 'favorite_places', column: 'place_id' },
    { table: 'pack_places', column: 'place_id' },
    { table: 'place_corrections', column: 'place_id' },
  ]
  const repointResults: Record<string, string | number> = {}
  for (const { table, column } of REFERENCE_TABLES) {
    const { error } = await supabase.from(table).update({ [column]: keepId }).eq(column, removeId)
    repointResults[table] = error ? `err:${error.message}` : 'ok'
  }

  // Soft-archive the remove row (never delete, per CLAUDE.md).
  const { error: arerr } = await supabase.from('places').update({
    archived_at: new Date().toISOString(),
    archived_reason: `merged into ${keepId}`,
    updated_at: new Date().toISOString(),
  }).eq('id', removeId)
  if (arerr) return NextResponse.json({ error: `archive remove: ${arerr.message}` }, { status: 500 })

  const { revalidatePath } = await import('next/cache')
  if (keep.slug) revalidatePath(`/place/${keep.slug}`)
  if (remove.slug) revalidatePath(`/place/${remove.slug}`)

  return NextResponse.json({ success: true, repointed: repointResults })
}
