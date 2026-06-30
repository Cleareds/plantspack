import { sugarArticle } from './ingredients/sugar'
import { wineArticle } from './ingredients/wine'
import { honeyArticle } from './ingredients/honey'
import { beerArticle } from './ingredients/beer'
import { vitaminsArticle } from './ingredients/vitamins'
import { palmOilArticle } from './ingredients/palm-oil'
import { cheeseArticle } from './ingredients/cheese'
import { chocolateArticle } from './ingredients/chocolate'
import { breadArticle } from './ingredients/bread'
import { gelatinArticle } from './ingredients/gelatin'
import { eggsArticle } from './ingredients/eggs'
import { proteinArticle } from './ingredients/protein'
import { eCodesArticle } from './ingredients/e-codes'
import { veganVsVegetarianArticle } from './ingredients/vegan-vs-vegetarian'
import { japanGuide } from './travel/japan'
import { italyGuide } from './travel/italy'
import { thailandGuide } from './travel/thailand'
import { greeceGuide } from './travel/greece'
import { ukGuide } from './travel/uk'
import { germanyGuide } from './travel/germany'
import type { IngredientArticle, TravelGuide } from './types'

// Article registry. New articles plug in here.
export const INGREDIENT_ARTICLES: IngredientArticle[] = [
  // Ingredients (food)
  cheeseArticle,
  chocolateArticle,
  breadArticle,
  gelatinArticle,
  eggsArticle,
  sugarArticle,
  honeyArticle,
  palmOilArticle,
  // Drinks
  wineArticle,
  beerArticle,
  // Lifestyle / nutrition / reference
  proteinArticle,
  vitaminsArticle,
  veganVsVegetarianArticle,
  eCodesArticle,
]

export const TRAVEL_GUIDES: TravelGuide[] = [
  ukGuide,
  germanyGuide,
  italyGuide,
  greeceGuide,
  japanGuide,
  thailandGuide,
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
