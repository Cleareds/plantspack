/**
 * Baking substitute calculator dataset.
 *
 * Quantitative replacements for common non-vegan baking ingredients.
 * Each option includes a `compute(amount)` function returning a
 * concrete instruction string with the correct ratio applied.
 *
 * Ratios are drawn from widely-published vegan baking references
 * (Bryanna Clark Grogan, Isa Chandra Moskowitz, America's Test
 * Kitchen vegan, BBC Good Food vegan baking guide). Not AI-generated.
 *
 * Each option declares which recipe contexts it excels in so the
 * calculator can rank options by recipe type.
 */

export type RecipeContext =
  | 'cake'
  | 'cookie'
  | 'brownie'
  | 'muffin'
  | 'quickbread'
  | 'pancake'
  | 'binding'
  | 'leavening'
  | 'custard'
  | 'meringue'
  | 'whipped-topping'
  | 'frosting'

export const RECIPE_CONTEXTS: { key: RecipeContext; label: string }[] = [
  { key: 'cake', label: 'Cake' },
  { key: 'cookie', label: 'Cookies' },
  { key: 'brownie', label: 'Brownies' },
  { key: 'muffin', label: 'Muffins' },
  { key: 'quickbread', label: 'Quick bread / banana bread' },
  { key: 'pancake', label: 'Pancakes / waffles' },
  { key: 'binding', label: 'Veggie burger / meatball binding' },
  { key: 'leavening', label: 'Leavening / rise' },
  { key: 'custard', label: 'Custard / cheesecake' },
  { key: 'meringue', label: 'Meringue / pavlova' },
  { key: 'whipped-topping', label: 'Whipped topping' },
  { key: 'frosting', label: 'Frosting / buttercream' },
]

export type Unit = 'whole' | 'tbsp' | 'tsp' | 'cup' | 'g' | 'ml'

export interface BakingIngredient {
  key: string
  label: string
  /** What unit the user inputs the amount in. */
  unit: Unit
  /** Display unit name (singular/plural handled separately). */
  unitLabel: string
  /** Default amount shown in the input. */
  defaultAmount: number
  options: BakingOption[]
}

export interface BakingOption {
  name: string
  /** Recipe contexts where this option works particularly well. Empty array = generic. */
  bestFor: RecipeContext[]
  /** Recipe contexts where this option is a poor choice. */
  badFor?: RecipeContext[]
  /** Render the substitute instruction given the user's amount. */
  compute: (amount: number) => string
  /** One-line note on flavour / texture impact. */
  notes: string
}

// ---- helpers ----
const fmt = (n: number): string => {
  // Common fractions look better than decimals in recipes.
  const rounded = Math.round(n * 8) / 8
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  const fracMap: Record<string, string> = {
    '0.125': '1/8', '0.25': '1/4', '0.375': '3/8',
    '0.5': '1/2', '0.625': '5/8', '0.75': '3/4', '0.875': '7/8',
  }
  const fracKey = frac.toString()
  if (frac === 0) return String(whole)
  if (whole === 0 && fracMap[fracKey]) return fracMap[fracKey]
  if (fracMap[fracKey]) return `${whole} ${fracMap[fracKey]}`
  return rounded.toString()
}

const tbspToCup = (tbsp: number) => tbsp / 16
const fmtAmountWithCup = (tbsp: number): string => {
  // Switch to cups once it's >= 4 tbsp (1/4 cup) for readability.
  if (tbsp >= 4) return `${fmt(tbspToCup(tbsp))} cup`
  return `${fmt(tbsp)} tbsp`
}

export const BAKING_INGREDIENTS: BakingIngredient[] = [
  {
    key: 'egg',
    label: 'Egg',
    unit: 'whole',
    unitLabel: 'egg',
    defaultAmount: 2,
    options: [
      {
        name: 'Flax egg',
        bestFor: ['cookie', 'brownie', 'muffin', 'quickbread', 'pancake', 'binding'],
        badFor: ['meringue', 'whipped-topping', 'custard'],
        compute: (n) => `${fmt(n)} tbsp ground flaxseed + ${fmt(n * 3)} tbsp water. Whisk and rest 5 min until gel-like.`,
        notes: 'Adds nutty flavour. Best in rustic / wholemeal bakes.',
      },
      {
        name: 'Chia egg',
        bestFor: ['cookie', 'muffin', 'quickbread', 'pancake', 'binding'],
        badFor: ['meringue', 'whipped-topping', 'custard'],
        compute: (n) => `${fmt(n)} tbsp ground chia seeds + ${fmt(n * 3)} tbsp water. Whisk and rest 5 min.`,
        notes: 'More neutral flavour than flax. Same texture role.',
      },
      {
        name: 'Aquafaba',
        bestFor: ['meringue', 'whipped-topping', 'cake', 'cookie', 'brownie'],
        compute: (n) => `${fmt(n * 3)} tbsp aquafaba (chickpea-can liquid). For meringue/whip: whisk 5-8 min with cream of tartar until stiff peaks.`,
        notes: 'The magic one. Whips like egg white. Use unsalted chickpea liquid for sweet recipes.',
      },
      {
        name: 'Mashed banana',
        bestFor: ['muffin', 'quickbread', 'pancake', 'cake'],
        badFor: ['cookie', 'meringue', 'custard'],
        compute: (n) => `${fmt(n * 0.25)} cup mashed ripe banana (~${fmt(n * 60)} g).`,
        notes: 'Adds sweetness and banana flavour. Only use in recipes where banana fits.',
      },
      {
        name: 'Apple sauce (unsweetened)',
        bestFor: ['cake', 'muffin', 'quickbread', 'brownie'],
        badFor: ['cookie', 'meringue'],
        compute: (n) => `${fmt(n * 0.25)} cup unsweetened apple sauce.`,
        notes: 'Adds moisture and slight sweetness. Reduce other sweetener slightly.',
      },
      {
        name: 'Silken tofu',
        bestFor: ['custard', 'brownie', 'cake'],
        badFor: ['cookie', 'meringue', 'whipped-topping'],
        compute: (n) => `${fmt(n * 0.25)} cup silken tofu, blended smooth.`,
        notes: 'Adds protein, no flavour, dense moist crumb. Great in cheesecake bases.',
      },
      {
        name: 'Baking soda + vinegar',
        bestFor: ['cake', 'leavening'],
        badFor: ['cookie', 'binding', 'custard', 'meringue'],
        compute: (n) => `${fmt(n)} tsp baking soda + ${fmt(n)} tbsp white or apple cider vinegar. Stir into batter last.`,
        notes: 'Only replaces the leavening role of egg, not the binding. Use in fluffy cakes that also have flour structure.',
      },
      {
        name: 'Commercial egg replacer',
        bestFor: ['cake', 'cookie', 'brownie', 'muffin', 'pancake'],
        compute: () => `Follow package directions (Bob's Red Mill, Orgran, Free & Easy, JUST Egg).`,
        notes: 'Most reliable when a recipe really needs egg behaviour. JUST Egg works for scrambles, not baking.',
      },
    ],
  },
  {
    key: 'butter',
    label: 'Butter',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 0.5,
    options: [
      {
        name: 'Vegan block butter',
        bestFor: ['cake', 'cookie', 'brownie', 'muffin', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup vegan block butter (Naturli, Violife, Flora Plant, Miyoko's, Country Crock Plant). Use straight from fridge for cookies, soft for cake.`,
        notes: 'Closest 1:1 swap. Block style (not spread) performs best in baking.',
      },
      {
        name: 'Coconut oil (refined, solid)',
        bestFor: ['cookie', 'brownie', 'cake'],
        compute: (cup) => `${fmt(cup)} cup refined coconut oil, solid at room temp.`,
        notes: 'Use refined for neutral taste. Unrefined adds coconut flavour. Bakes more crisp than butter.',
      },
      {
        name: 'Olive oil',
        bestFor: ['cake', 'quickbread', 'muffin'],
        badFor: ['cookie', 'frosting'],
        compute: (cup) => `${fmt(cup * 0.75)} cup olive oil (use 3/4 of butter amount).`,
        notes: 'Best in olive-oil cakes, banana bread, savoury muffins. Won\'t cream for buttercream.',
      },
      {
        name: 'Apple sauce',
        bestFor: ['muffin', 'quickbread', 'cake'],
        badFor: ['cookie', 'frosting'],
        compute: (cup) => `${fmt(cup * 0.5)} cup apple sauce (use half of butter amount).`,
        notes: 'Lower-fat option. Texture goes denser and more moist.',
      },
    ],
  },
  {
    key: 'milk',
    label: 'Cow\'s milk',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 1,
    options: [
      {
        name: 'Soy milk',
        bestFor: ['cake', 'cookie', 'brownie', 'muffin', 'pancake', 'custard', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup unsweetened soy milk.`,
        notes: 'Highest protein of plant milks → best replicates dairy in baking. Doesn\'t split when curdled (good for buttermilk substitute).',
      },
      {
        name: 'Oat milk',
        bestFor: ['cake', 'muffin', 'quickbread', 'pancake'],
        compute: (cup) => `${fmt(cup)} cup unsweetened oat milk (barista-style for richer bakes).`,
        notes: 'Subtle sweetness. Mild flavour. Common allergen-friendly choice.',
      },
      {
        name: 'Almond milk',
        bestFor: ['muffin', 'quickbread'],
        badFor: ['custard', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup unsweetened almond milk.`,
        notes: 'Low protein, low fat. Lighter result. Skip in recipes where milk fat carries flavour.',
      },
      {
        name: 'Coconut milk (carton)',
        bestFor: ['custard', 'brownie', 'cake'],
        compute: (cup) => `${fmt(cup)} cup coconut milk (carton, not canned).`,
        notes: 'Sweet, tropical note. Good in chocolate and tropical-fruit recipes.',
      },
    ],
  },
  {
    key: 'buttermilk',
    label: 'Buttermilk',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 1,
    options: [
      {
        name: 'Soy milk + acid',
        bestFor: ['cake', 'muffin', 'quickbread', 'pancake'],
        compute: (cup) => `${fmt(cup)} cup unsweetened soy milk + ${fmt(cup)} tbsp lemon juice or white vinegar. Stir and rest 5 min until curdled.`,
        notes: 'Soy curdles cleaner than oat or almond. Best buttermilk match.',
      },
      {
        name: 'Oat milk + acid',
        bestFor: ['pancake', 'muffin', 'quickbread'],
        compute: (cup) => `${fmt(cup)} cup oat milk + ${fmt(cup)} tbsp lemon juice. Rest 5 min.`,
        notes: 'Curdles less, but adds subtle sweetness that suits pancakes.',
      },
    ],
  },
  {
    key: 'cream',
    label: 'Heavy cream',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 1,
    options: [
      {
        name: 'Coconut cream (chilled)',
        bestFor: ['whipped-topping', 'frosting', 'custard'],
        compute: (cup) => `${fmt(cup)} cup coconut cream - chill a full-fat can overnight, scoop solid layer. Whip cold with icing sugar.`,
        notes: 'Whips when properly cold. Strong coconut flavour. The standard vegan whipping cream.',
      },
      {
        name: 'Oat cream (Oatly Creamy / Alpro Single)',
        bestFor: ['cake', 'custard'],
        badFor: ['whipped-topping'],
        compute: (cup) => `${fmt(cup)} cup oat cream.`,
        notes: 'Pourable. Works in pasta sauces, gratins, custards. Doesn\'t whip.',
      },
      {
        name: 'Soy whipping cream',
        bestFor: ['whipped-topping', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup vegan whipping cream (Schlagfix, Soyatoo, Elmlea Plant Double).`,
        notes: 'Purpose-built for whipping. Neutral flavour. Often the easiest path.',
      },
      {
        name: 'Cashew cream',
        bestFor: ['custard', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup cashew cream - blend ${fmt(cup * 0.75)} cup soaked cashews + ${fmt(cup * 0.5)} cup water until silky.`,
        notes: 'Rich, neutral. Great in savoury cream sauces. Doesn\'t whip stiff.',
      },
    ],
  },
  {
    key: 'honey',
    label: 'Honey',
    unit: 'tbsp',
    unitLabel: 'tbsp',
    defaultAmount: 2,
    options: [
      {
        name: 'Maple syrup',
        bestFor: ['cake', 'cookie', 'muffin', 'quickbread', 'frosting'],
        compute: (tbsp) => `${fmt(tbsp)} tbsp maple syrup (1:1).`,
        notes: 'Slightly thinner than honey. Maple flavour comes through in lighter bakes.',
      },
      {
        name: 'Agave nectar',
        bestFor: ['cake', 'muffin'],
        compute: (tbsp) => `${fmt(tbsp * 0.75)} tbsp agave nectar (use 3/4 - sweeter than honey).`,
        notes: 'More neutral flavour. Sweeter, so use less.',
      },
      {
        name: 'Date syrup',
        bestFor: ['cookie', 'brownie', 'muffin'],
        compute: (tbsp) => `${fmt(tbsp)} tbsp date syrup (1:1).`,
        notes: 'Caramel / molasses notes. Great in dark bakes.',
      },
      {
        name: 'Brown rice syrup',
        bestFor: ['cookie', 'cake'],
        compute: (tbsp) => `${fmt(tbsp)} tbsp brown rice syrup (1:1).`,
        notes: 'Less sweet, neutral. Adds chew (good in granola, cookies).',
      },
    ],
  },
  {
    key: 'gelatin',
    label: 'Gelatin (powder)',
    unit: 'tsp',
    unitLabel: 'tsp',
    defaultAmount: 1,
    options: [
      {
        name: 'Agar agar (powder)',
        bestFor: ['custard', 'whipped-topping'],
        compute: (tsp) => `${fmt(tsp)} tsp agar agar powder (1:1). MUST be boiled briefly to activate (gelatin doesn't need boiling). Sets firmer.`,
        notes: 'Seaweed-derived. Sets at room temp once cool. Stiffer / less wobble than gelatin.',
      },
      {
        name: 'Agar agar (flakes)',
        bestFor: ['custard'],
        compute: (tsp) => `${fmt(tsp * 3)} tsp agar flakes (flakes are weaker per volume - use 3x). Boil to activate.`,
        notes: 'Flake form needs more volume than powder for the same set.',
      },
      {
        name: 'Pectin',
        bestFor: ['custard'],
        badFor: ['whipped-topping'],
        compute: (tsp) => `${fmt(tsp)} tsp pectin powder - needs sugar and acid (lemon juice) to set. Best for fruit jams and jellies.`,
        notes: 'Fruit-derived. Behaves differently to gelatin - doesn\'t set savoury liquids well.',
      },
      {
        name: 'Cornstarch / arrowroot',
        bestFor: ['custard'],
        compute: (tsp) => `${fmt(tsp * 2)} tsp cornstarch or arrowroot (use 2x). Slurry into cold liquid first, then heat to thicken.`,
        notes: 'Thickens but doesn\'t form a "set" gel. Good for pudding-style desserts and pie fillings.',
      },
    ],
  },
  {
    key: 'yogurt',
    label: 'Yogurt',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 1,
    options: [
      {
        name: 'Soy yogurt (unsweetened)',
        bestFor: ['cake', 'muffin', 'quickbread', 'pancake'],
        compute: (cup) => `${fmt(cup)} cup unsweetened soy yogurt (1:1).`,
        notes: 'High protein, mild tang. Closest to dairy yogurt in baking.',
      },
      {
        name: 'Coconut yogurt',
        bestFor: ['cake', 'muffin', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup coconut yogurt.`,
        notes: 'Richer, slight coconut note. Best in recipes that suit it.',
      },
      {
        name: 'Cashew yogurt',
        bestFor: ['frosting', 'custard', 'cake'],
        compute: (cup) => `${fmt(cup)} cup cashew yogurt.`,
        notes: 'Very creamy, low tang. Pricier.',
      },
    ],
  },
  {
    key: 'sour-cream',
    label: 'Sour cream',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 0.5,
    options: [
      {
        name: 'Vegan sour cream (Tofutti, Oatly, Forager)',
        bestFor: ['cake', 'muffin', 'quickbread', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup vegan sour cream (1:1).`,
        notes: 'Best 1:1 swap.',
      },
      {
        name: 'Soy yogurt + lemon',
        bestFor: ['cake', 'muffin', 'quickbread'],
        compute: (cup) => `${fmt(cup)} cup unsweetened soy yogurt + ${fmt(cup * 2)} tsp lemon juice. Stir and rest 5 min.`,
        notes: 'DIY. Tang comes from added acid.',
      },
      {
        name: 'Cashew cream + lemon',
        bestFor: ['custard', 'frosting'],
        compute: (cup) => `Blend ${fmt(cup * 0.75)} cup soaked cashews + ${fmt(cup * 0.25)} cup water + ${fmt(cup * 2)} tsp lemon juice + pinch salt.`,
        notes: 'Richer. Stays stable in custards.',
      },
    ],
  },
  {
    key: 'condensed-milk',
    label: 'Sweetened condensed milk',
    unit: 'cup',
    unitLabel: 'cup',
    defaultAmount: 1,
    options: [
      {
        name: 'Sweetened condensed coconut milk',
        bestFor: ['custard', 'frosting'],
        compute: (cup) => `${fmt(cup)} cup canned sweetened condensed coconut milk (Nature's Charm, Let's Do Organic).`,
        notes: 'Direct supermarket swap. Slight coconut note.',
      },
      {
        name: 'Homemade - soy milk + sugar',
        bestFor: ['custard', 'frosting'],
        compute: (cup) => `Simmer ${fmt(cup * 1.5)} cup soy milk + ${fmt(cup * 0.5)} cup sugar over low heat for 30-40 min until reduced by half and syrupy.`,
        notes: 'Cheap, stable. Stir often to avoid scorching.',
      },
    ],
  },
]

export const BAKING_INGREDIENT_KEYS = BAKING_INGREDIENTS.map((i) => i.key)

export function getBakingIngredient(key: string): BakingIngredient | undefined {
  return BAKING_INGREDIENTS.find((i) => i.key === key)
}

/** Rank options for a given recipe context: bestFor first, then generic, badFor last (filtered out). */
export function rankOptionsForContext(
  options: BakingOption[],
  context: RecipeContext | null,
): BakingOption[] {
  if (!context) return options
  const best = options.filter((o) => o.bestFor.includes(context))
  const generic = options.filter((o) => !o.bestFor.includes(context) && !o.badFor?.includes(context))
  // We intentionally keep badFor options out - the calculator should
  // hide options that would actively hurt the recipe.
  return [...best, ...generic]
}
