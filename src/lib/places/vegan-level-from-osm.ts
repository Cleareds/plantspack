/**
 * Single source of truth for translating OSM dietary tags into our
 * vegan_level enum. Use this in EVERY import script — manual mapping
 * has historically misclassified diet:vegan=yes as fully_vegan, which
 * caused the May 2026 Belgium audit to find ~95 mistagged places.
 *
 * OSM tag semantics (per https://wiki.openstreetmap.org/wiki/Key:diet:vegan):
 *   diet:vegan=only      → all menu items are vegan (= our `fully_vegan`)
 *   diet:vegan=yes       → vegan dishes are available alongside non-vegan ones
 *                          (= our `vegan_options`, NEVER `fully_vegan`)
 *   diet:vegan=limited   → some vegan items, very limited
 *   diet:vegan=no        → place explicitly notes it has no vegan options
 *
 * Same shape applies for diet:vegetarian.
 *
 * Returns null when the OSM tag set has no usable signal — caller should
 * default to `vegan_options` (the most conservative tier) and rely on
 * downstream evidence (HappyCow, Yelp, manual review) to upgrade.
 */
export type VeganLevel = 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'

export function veganLevelFromOSMTags(tags: Record<string, string | undefined>): VeganLevel | null {
  const v = tags['diet:vegan']?.toLowerCase()
  const veg = tags['diet:vegetarian']?.toLowerCase()

  if (v === 'only') return 'fully_vegan'

  // diet:vegan=yes is widely misused but its semantic is clear: "we serve
  // vegan dishes alongside non-vegan ones". The right tier is
  // vegan_options. Some legitimately-fully-vegan places are tagged =yes
  // by mistake — those need to be upgraded by downstream evidence (their
  // own website, HappyCow, manual review), NOT by this mapper.
  if (v === 'yes') {
    // If diet:vegetarian=only ALSO set, the place is at minimum a
    // vegetarian restaurant with vegan options — that's vegan_friendly.
    if (veg === 'only') return 'vegan_friendly'
    return 'vegan_options'
  }

  if (v === 'limited') return 'vegan_options'
  if (v === 'no') return null  // explicit no — don't import as a vegan place

  // No diet:vegan tag at all. Fall through to vegetarian.
  if (veg === 'only') return 'vegan_friendly'  // pure-veggie restaurant w/o explicit vegan tag
  if (veg === 'yes') return 'vegan_options'

  return null  // no signal — caller should use a different mapper or default
}

/**
 * Validates that an explicit fully_vegan claim has at least one piece of
 * supporting evidence besides the source tag. Use before persisting any
 * row at fully_vegan level from automated pipelines.
 *
 * Returns null if validation passes; returns an error message otherwise.
 */
export function validateFullyVeganEvidence(input: {
  osmTags?: Record<string, string | undefined>
  websiteUrl?: string | null
  veganListSource?: string | null  // e.g. 'happycow', 'vegguide'
  manualConfirmation?: boolean
}): string | null {
  const evidence: string[] = []
  if (input.osmTags?.['diet:vegan'] === 'only') evidence.push('osm:diet:vegan=only')
  if (input.veganListSource) evidence.push(`vegan-source:${input.veganListSource}`)
  if (input.manualConfirmation) evidence.push('manual')
  // A website alone doesn't count — many non-vegan places have websites.
  if (evidence.length === 0) {
    return 'fully_vegan needs at least one strong evidence signal (OSM diet:vegan=only, vegan-first source like VegGuide/HappyCow, or manual confirmation). Got none — downgrade to vegan_options or vegan_friendly.'
  }
  return null
}
