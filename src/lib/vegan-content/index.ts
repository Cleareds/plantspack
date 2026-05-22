import { sugarArticle } from './ingredients/sugar'
import { wineArticle } from './ingredients/wine'
import { japanGuide } from './travel/japan'
import type { IngredientArticle, TravelGuide } from './types'

// Article registry. New articles plug in here.
export const INGREDIENT_ARTICLES: IngredientArticle[] = [
  sugarArticle,
  wineArticle,
]

export const TRAVEL_GUIDES: TravelGuide[] = [
  japanGuide,
]

export function getIngredientArticle(slug: string): IngredientArticle | undefined {
  return INGREDIENT_ARTICLES.find((a) => a.slug === slug)
}

export function getTravelGuide(countrySlug: string): TravelGuide | undefined {
  return TRAVEL_GUIDES.find((g) => g.countrySlug === countrySlug)
}

export function hasTravelGuide(countrySlug: string): boolean {
  return TRAVEL_GUIDES.some((g) => g.countrySlug === countrySlug)
}

export * from './types'
