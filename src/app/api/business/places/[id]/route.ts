import { NextRequest, NextResponse } from 'next/server'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { getPlacePlan } from '@/lib/business/plan'

/** GET /api/business/places/[id]: the place and its plan, if the caller is its owner or an admin. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const plan = await getPlacePlan(gate.admin, gate.place.id)
  return NextResponse.json({ place: gate.place, plan, isAdmin: gate.isAdmin })
}
