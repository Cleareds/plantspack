/**
 * "What did you eat?" chips for the review form. Same list as the app
 * (mobileapp/src/lib/dish-chips.ts - keep the two in sync). Slugs match the
 * dish pages in src/lib/dish-keywords.ts so a review's dishes can feed
 * "best vegan <dish> in <city>". Short on purpose: it is a tap target.
 */
export const DISH_CHIPS: Array<{ slug: string; label: string }> = [
  { slug: 'burger', label: 'Burger' },
  { slug: 'pizza', label: 'Pizza' },
  { slug: 'pasta', label: 'Pasta' },
  { slug: 'bowl', label: 'Bowl' },
  { slug: 'salad', label: 'Salad' },
  { slug: 'sandwich', label: 'Sandwich' },
  { slug: 'wrap', label: 'Wrap' },
  { slug: 'curry', label: 'Curry' },
  { slug: 'ramen', label: 'Ramen' },
  { slug: 'sushi', label: 'Sushi' },
  { slug: 'noodles', label: 'Noodles' },
  { slug: 'taco', label: 'Tacos' },
  { slug: 'falafel', label: 'Falafel' },
  { slug: 'soup', label: 'Soup' },
  { slug: 'breakfast', label: 'Breakfast' },
  { slug: 'pancake', label: 'Pancakes' },
  { slug: 'cake', label: 'Cake' },
  { slug: 'ice-cream', label: 'Ice cream' },
  { slug: 'pastry', label: 'Pastry' },
  { slug: 'coffee', label: 'Coffee' },
  { slug: 'smoothie', label: 'Smoothie' },
]

export const DISH_CHIP_SLUGS = new Set(DISH_CHIPS.map((d) => d.slug))
export const MAX_REVIEW_DISHES = 5
