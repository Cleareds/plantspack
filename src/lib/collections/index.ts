import type { RecipeCollection } from './types'
import type { ToolHandle } from '@/lib/vegan-content/types'

// Collection registry. New collections plug in here (curated, like vegan-content).
export const RECIPE_COLLECTIONS: RecipeCollection[] = [
  {
    slug: 'soft-vegan-food-after-dental-work',
    title: 'Soft Vegan Food After Dental Work',
    metaTitle: 'Soft Vegan Food After Dental Work & Surgery | Plants Pack',
    metaDescription:
      'Gentle, no-chew vegan smoothies and cream soups for after wisdom teeth, dental surgery, or with braces. Blender-friendly, protein-conscious, ready in minutes.',
    searchQueries: [
      'soft vegan food after wisdom teeth removal',
      'vegan food after dental surgery',
      'no chew vegan meals',
      'vegan smoothies with braces',
    ],
    tagline: 'No-chew smoothies and blended soups for when chewing is off the table.',
    intro: [
      'After dental work, wisdom teeth, or while adjusting to braces, the easiest meals are the ones you barely have to chew. These vegan recipes are blended, soft, and gentle to eat, while still giving you protein and calories so recovery does not mean living on plain broth.',
      'Everything here is fully plant-based. We have leaned toward blended smoothies and silky cream soups, kept added crunch out, and flagged anything that needs only a blender so you can make it one-handed.',
    ],
    tags: ['soft', 'no-chew', 'blender', 'smoothie', 'cream soup'],
    relatedAnswers: [{ slug: 'protein', label: 'How to get enough protein on a vegan diet' }],
    relatedTools: ['substitutes', 'calculator'],
    showComfortDisclaimer: true,
    updatedAt: '2026-06-30',
  },
  {
    slug: 'low-fodmap-vegan-smoothies',
    title: 'Low-FODMAP-Friendly Vegan Smoothies',
    metaTitle: 'Low-FODMAP-Friendly Vegan Smoothies | Plants Pack',
    metaDescription:
      'Light, bloating-conscious vegan smoothies built around lower-FODMAP ingredients. Plant-based, blender-only, with honest portion notes.',
    searchQueries: [
      'low fodmap vegan smoothie',
      'vegan smoothie for bloating',
      'bloating friendly vegan smoothie',
    ],
    tagline: 'Lighter, bloating-conscious blends using lower-FODMAP ingredients.',
    intro: [
      'FODMAPs are carbohydrates that some people find harder to digest, and portion size matters as much as the ingredient. These vegan smoothies lean on ingredients that are generally lower-FODMAP at a normal serving, so they can feel lighter on the stomach.',
      'This is general food guidance, not a clinical low-FODMAP program. Tolerances are personal - what suits one person may not suit another - so treat the notes as a starting point.',
    ],
    tags: ['low-fodmap', 'smoothie'],
    relatedAnswers: [{ slug: 'protein', label: 'How to get enough protein on a vegan diet' }],
    relatedTools: ['substitutes', 'ingredient-scanner'],
    showComfortDisclaimer: true,
    updatedAt: '2026-06-30',
  },
  {
    slug: 'high-protein-vegan-cream-soups',
    title: 'High-Protein Vegan Cream Soups',
    metaTitle: 'High-Protein Vegan Cream Soups | Plants Pack',
    metaDescription:
      'Silky, comforting vegan cream soups built for protein - tofu, lentils, and greens blended smooth. Soft-textured and freezer-friendly.',
    searchQueries: [
      'high protein vegan cream soup',
      'vegan protein soup',
      'creamy vegan soup high protein',
    ],
    tagline: 'Silky blended soups that actually carry protein.',
    intro: [
      'Cream soups are usually a low-protein meal. These vegan versions blend in silken tofu, red lentils, or white beans so a bowl is comforting and soft but still does some nutritional work - useful when you want something easy to eat that is not just empty warmth.',
      'All are fully plant-based and blend smooth. Many freeze well, so they double as make-ahead meals.',
    ],
    tags: ['high-protein', 'cream soup', 'soup'],
    relatedAnswers: [{ slug: 'protein', label: 'How to get enough protein on a vegan diet' }],
    relatedTools: ['calculator'],
    showComfortDisclaimer: false,
    updatedAt: '2026-06-30',
  },
]

export function getCollection(slug: string): RecipeCollection | undefined {
  return RECIPE_COLLECTIONS.find((c) => c.slug === slug)
}

// Tool handle -> link metadata, for the "related tools" cross-links.
export const TOOL_META: Record<ToolHandle, { href: string; label: string }> = {
  'ingredient-scanner': { href: '/tools/ingredient-scanner', label: 'Ingredient Scanner' },
  'menu-scanner': { href: '/tools/menu-scanner', label: 'Menu Scanner' },
  barcode: { href: '/tools/barcode', label: 'Barcode Scanner' },
  substitutes: { href: '/tools/substitutes', label: 'Vegan Substitutes' },
  cards: { href: '/tools/cards', label: 'Travel Cards' },
  calculator: { href: '/tools/calculator', label: 'Nutrition Calculator' },
  drinks: { href: '/tools/drinks', label: 'Is My Drink Vegan?' },
  baking: { href: '/tools/baking', label: 'Vegan Baking Helper' },
  cosmetics: { href: '/tools/cosmetics', label: 'Cosmetics Checker' },
}

export * from './types'
