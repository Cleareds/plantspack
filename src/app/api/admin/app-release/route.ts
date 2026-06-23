import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

async function requireAdmin(): Promise<boolean> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('role').eq('id', user.id).single()
  return (data as { role?: string } | null)?.role === 'admin'
}

const VERSION_RE = /^\d+(\.\d+){0,3}$/

// Read both platform rows for the admin form.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('app_release_config').select('*').order('platform')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

/**
 * Upsert one platform's release config. Drives the mobile in-app update banner.
 * Body: { platform: 'ios'|'android', latest_version, min_supported_version,
 *         store_url?, message? }
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let p: Record<string, string>
  try { p = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  if (p.platform !== 'ios' && p.platform !== 'android') {
    return NextResponse.json({ error: 'platform must be ios or android' }, { status: 400 })
  }
  for (const k of ['latest_version', 'min_supported_version'] as const) {
    if (!VERSION_RE.test(p[k] ?? '')) {
      return NextResponse.json({ error: `${k} must look like 1.2.0` }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('app_release_config').upsert({
    platform: p.platform,
    latest_version: p.latest_version,
    min_supported_version: p.min_supported_version,
    store_url: (p.store_url ?? '').trim() || null,
    message: (p.message ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
