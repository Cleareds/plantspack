import { BUSINESS_TOOLS_PUBLIC } from './launch'

/**
 * A place's owner tools are "live" when the tools are public for everyone,
 * or the place is a pilot (business_pilots). Live = the owner can use the
 * tools and the place's menu, deals, events and buttons are shown publicly.
 */
export async function isPlaceLive(admin: any, placeId: string): Promise<boolean> {
  if (BUSINESS_TOOLS_PUBLIC) return true
  const { data } = await admin.from('business_pilots').select('place_id').eq('place_id', placeId).maybeSingle()
  return !!data
}

export async function pilotPlaceIds(admin: any, placeIds: string[]): Promise<Set<string>> {
  if (!placeIds.length) return new Set()
  const { data } = await admin.from('business_pilots').select('place_id').in('place_id', placeIds)
  return new Set((data || []).map((r: { place_id: string }) => r.place_id))
}
