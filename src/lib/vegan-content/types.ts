// Shared content shapes for the /vegan/* content hub.

export type ToolHandle =
  | 'ingredient-scanner'
  | 'menu-scanner'
  | 'barcode'
  | 'substitutes'
  | 'cards'
  | 'calculator'
  | 'drinks'

export interface RelatedLink {
  href: string
  label: string
  description?: string
}

export interface FaqEntry {
  question: string
  answer: string
}

export type Verdict = 'usually-yes' | 'sometimes' | 'usually-no' | 'depends'

export interface IngredientArticle {
  slug: string // /vegan/<slug>
  title: string // H1
  metaTitle: string // <title>
  metaDescription: string // <meta name=description>
  category: 'ingredient' | 'drink' | 'lifestyle'
  searchQueries: string[] // The exact searches this page targets - documents intent
  verdict: Verdict
  verdictHeadline: string // short one-line answer
  tldr: string // 1-2 sentence summary
  fullAnswer: string[] // Paragraphs of the long-form answer
  whatToLookFor?: { good: string[]; avoid: string[] }
  faq: FaqEntry[]
  relatedTools: ToolHandle[]
  relatedTopics: string[] // slugs of other ingredient articles
  sources?: { title: string; url: string }[]
  updatedAt: string // ISO date
}

export interface DishEntry {
  name: string // dish name (in target language or English transliteration)
  nativeName?: string // in native script if different
  status: 'vegan' | 'usually-vegan' | 'ask' | 'avoid'
  note: string // why - what to look out for or which ingredient is the problem
}

export interface Phrase {
  english: string
  native: string
  pronunciation?: string // rough Latin transliteration if helpful
}

export interface TravelGuide {
  countrySlug: string // matches /vegan-places/<slug>
  countryName: string
  metaTitle: string
  metaDescription: string
  vegFriendliness: 1 | 2 | 3 | 4 | 5 // self-rated 1-5
  vegFriendlinessNote: string
  tldr: string
  intro: string[] // paragraphs
  phrases: Phrase[]
  dishes: { vegan: DishEntry[]; ask: DishEntry[]; avoid: DishEntry[] }
  hiddenIngredients: string[] // bulleted list of things to watch for
  tips: string[] // top-of-mind practical tips
  relatedTopics: string[] // slugs of related ingredient articles
  updatedAt: string
}
