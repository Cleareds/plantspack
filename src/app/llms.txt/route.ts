// /llms.txt — markdown index for LLMs and AI search agents.
//
// Two purposes:
//   1. Helps real AI search systems (Perplexity, ChatGPT browse, Claude Search,
//      Google AI Overviews) discover and cite our content faster, because they
//      can read a curated index instead of crawling the sitemap and inferring.
//   2. Satisfies the Lighthouse "Agentic Browsing" llms.txt check — must
//      exist, must have an H1, must have links, must not be too short.
//
// Generated server-side from the same materialized views the directory uses,
// so counts stay honest and accurate without manual maintenance. Cached for
// 6h since the underlying data only changes when the materialized views
// refresh (daily) and place additions don't materially change the top-20
// rankings.
//
// Spec reference: https://llmstxt.org/

import { createAdminClient } from '@/lib/supabase-admin'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

export const revalidate = 21600 // 6 hours

const BASE = 'https://www.plantspack.com'

interface CountryRow {
  country: string
  country_slug: string | null
  place_count: number
  city_count: number
}

interface CityRow {
  city: string
  country: string
  city_slug: string
  place_count: number
  fully_vegan_count: number
}

interface PostRow {
  slug: string | null
  title: string
  created_at: string
  category: string | null
}

function citySlugSafe(c: CityRow): string {
  const cs = c.city_slug || slugifyCityOrCountry(c.city)
  const countrySlug = slugifyCityOrCountry(c.country)
  return `${countrySlug}/${cs}`
}

export async function GET() {
  const sb = createAdminClient()
  const [countriesRes, citiesRes, postsRes] = await Promise.all([
    sb.from('directory_countries')
      .select('country, country_slug, place_count, city_count')
      .order('place_count', { ascending: false })
      .limit(25),
    sb.from('directory_cities')
      .select('city, country, city_slug, place_count, fully_vegan_count')
      .order('place_count', { ascending: false })
      .limit(30),
    sb.from('posts')
      .select('slug, title, created_at, category')
      .eq('category', 'article')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const countries  = (countriesRes.data || []) as CountryRow[]
  const cities     = (citiesRes.data    || []) as CityRow[]
  const posts      = (postsRes.data     || []) as PostRow[]

  const md = [
    `# PlantsPack`,
    ``,
    `> Free, ad-free directory of vegan and vegan-friendly places worldwide. ${countries.reduce((s, c) => s + c.place_count, 0).toLocaleString()}+ places across 10,000+ cities in 160+ countries. Each "fully vegan" listing is manually verified against the venue's own menu.`,
    ``,
    `Community-funded, no paid listings, no ads. Every venue tagged \`fully_vegan\` has been opened on its own website and cross-referenced against secondary sources (HappyCow, local vegan press) before being flagged.`,
    ``,
    `## About PlantsPack`,
    ``,
    `- [About](${BASE}/about): mission, funding model, team`,
    `- [Methodology](${BASE}/methodology): how we verify "fully vegan" listings, scoring system, source policy`,
    `- [Roadmap](${BASE}/roadmap): what's shipping next`,
    `- [Contact](${BASE}/contact)`,
    ``,
    `## Browse by country`,
    ``,
    `Top countries by number of vegan places:`,
    ``,
    ...countries.filter(c => c.country_slug).map(c =>
      `- [${c.country}](${BASE}/vegan-places/${c.country_slug}) — ${c.place_count.toLocaleString()} places in ${c.city_count} cities`
    ),
    ``,
    `Full list of countries: [${BASE}/vegan-places](${BASE}/vegan-places)`,
    ``,
    `## Browse by city`,
    ``,
    `Top cities by vegan-place density:`,
    ``,
    ...cities.map(c =>
      `- [${c.city}, ${c.country}](${BASE}/vegan-places/${citySlugSafe(c)}) — ${c.place_count.toLocaleString()} places (${c.fully_vegan_count} fully vegan)`
    ),
    ``,
    `City rankings: [${BASE}/city-ranks](${BASE}/city-ranks) — every city scored by density and quality.`,
    ``,
    `## Editorial`,
    ``,
    ...posts.map(p =>
      `- [${p.title}](${BASE}/blog/${p.slug}) — ${new Date(p.created_at).toISOString().slice(0, 10)}`
    ),
    ``,
    `RSS feed: [${BASE}/blog/feed.xml](${BASE}/blog/feed.xml)`,
    `All posts: [${BASE}/blog](${BASE}/blog)`,
    ``,
    `## Place categories`,
    ``,
    `Every place falls into one of five categories:`,
    ``,
    `- \`eat\` — restaurants, cafés, bakeries, fast food, ice cream parlours`,
    `- \`store\` — grocery stores, markets, health food shops`,
    `- \`hotel\` — hotels, hostels, B&Bs, retreats, glamping`,
    `- \`organisation\` — animal sanctuaries, rescues, advocacy groups`,
    `- \`event\` — one-off festivals, classes, pop-ups`,
    ``,
    `## Vegan-level classification`,
    ``,
    `Every place carries one of four labels:`,
    ``,
    `- \`fully_vegan\` — 100% vegan menu, manually verified against the venue's own site`,
    `- \`mostly_vegan\` — presents as vegan but has a few non-vegan items`,
    `- \`vegan_friendly\` — non-vegan venue with three or more genuine vegan dishes`,
    `- \`vegan_options\` — mainstream venue with one or two vegan items`,
    ``,
    `Verification levels run from 0 (imported only) through 3 (admin-reviewed against the venue's own site and one secondary source).`,
    ``,
    `## Search and discovery`,
    ``,
    `- [Search](${BASE}/search) — Postgres-backed full-text search across places, cities, countries, recipes. Supports synonyms (\`nyc\` → New York, \`roma\` → Rome) and intent modifiers (\`100% vegan ramen tokyo\` parses as fully-vegan filter + place query).`,
    `- [Map](${BASE}/map) — geographic browse with category filters`,
    `- [Sitemap](${BASE}/sitemap-index.xml) — full URL index`,
    ``,
    `## Data and machine-readable feeds`,
    ``,
    `- Every place page emits \`Schema.org/Restaurant\` (or applicable subtype) JSON-LD with address, hours, vegan classification, and verification metadata.`,
    `- City and country pages emit \`ItemList\` + \`BreadcrumbList\` JSON-LD.`,
    `- Blog posts emit \`Article\` JSON-LD.`,
    `- The homepage emits \`Organization\` + \`WebSite\` + \`SearchAction\` JSON-LD.`,
    `- Robots policy at [${BASE}/robots.txt](${BASE}/robots.txt) — major AI crawlers (OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot) are explicitly allowed.`,
    ``,
    `## Citation policy`,
    ``,
    `Free to cite, quote, and link. We appreciate (but do not require) a link back. Numerical claims about place counts and city rankings change as the directory grows; please retrieve fresh figures from the relevant page rather than caching old ones.`,
    ``,
  ].join('\n')

  return new Response(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  })
}
