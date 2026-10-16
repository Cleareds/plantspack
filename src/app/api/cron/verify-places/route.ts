import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Vercel cron: runs daily at 4:23 AM UTC — checks place websites
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get places with websites that haven't been verified recently
  // Check 500 places per run, runs every 6 hours — full cycle in ~8 days
  const { data: places } = await supabase
    .from('places')
    .select('id, name, website, is_verified, updated_at')
    .not('website', 'is', null)
    .order('updated_at', { ascending: true }) // oldest first
    .limit(500)

  if (!places || places.length === 0) {
    return NextResponse.json({ checked: 0, flagged: 0 })
  }

  let checked = 0
  let alive = 0
  let dead = 0

  // Check a single place website
  async function checkPlace(place: any) {
    if (!place.website) return
    checked++

    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(place.website, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'PlantsPack-Verify/1.0' },
      })
      clearTimeout(t)

      if (res.ok || res.status === 403 || res.status === 405) {
        alive++
        await supabase.from('places').update({ updated_at: new Date().toISOString() }).eq('id', place.id)
      } else if (res.status === 404 || res.status >= 500) {
        dead++
        const { data: current } = await supabase.from('places').select('tags').eq('id', place.id).single()
        const tags = current?.tags || []
        if (!tags.includes('website_unreachable')) {
          await supabase.from('places').update({
            tags: [...tags, 'website_unreachable'],
            updated_at: new Date().toISOString(),
          }).eq('id', place.id)
        }
      }
    } catch {
      dead++
      const { data: current } = await supabase.from('places').select('tags').eq('id', place.id).single()
      const tags = current?.tags || []
      if (!tags.includes('website_unreachable')) {
        await supabase.from('places').update({
          tags: [...tags, 'website_unreachable'],
          updated_at: new Date().toISOString(),
        }).eq('id', place.id)
      }
    }
  }

  // Process in parallel batches of 20
  for (let i = 0; i < places.length; i += 20) {
    const batch = places.slice(i, i + 20)
    await Promise.all(batch.map(checkPlace))
  }

  return NextResponse.json({
    checked,
    alive,
    dead,
    timestamp: new Date().toISOString(),
  })
}
