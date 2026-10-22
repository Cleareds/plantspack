import { NextRequest, NextResponse } from 'next/server'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { checkOwnerMenuQuota, logOwnerMenuImport } from '@/lib/tool-quota'
import { scanOwnerMenu } from '@/lib/tool-scanner'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGES = 5
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function imageBytes(dataUrl: string): number | null {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  return Math.floor((dataUrl.length - comma - 1) * 0.75)
}

/**
 * POST /api/business/places/[id]/menu/import
 * Body: { imageDataUrls: string[] } or { text: string }
 * Reads the menu and returns draft rows. Saves nothing: the owner checks the
 * rows in the editor and publishes with PUT /menu.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response

  let body: { imageDataUrls?: string[]; text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const images = Array.isArray(body.imageDataUrls) ? body.imageDataUrls : []
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!images.length && text.length < 20) {
    return NextResponse.json({ error: 'Add a photo or PDF of the menu, or paste the menu text.' }, { status: 400 })
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Up to ${MAX_IMAGES} pages at a time.` }, { status: 400 })
  }
  for (const img of images) {
    const bytes = imageBytes(img)
    if (bytes === null || bytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'One of the files is not an image or is too large.' }, { status: 400 })
    }
  }

  const quota = await checkOwnerMenuQuota(gate.place.id, { isAdmin: gate.isAdmin })
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason, remaining: quota.remaining }, { status: 429 })
  }

  try {
    const scan = await scanOwnerMenu(images.length ? { dataUrls: images } : { text })
    await logOwnerMenuImport({
      userId: gate.userId,
      placeId: gate.place.id,
      costUsd: scan.costUsd,
      itemCount: scan.items.length,
      rejected: !scan.readable,
    })
    if (!scan.readable) {
      return NextResponse.json({ error: 'We could not read a menu in that file. Try a sharper photo, or add the dishes by hand.', remaining: quota.remaining }, { status: 422 })
    }
    return NextResponse.json({
      items: scan.items,
      remaining: gate.isAdmin ? quota.remaining : Math.max(0, quota.remaining - 1),
    })
  } catch (err) {
    log.error('[owner-menu import] failed', err)
    return NextResponse.json({ error: 'Reading the menu failed. Please try again in a minute.' }, { status: 502 })
  }
}
