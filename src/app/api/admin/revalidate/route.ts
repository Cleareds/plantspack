import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest): Promise<boolean> {
  // Shared secret for server-to-server / CLI cache busts.
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true

  // Otherwise require admin session.
  const supabaseUser = await createClient()
  const { data: { session } } = await supabaseUser.auth.getSession()
  if (!session) return false
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  return profile?.role === 'admin'
}

/**
 * Manual ISR revalidation for admins. Next.js's fetch `Data Cache` persists
 * across deployments, so bug fixes in an API route don't automatically
 * invalidate already-cached HTML. This endpoint lets an admin force a path
 * (or list of paths) to be regenerated on next request.
 *
 * POST { paths: string[] }
 *
 * Also supports a no-body GET for a single `?path=/foo` convenience.
 */
export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const paths: string[] = Array.isArray(body?.paths) ? body.paths : []
  if (paths.length === 0) return NextResponse.json({ error: 'paths[] required' }, { status: 400 })

  const revalidated: string[] = []
  for (const p of paths) {
    try { revalidatePath(p); revalidated.push(p) } catch (e: any) {
      console.error('revalidatePath err', p, e?.message)
    }
  }
  return NextResponse.json({ success: true, revalidated })
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const path = new URL(request.url).searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  try { revalidatePath(path) } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'revalidate failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true, revalidated: [path] })
}
