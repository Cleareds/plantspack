/**
 * Blog markdown renderer with custom extensions:
 *   - `[[place:<slug>]]` → inline place card (fetched from DB, single batched query)
 *
 * Use server-side. Returns rendered HTML plus the structured metadata needed
 * for ItemList JSON-LD and any other downstream SEO work.
 */
import { marked } from 'marked'
import { createAdminClient } from '@/lib/supabase-admin'

export interface PlaceRef {
  slug: string
  name: string
  city: string
  country: string
  vegan_level: string
  main_image_url: string | null
  category: string
}

export interface RenderedBlog {
  html: string
  places: PlaceRef[]            // every [[place:slug]] resolved
  missingPlaceSlugs: string[]   // tokens that did not resolve
}

const PLACE_RE = /\[\[place:([a-z0-9-]+)\]\]/g

function levelLabel(level: string): string {
  switch (level) {
    case 'fully_vegan': return '100% vegan'
    case 'mostly_vegan': return 'mostly vegan'
    case 'vegan_friendly': return 'vegan friendly'
    case 'vegan_options': return 'vegan options'
    default: return level
  }
}

function levelBadgeClasses(level: string): string {
  switch (level) {
    case 'fully_vegan': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    case 'mostly_vegan': return 'bg-lime-500/15 text-lime-700 dark:text-lime-400'
    case 'vegan_friendly': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
    default: return 'bg-surface-container text-on-surface-variant'
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function placeCardHtml(p: PlaceRef): string {
  const name = escapeHtml(p.name)
  const city = escapeHtml(p.city)
  const img = p.main_image_url
  const levelLbl = escapeHtml(levelLabel(p.vegan_level))
  const badge = levelBadgeClasses(p.vegan_level)
  const imgEl = img
    ? `<img src="${escapeHtml(img)}" alt="${name}" loading="lazy" class="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0 bg-surface-container-low" />`
    : `<div class="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-surface-container-low flex-shrink-0 flex items-center justify-center text-on-surface-variant text-xs">no photo</div>`
  return `<a href="/place/${escapeHtml(p.slug)}" class="not-prose group flex items-center gap-3 my-3 p-3 rounded-xl border border-outline-variant/15 bg-surface-container-low/30 hover:bg-primary/5 hover:border-primary/40 transition-colors no-underline">
${imgEl}
<div class="flex-1 min-w-0">
<div class="font-medium text-on-surface group-hover:text-primary transition-colors truncate">${name}</div>
<div class="mt-1 text-xs text-on-surface-variant flex flex-wrap items-center gap-2">
<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge}">${levelLbl}</span>
<span>${city}</span>
</div>
</div>
<svg class="w-4 h-4 text-on-surface-variant group-hover:text-primary flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
</a>`
}

export async function renderBlogContent(markdown: string): Promise<RenderedBlog> {
  // 1) Collect all [[place:slug]] tokens up front
  const slugs = new Set<string>()
  for (const m of markdown.matchAll(PLACE_RE)) slugs.add(m[1])

  // 2) Single batched DB query for every referenced slug
  let placeBySlug: Record<string, PlaceRef> = {}
  if (slugs.size > 0) {
    const sb = createAdminClient()
    const { data } = await sb
      .from('places')
      .select('slug,name,city,country,vegan_level,main_image_url,category')
      .in('slug', Array.from(slugs))
      .is('archived_at', null)
    for (const p of (data as PlaceRef[] | null) || []) placeBySlug[p.slug] = p
  }

  // 3) Replace tokens with HTML BEFORE marked runs. We wrap in a single-line
  //    placeholder marked will pass through verbatim (block-level HTML on its
  //    own line is left untouched by marked's default GFM tokenizer).
  const placedSlugs: string[] = []
  const missing: string[] = []
  const swapped = markdown.replace(PLACE_RE, (_, slug: string) => {
    const p = placeBySlug[slug]
    if (!p) {
      missing.push(slug)
      // Render as a plain markdown link so the post still reads sensibly.
      return `[${slug}](/place/${slug})`
    }
    placedSlugs.push(slug)
    // Block-level HTML must sit on its own line for marked to leave it alone.
    return `\n\n${placeCardHtml(p)}\n\n`
  })

  marked.setOptions({ breaks: true })
  const html = await marked(swapped)

  const places: PlaceRef[] = placedSlugs.map((s) => placeBySlug[s]!).filter(Boolean)
  return { html, places, missingPlaceSlugs: missing }
}
