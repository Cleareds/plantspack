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
  // Check 100 places per run (rotate through all places over time)
  const { data: places } = await supabase
    .from('places')
    .select('id, name, website, is_verified, updated_at')
    .not('website', 'is', null)
    .order('updated_at', { ascending: true }) // oldest first
    .limit(100)

  if (!places || places.length === 0) {
    return NextResponse.json({ checked: 0, flagged: 0 })
  }

  let checked = 0
  let alive = 0
  let dead = 0

  for (const place of places) {
    if (!place.website) continue
    checked++

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(place.website, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'PlantsPack-Verify/1.0' },
      })
      clearTimeout(timeout)

      if (res.ok || res.status === 403 || res.status === 405) {
        // Site is alive (403/405 = blocking HEAD but site exists)
        alive++
        // Touch updated_at to mark as checked
        await supabase.from('places').update({ updated_at: new Date().toISOString() }).eq('id', place.id)
      } else if (res.status === 404 || res.status >= 500) {
        dead++
        // Add a tag to flag this place
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
      // Network error / timeout — site might be down
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

  return NextResponse.json({
    checked,
    alive,
    dead,
    timestamp: new Date().toISOString(),
  })
}
