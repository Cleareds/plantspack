/**
 * Fix bad rows in place_slug_aliases:
 *   - target row is archived (alias resolves to a 4xx / loop), OR
 *   - target.slug == old_slug (self-referential => infinite redirect)
 *
 * Strategy:
 *   1. Try to follow archived_reason='duplicate_of:<slug>' or
 *      'duplicate_source_id:<uuid>' transitively to a live keeper.
 *   2. If we land on a live row, repoint the alias.
 *   3. Otherwise delete the alias (better a 404 than a loop).
 *
 * Idempotent. Read-only by default — set APPLY=1 to mutate.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const APPLY = process.env.APPLY === '1'

type PlaceLite = { id: string; slug: string | null; archived_at: string | null; archived_reason: string | null }

async function loadPlace(idOrSlug: string): Promise<PlaceLite | null> {
  // First by id (uuid pattern), else by slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  const q = sb.from('places').select('id, slug, archived_at, archived_reason')
  const res = isUuid ? await q.eq('id', idOrSlug).maybeSingle() : await q.eq('slug', idOrSlug).order('archived_at', { ascending: true, nullsFirst: true }).limit(1).maybeSingle()
  return (res.data as any) ?? null
}

async function resolveLiveKeeper(start: PlaceLite, depth = 0): Promise<PlaceLite | null> {
  if (depth > 5) return null
  if (!start.archived_at) return start
  const reason = (start.archived_reason || '').trim()
  let nextRef: string | null = null
  let m: RegExpExecArray | null
  if ((m = /^duplicate_of:(.+)$/.exec(reason))) nextRef = m[1].trim()
  else if ((m = /^duplicate_source_id:(.+)$/.exec(reason))) nextRef = m[1].trim()
  else if ((m = /^duplicate:(.+)$/.exec(reason))) nextRef = m[1].trim()
  if (!nextRef) return null
  const next = await loadPlace(nextRef)
  if (!next) return null
  return resolveLiveKeeper(next, depth + 1)
}

async function main() {
  // Load all aliases with their target
  const all: any[] = []
  let last = ''
  while (true) {
    const { data, error } = await sb
      .from('place_slug_aliases')
      .select('old_slug, place_id, places(id, slug, archived_at, archived_reason)')
      .gt('old_slug', last)
      .order('old_slug')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    last = data[data.length - 1].old_slug
    if (data.length < 1000) break
  }
  console.log(`Loaded ${all.length} aliases`)

  let repointed = 0
  let deleted = 0
  let okay = 0
  let unrepairable = 0
  const log: any[] = []

  for (const a of all) {
    const tgt: PlaceLite | null = a.places
    if (!tgt) {
      // Orphan — alias points to a missing row. Delete.
      if (APPLY) await sb.from('place_slug_aliases').delete().eq('old_slug', a.old_slug)
      deleted++
      continue
    }
    const isSelf = tgt.slug === a.old_slug
    const isArchived = !!tgt.archived_at
    if (!isSelf && !isArchived) {
      okay++
      continue
    }
    // Try to resolve a live keeper transitively
    const keeper = await resolveLiveKeeper(tgt)
    if (keeper && keeper.slug && keeper.slug !== a.old_slug && !keeper.archived_at) {
      if (APPLY) {
        const { error } = await sb
          .from('place_slug_aliases')
          .update({ place_id: keeper.id })
          .eq('old_slug', a.old_slug)
        if (error) console.warn(`repoint failed for ${a.old_slug}: ${error.message}`)
      }
      repointed++
      log.push({ action: 'repoint', old_slug: a.old_slug, new_target_slug: keeper.slug })
    } else {
      if (APPLY) {
        const { error } = await sb.from('place_slug_aliases').delete().eq('old_slug', a.old_slug)
        if (error) console.warn(`delete failed for ${a.old_slug}: ${error.message}`)
      }
      deleted++
      unrepairable++
      log.push({ action: 'delete', old_slug: a.old_slug, reason: isSelf ? 'self_ref' : 'archived_no_keeper' })
    }
  }

  const summary = { mode: APPLY ? 'apply' : 'dry_run', total: all.length, okay, repointed, deleted, unrepairable }
  console.log(JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join('scripts', 'seo-out', 'bad-aliases-fix.json'), JSON.stringify({ summary, sample: log.slice(0, 50) }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
