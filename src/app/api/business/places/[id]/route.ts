import { NextRequest, NextResponse } from 'next/server'
import { requirePlaceOwner } from '@/lib/business/require-owner'

/** GET /api/business/places/[id]: the place, if the caller is its owner or an admin. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  return NextResponse.json({ place: gate.place })
}
