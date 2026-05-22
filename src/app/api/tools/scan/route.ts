import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { checkQuota, logScan, hashImage, type ToolName, LIMITS } from '@/lib/tool-quota'
import { preClassify, scanImage } from '@/lib/tool-scanner'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 30

const GUEST_COOKIE = 'pp_tools_guest'

async function getOrSetGuestId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(GUEST_COOKIE)?.value
  if (existing) return existing
  const id = crypto.randomUUID()
  jar.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return id
}

function getIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  )
}

export async function POST(req: NextRequest) {
  let body: { tool?: ToolName; imageDataUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tool = body.tool
  const dataUrl = body.imageDataUrl
  if (!tool || (tool !== 'ingredient' && tool !== 'menu')) {
    return NextResponse.json({ error: 'Invalid tool' }, { status: 400 })
  }
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  }

  // Decode + hash + size-check
  const commaIdx = dataUrl.indexOf(',')
  const b64 = dataUrl.slice(commaIdx + 1)
  let buf: Buffer
  try {
    buf = Buffer.from(b64, 'base64')
  } catch {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }
  if (buf.byteLength > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 8MB after downscale).' }, { status: 413 })
  }
  const imageHash = hashImage(buf)

  // Identify caller
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  const guestId = userId ? null : await getOrSetGuestId()
  const ip = getIp(req)

  const ctx = { userId, guestId, ip, tool, imageHash }

  // Quota + cache check
  const quota = await checkQuota(ctx)
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason ?? 'Quota exceeded', tier: quota.tier },
      { status: 429 },
    )
  }
  if (quota.cached) {
    return NextResponse.json({ result: quota.cached, tier: quota.tier, cached: true })
  }

  // Pre-classifier (Y/N gate)
  let preCost = 0
  try {
    const pre = await preClassify(dataUrl, tool)
    preCost = pre.costUsd
    if (!pre.ok) {
      await logScan({
        ctx,
        costUsd: preCost,
        rejected: true,
        rejectReason: `pre-classifier said not a ${tool}`,
      })
      return NextResponse.json(
        {
          error:
            tool === 'ingredient'
              ? "That doesn't look like an ingredient label. Try a closer photo of the back of the package."
              : "That doesn't look like a menu. Try a clearer photo of the printed menu.",
          tier: quota.tier,
        },
        { status: 422 },
      )
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Pre-check failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Full scan
  try {
    const { result, costUsd } = await scanImage(dataUrl, tool)
    await logScan({ ctx, costUsd: preCost + costUsd, result })
    return NextResponse.json({ result, tier: quota.tier, cached: false })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Scan failed'
    await logScan({ ctx, costUsd: preCost, rejected: true, rejectReason: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function GET() {
  return NextResponse.json({ limits: LIMITS })
}
