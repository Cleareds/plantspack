import { INGREDIENT_ARTICLES } from './index'

// Internal links from city dish pages to /vegan/<topic> articles. Only pairs
// with genuine intent overlap — someone browsing vegan sushi plausibly wants
// the soy-sauce answer; nobody browsing burgers wants the vitamins article.
// Dish slugs come from dish-keywords.ts; article slugs from the registry.
const DISH_TO_ARTICLES: Record<string, string[]> = {
  fries: ['french-fries'],
  'fish-and-chips': ['french-fries'],
  'british-food': ['french-fries', 'worcestershire-sauce'],
  pasta: ['pesto'],
  gnocchi: ['pesto'],
  'italian-food': ['pesto'],
  indian: ['naan'],
  curry: ['naan'],
  biryani: ['naan'],
  'korean-food': ['kimchi'],
  bakery: ['bread'],
  croissant: ['bread'],
  pastry: ['bread'],
  sandwich: ['bread'],
  pizza: ['cheese'],
  'mac-and-cheese': ['cheese'],
  cheesecake: ['gelatin', 'oreos'],
  dessert: ['gelatin', 'sugar', 'oreos'],
  'ice-cream': ['oreos'],
  cake: ['eggs', 'sugar'],
  pancake: ['eggs'],
  waffle: ['eggs'],
  breakfast: ['eggs'],
  brunch: ['eggs'],
  chocolate: ['chocolate'],
  brownie: ['chocolate'],
  sushi: ['soy-sauce'],
  ramen: ['soy-sauce'],
  noodles: ['soy-sauce'],
  dumpling: ['soy-sauce'],
  'dim-sum': ['soy-sauce'],
  bao: ['soy-sauce'],
  'japanese-food': ['soy-sauce'],
  'chinese-food': ['soy-sauce'],
  'vietnamese-food': ['soy-sauce'],
  'pad-thai': ['peanut-butter', 'soy-sauce'],
  thai: ['peanut-butter', 'soy-sauce'],
  porridge: ['peanut-butter', 'honey'],
  smoothie: ['peanut-butter'],
}

export interface DishArticleLink {
  slug: string
  title: string
  verdictHeadline: string
}

export function getArticlesForDish(dishSlug: string): DishArticleLink[] {
  const slugs = DISH_TO_ARTICLES[dishSlug]
  if (!slugs) return []
  return slugs
    .map((s) => INGREDIENT_ARTICLES.find((a) => a.slug === s))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ slug: a.slug, title: a.title, verdictHeadline: a.verdictHeadline }))
}
