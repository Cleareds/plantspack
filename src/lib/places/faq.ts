// Build FAQ + Speakable JSON-LD for a place page.
//
// Why: LLM search agents (ChatGPT search, Perplexity, Claude Search, Google
// AI Overviews) pull structured facts directly out of FAQPage JSON-LD when
// answering questions like "is Bodhi Leuven 100% vegan?", "what time does
// Restaurant Verthé open on Saturday?", "does X allow dogs?". Without
// FAQ markup they fall back to scraping HTML, which is brittle.
//
// Speakable markup tells voice-mode agents (Google Assistant, ChatGPT
// voice, Perplexity voice) which CSS selectors hold the canonical
// short-form answer text. We point at the H1 + the first description
// paragraph.
//
// FAQ entries are generated from the existing place columns — no extra
// data needed. Each question is only added if the underlying data is
// present, so we never emit empty Q&A.

const VL_FAQ: Record<string, string> = {
  fully_vegan:
    'Yes — {name} is a fully vegan venue. Every item on the menu is plant-based with no animal products. This is verified manually by the PlantsPack team against the venue\'s own menu.',
  mostly_vegan:
    '{name} is mostly vegan. The menu is plant-based with a small number of named exceptions. Check the menu before ordering if you avoid all animal products.',
  vegan_friendly:
    '{name} is not exclusively vegan but offers a genuine vegan selection — typically three or more dedicated vegan dishes, or a clearly labelled vegan section on the menu.',
  vegan_options:
    '{name} is a non-vegan venue with a few vegan items on the menu. Suitable if you\'re eating with non-vegan friends; less suitable if you want full menu choice.',
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function formatOpeningHours(hours: unknown): string | null {
  if (!hours || typeof hours !== 'object') return null
  const obj = hours as Record<string, string>
  const lines: string[] = []
  for (const day of DAY_ORDER) {
    const v = obj[day]
    if (!v) continue
    const cap = day.charAt(0).toUpperCase() + day.slice(1)
    lines.push(`${cap}: ${v}`)
  }
  if (lines.length === 0) return null
  return lines.join('; ')
}

export interface PlaceForFaq {
  name: string
  vegan_level?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  opening_hours?: Record<string, string> | null
  is_pet_friendly?: boolean | null
  website?: string | null
  phone?: string | null
  last_verified_at?: string | null
  verification_method?: string | null
  verification_level?: number | null
}

export function buildPlaceFaqJsonLd(place: PlaceForFaq): Record<string, unknown> | null {
  const entries: Array<{ q: string; a: string }> = []
  const name = place.name

  // 1. Is X vegan? (always emit if we have a vegan_level)
  if (place.vegan_level && VL_FAQ[place.vegan_level]) {
    entries.push({
      q: `Is ${name} 100% vegan?`,
      a: VL_FAQ[place.vegan_level].replaceAll('{name}', name),
    })
  }

  // 2. Address
  if (place.address) {
    const fullAddr = [place.address, place.city, place.country].filter(Boolean).join(', ')
    entries.push({
      q: `Where is ${name}?`,
      a: `${name} is located at ${fullAddr}.`,
    })
  }

  // 3. Opening hours
  const hoursText = formatOpeningHours(place.opening_hours)
  if (hoursText) {
    entries.push({
      q: `What are the opening hours of ${name}?`,
      a: `${name} is open: ${hoursText}. Hours can change on public holidays — confirm with the venue directly for accuracy.`,
    })
  }

  // 4. Pet-friendly (only if explicitly true)
  if (place.is_pet_friendly === true) {
    entries.push({
      q: `Is ${name} dog-friendly?`,
      a: `Yes — ${name} is flagged as pet-friendly on PlantsPack. Confirm with the venue before bringing a dog, especially for indoor seating.`,
    })
  }

  // 5. Verification freshness
  if (place.last_verified_at) {
    const date = new Date(place.last_verified_at)
    const human = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const method = place.verification_method === 'admin_review'
      ? 'admin-reviewed against the venue\'s own website'
      : 'community-verified'
    entries.push({
      q: `When was ${name} last verified?`,
      a: `${name} was last verified on ${human} (${method}).`,
    })
  }

  // 6. Contact
  if (place.website || place.phone) {
    const parts: string[] = []
    if (place.website) parts.push(`website ${place.website}`)
    if (place.phone) parts.push(`phone ${place.phone}`)
    entries.push({
      q: `How do I contact ${name}?`,
      a: `You can reach ${name} via ${parts.join(' and ')}.`,
    })
  }

  if (entries.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.a,
      },
    })),
  }
}

// Speakable selectors — point voice agents at the H1 and the
// description paragraph for the canonical short-form citation.
export const PLACE_SPEAKABLE = {
  '@type': 'SpeakableSpecification',
  cssSelector: ['h1', '[data-speakable="description"]'],
}
