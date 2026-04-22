/**
 * Backfill slugs for posts that have NULL slug.
 *
 * 18 posts in the DB render at /post/{uuid} with no canonical URL, which
 * puts them in GSC's "duplicate without user-selected canonical" bucket.
 * Generate a slug from title (or content first line), using the same
 * slugify pattern the rest of the app uses.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Matches supabase/migrations slug trigger (unaccent + lowercase + [^a-z0-9]+ → -).
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  let candidate = base || 'post'
  let counter = 0
  // Loop until we find an unused slug — max 50 attempts.
  for (let i = 0; i < 50; i++) {
    const tryValue = counter === 0 ? candidate : `${candidate}-${counter}`
    const { data: clash } = await sb
      .from('posts')
      .select('id')
      .eq('slug', tryValue)
      .neq('id', excludeId)
      .maybeSingle()
    if (!clash) return tryValue
    counter++
  }
  throw new Error(`Could not find unique slug for base="${candidate}"`)
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)

  const { data: posts, error } = await sb
    .from('posts')
    .select('id, title, content, category, created_at')
    .is('slug', null)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  console.log(`Found ${posts?.length || 0} posts with NULL slug\n`)

  let written = 0
  for (const p of (posts || []) as any[]) {
    // Prefer title, fall back to first 60 chars of content, then uuid fragment.
    const source =
      (p.title && p.title.trim()) ||
      (p.content && p.content.trim().split(/\s+/).slice(0, 8).join(' ')) ||
      p.id.slice(0, 8)
    const base = slugify(source)
    const slug = await uniqueSlug(base, p.id)

    console.log(`  ${p.id.slice(0, 8)}  "${source.slice(0, 50)}"  →  ${slug}`)

    if (!DRY_RUN) {
      const { error: upErr } = await sb.from('posts').update({ slug }).eq('id', p.id)
      if (upErr) {
        console.error(`  FAILED: ${upErr.message}`)
      } else {
        written++
      }
    }
  }

  console.log(`\nDone. ${DRY_RUN ? 'Would write' : 'Wrote'} ${DRY_RUN ? posts?.length || 0 : written} slugs.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
