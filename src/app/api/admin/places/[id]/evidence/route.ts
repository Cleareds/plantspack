import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyWebsite, persistableSignal } from '@/lib/places/website-verify'
import { classifyVegan } from '@/lib/places/vegan-signal'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/admin/places/[id]/evidence
 * Fetches the venue's own website once (no browser, 8 s cap) and returns what
 * a human needs to decide "100% vegan?" in seconds: title, description,
 * final URL, closure or parking hints, menu links, and the rule-based vegan
 * signal with its matched phrases. Nothing is written: the decision stays
 * with the admin's click.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: place } = await admin.from('places').select('id, name, website, city, country').eq('id', id).maybeSingle()
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!place.website) return NextResponse.json({ website: null, signal: null, vegan: null })

  try {
    const signal = await verifyWebsite(place.website, { timeoutMs: 8000, includeExcerpt: true })
    const vegan = classifyVegan({ name: place.name, website: signal })
    // Short phrases around "vegan" from the page body so the admin reads the
    // venue's own words, not our classifier's.
    const excerpt = (signal.body_excerpt || '').replace(/\s+/g, ' ')
    const quotes: string[] = []
    const re = /.{0,70}\b(100\s*%\s*(plant|vegan)|fully vegan|all[- ]vegan|entirely vegan|completely vegan|plant[- ]based|vegan|vegetarian|végétal|végan|vegano|vegana|veganes|veganer)\b.{0,70}/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(excerpt)) && quotes.length < 8) quotes.push(m[0].trim())
    return NextResponse.json({ website: place.website, signal: persistableSignal(signal), vegan, quotes })
  } catch (e) {
    return NextResponse.json({ website: place.website, signal: null, vegan: null, error: e instanceof Error ? e.message : 'fetch failed' })
  }
}
