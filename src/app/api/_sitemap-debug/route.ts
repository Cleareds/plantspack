/**
 * Temporary diagnostic endpoint. Reports what the sitemap function sees in
 * prod so we can pinpoint why segments are empty. Remove once sitemaps are
 * healthy.
 */
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const out: Record<string, unknown> = {
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 14) || null,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) || null,
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    out.error = 'missing env vars'
    return Response.json(out, { status: 500 })
  }

  const sb = createClient(url, key)
  try {
    // Count query matching what fetchAll does
    const c1 = await sb
      .from('places')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
    out.countHead = { count: c1.count, err: c1.error?.message, status: c1.status }

    // One-row page
    const c2 = await sb
      .from('places')
      .select('slug, city, country')
      .is('archived_at', null)
      .range(0, 2)
    out.sampleRows = { len: c2.data?.length, first: c2.data?.[0], err: c2.error?.message, status: c2.status }
  } catch (e: any) {
    out.thrown = e?.message || String(e)
  }

  return Response.json(out)
}
