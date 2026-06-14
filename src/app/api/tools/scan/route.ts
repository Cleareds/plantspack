import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { checkQuota, logScan, hashImage, type ToolName, LIMITS } from '@/lib/tool-quota'
import { preClassify, scanImage, scanText } from '@/lib/tool-scanner'
import { findECodeHits } from '@/lib/e-codes'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const GUEST_COOKIE = 'pp_tools_guest'
const MAX_IMAGES_PER_SCAN = 5

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

function decodeDataUrl(dataUrl: string): Buffer | null {
  if (!dataUrl.startsWith('data:image/')) return null
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx < 0) return null
  try {
    return Buffer.from(dataUrl.slice(commaIdx + 1), 'base64')
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: { tool?: ToolName; imageDataUrls?: string[]; imageDataUrl?: string; text?: string; allergens?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tool = body.tool
  if (!tool || (tool !== 'ingredient' && tool !== 'menu')) {
    return NextResponse.json({ error: 'Invalid tool' }, { status: 400 })
  }

  // Normalise input: accept legacy imageDataUrl (single), new imageDataUrls (array), or text
  const text = body.text?.trim()
  const dataUrls: string[] = body.imageDataUrls
    ? body.imageDataUrls
    : body.imageDataUrl
      ? [body.imageDataUrl]
      : []
  const inputKind: 'text' | 'images' = text && !dataUrls.length ? 'text' : 'images'

  if (inputKind === 'text' && !text) {
    return NextResponse.json({ error: 'Empty text' }, { status: 400 })
  }
  if (inputKind === 'images') {
    if (dataUrls.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    if (dataUrls.length > MAX_IMAGES_PER_SCAN) {
      return NextResponse.json({ error: `Max ${MAX_IMAGES_PER_SCAN} images per scan` }, { status: 400 })
    }
    if (tool === 'ingredient' && dataUrls.length > 1) {
      return NextResponse.json({ error: 'Ingredient scanner accepts one image at a time' }, { status: 400 })
    }
  }

  // Decode + size check images
  const buffers: Buffer[] = []
  if (inputKind === 'images') {
    for (const url of dataUrls) {
      const buf = decodeDataUrl(url)
      if (!buf) return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
      if (buf.byteLength > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'One of the images is over 8MB after downscale.' }, { status: 413 })
      }
      buffers.push(buf)
    }
  }

  // Image hash: for text we hash the text content; for multi-image we hash all concatenated.
  let contentHash: string
  if (inputKind === 'text') {
    contentHash = hashImage(Buffer.from(text!, 'utf8'))
  } else {
    contentHash = hashImage(Buffer.concat(buffers))
  }

  // Identify caller. Web sends a cookie session + guest cookie. The mobile app
  // has neither, so it sends an Authorization: Bearer <token> (signed-in) and an
  // x-guest-id header (a stable device id) for guests.
  const supabase = await createServerClient()
  let user = (await supabase.auth.getUser()).data.user
  if (!user) {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (bearer) {
      const tokenClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      user = (await tokenClient.auth.getUser(bearer)).data.user
    }
  }
  const userId = user?.id ?? null
  const guestId = userId ? null : (req.headers.get('x-guest-id') || await getOrSetGuestId())
  const ip = getIp(req)

  const ctx = { userId, guestId, ip, tool, imageHash: contentHash }

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

  // Pre-classifier (images only; for text we already do a length check)
  let preCost = 0
  if (inputKind === 'images') {
    try {
      // Only pre-classify the first image - if a user uploads 5 images, they're
      // clearly committed; running 5 pre-classifiers wastes money.
      const pre = await preClassify(dataUrls[0], tool)
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
  }

  // Main scan
  const allergens = Array.isArray(body.allergens)
    ? body.allergens.map((a) => String(a).trim().toLowerCase()).filter((a) => a.length > 0).slice(0, 30)
    : []
  try {
    const { result, costUsd } =
      inputKind === 'text'
        ? await scanText(text!, tool, allergens)
        : await scanImage(dataUrls, tool, allergens)
    // Post-process for E-codes. For text input we scan the user's text
    // directly. For image input we scan whatever the model echoed back
    // via items[].name + items[].note (catches "E471" mentions in named
    // ingredients). Cheap and additive — never blocks the response.
    if (tool === 'ingredient') {
      const haystack = inputKind === 'text'
        ? (text ?? '')
        : (result.items ?? []).map(i => `${i.name} ${i.note ?? ''}`).join(' ')
      const hits = findECodeHits(haystack)
      if (hits.length > 0) {
        result.eCodeHits = hits.map(h => ({
          code: h.code, name: h.name, status: h.status, note: h.note,
          allergen: h.allergen,
        }))
      }
    }
    await logScan({ ctx, costUsd: preCost + costUsd, result, allergens })
    return NextResponse.json({ result, tier: quota.tier, cached: false })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Scan failed'
    await logScan({ ctx, costUsd: preCost, rejected: true, rejectReason: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export async function GET() {
  return NextResponse.json({ limits: LIMITS, maxImagesPerScan: MAX_IMAGES_PER_SCAN })
}
