// Shared shapes for Kitchen recipe collections (the curated "hoods").
// Collections are hardcoded curated content (same pattern as src/lib/vegan-content),
// NOT a DB table. They pull recipes from the DB by tag/pins and cross-link OUT to the
// Library answers (/vegan/*) and Tools (/tools/*). No data is duplicated.

import type { ToolHandle } from '@/lib/vegan-content/types'

export interface CollectionRelatedAnswer {
  slug: string // links to /vegan/<slug> in the Library
  label: string
}

export interface RecipeCollection {
  slug: string // /recipes/collections/<slug>
  title: string // H1
  metaTitle: string // <title>
  metaDescription: string // <meta name=description>
  searchQueries: string[] // the searches this page targets - documents intent
  tagline: string // short one-liner under the H1
  intro: string[] // pillar paragraphs - honest, non-medical
  // Recipe selection: the union of tag overlap + explicit pins. Pins render first.
  // Collections may start sparse and fill in as elite recipes get tagged.
  tags?: string[] // matched against posts.secondary_tags (overlaps)
  recipeSlugs?: string[] // explicit pinned recipe slugs
  relatedAnswers?: CollectionRelatedAnswer[] // cross-links INTO the Library
  relatedTools?: ToolHandle[] // cross-links INTO Tools
  // Render the gentle-food / "talk to a dietitian" disclaimer (FODMAP, dental, IBS topics).
  showComfortDisclaimer?: boolean
  updatedAt: string // ISO date
}
