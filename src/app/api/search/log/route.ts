import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Fire-and-forget search analytics. Anonymous insert allowed by RLS
// policy "search_logs insert anon". Powers zero-result analysis,
// trending searches, synonym discovery.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const q = String(body?.q || '').trim().slice(0, 200)
    if (!q) return NextResponse.json({ ok: false }, { status: 400 })

    const sb = createAdminClient()
    await sb.from('search_logs').insert({
      q,
      q_normalized: q.toLowerCase(),
      result_count: Number.isFinite(body?.result_count) ? body.result_count : 0,
      clicked_slug: body?.clicked_slug || null,
      clicked_kind: body?.clicked_kind || null,
      session_id: body?.session_id || null,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
