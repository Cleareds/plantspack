/**
 * Non-AI message generation for the companion POC.
 *
 * Pure function: given a species + lightweight platform context, return a
 * short message. No LLM calls. This shape is intentionally LLM-shaped so
 * a future tier can swap getMessage() for a hosted-LLM call without
 * disturbing the UI layer.
 */

export type Species = 'chicken' | 'pig' | 'cow'

export interface CompanionContext {
  // Optional real data the companion can reference. The UI can fetch these
  // async after mount and re-roll messages once available.
  totalPlaces?: number
  newPlacesThisWeek?: number
  userCity?: string | null
  topCityToday?: string | null
}

interface Template {
  fn: (ctx: CompanionContext) => string | null
  weight: number // higher = more likely
}

// Each species has its own voice. Templates that need data return null
// when context is missing; pickMessage() retries until something resolves.
const TEMPLATES: Record<Species, Template[]> = {
  chicken: [
    { weight: 3, fn: () => 'Cluck! Did you log a vegan place lately?' },
    { weight: 3, fn: () => 'Bok bok — humans who rate places make my day.' },
    { weight: 2, fn: () => 'Fun fact: chickens recognise over a hundred faces. Do you remember every restaurant you visit?' },
    { weight: 2, fn: () => 'I dreamed of pumpkin soup. You should add that to a pack.' },
    { weight: 4, fn: (c) => c.totalPlaces ? `${c.totalPlaces.toLocaleString()} vegan places mapped. Cluck-tastic.` : null },
    { weight: 4, fn: (c) => c.newPlacesThisWeek && c.newPlacesThisWeek > 0 ? `${c.newPlacesThisWeek} new places added this week. I checked. Bok.` : null },
    { weight: 4, fn: (c) => c.userCity ? `${c.userCity} is your spot, right? Want me to keep watch there?` : null },
    { weight: 4, fn: (c) => c.topCityToday ? `${c.topCityToday} is buzzing today — top-ranked vegan city.` : null },
  ],
  pig: [
    { weight: 3, fn: () => 'Oink! I love it when you find new places.' },
    { weight: 3, fn: () => 'Pigs are smarter than dogs. Just saying.' },
    { weight: 2, fn: () => 'A nap and a good review — perfect day.' },
    { weight: 2, fn: () => 'You smell like kindness. Or maybe lentils.' },
    { weight: 4, fn: (c) => c.totalPlaces ? `${c.totalPlaces.toLocaleString()} places on PlantsPack and I want to oink at each one.` : null },
    { weight: 4, fn: (c) => c.newPlacesThisWeek && c.newPlacesThisWeek > 0 ? `${c.newPlacesThisWeek} new spots this week. My snout is twitching.` : null },
    { weight: 4, fn: (c) => c.userCity ? `Anything new in ${c.userCity}? I bet there is.` : null },
    { weight: 4, fn: (c) => c.topCityToday ? `Today's top vegan city: ${c.topCityToday}. Worth a trip?` : null },
  ],
  cow: [
    { weight: 3, fn: () => 'Moo. Long day. But you, you keep mapping places. Respect.' },
    { weight: 3, fn: () => 'I like the slow life. And oat milk. Mostly oat milk.' },
    { weight: 2, fn: () => 'You should know — every place you add saves a little time for someone else.' },
    { weight: 2, fn: () => 'A good pasture is hard to find. So is a good salad bar.' },
    { weight: 4, fn: (c) => c.totalPlaces ? `${c.totalPlaces.toLocaleString()} vegan places. Moo-ving work.` : null },
    { weight: 4, fn: (c) => c.newPlacesThisWeek && c.newPlacesThisWeek > 0 ? `${c.newPlacesThisWeek} new places this week. The herd grows.` : null },
    { weight: 4, fn: (c) => c.userCity ? `${c.userCity}, hm? I'd visit if I could.` : null },
    { weight: 4, fn: (c) => c.topCityToday ? `${c.topCityToday} is the top vegan city today. Curious.` : null },
  ],
}

export function pickMessage(species: Species, ctx: CompanionContext): string {
  const list = TEMPLATES[species]
  // Try a weighted pick, skipping templates whose data is missing.
  for (let attempt = 0; attempt < 16; attempt++) {
    const total = list.reduce((s, t) => s + t.weight, 0)
    let r = Math.random() * total
    for (const t of list) {
      r -= t.weight
      if (r <= 0) {
        const out = t.fn(ctx)
        if (out) return out
        break
      }
    }
  }
  // Fallback: pick the first non-null template, deterministic.
  for (const t of list) {
    const out = t.fn(ctx)
    if (out) return out
  }
  return SPECIES_LABEL[species] + '...'
}

export const SPECIES_LABEL: Record<Species, string> = {
  chicken: 'Chicken',
  pig: 'Pig',
  cow: 'Cow',
}

export const SPECIES_ORDER: Species[] = ['chicken', 'pig', 'cow']
