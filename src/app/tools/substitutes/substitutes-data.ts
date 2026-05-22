export type SubCategory = 'dairy' | 'eggs' | 'meat' | 'seafood' | 'baking' | 'condiments' | 'sweets' | 'misc'

export interface Substitute {
  swap: string
  notes: string
  bestFor?: string
}

export interface SubEntry {
  name: string
  aliases?: string[]
  category: SubCategory
  context?: string // "in baking", "in savoury cooking", etc.
  subs: Substitute[]
  warning?: string
}

export const CATEGORIES: { key: SubCategory; label: string }[] = [
  { key: 'dairy', label: 'Dairy' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'meat', label: 'Meat' },
  { key: 'seafood', label: 'Seafood' },
  { key: 'baking', label: 'Baking & binding' },
  { key: 'condiments', label: 'Condiments & sauces' },
  { key: 'sweets', label: 'Sweets & desserts' },
  { key: 'misc', label: 'Other' },
]

export const SUBSTITUTES: SubEntry[] = [
  // Dairy
  {
    name: 'Cow\'s milk', aliases: ['milk', 'dairy milk'], category: 'dairy',
    subs: [
      { swap: 'Oat milk', notes: 'Closest to dairy in baking and coffee.', bestFor: 'coffee, baking, sauces' },
      { swap: 'Soy milk', notes: 'High protein. Splits less than oat in hot acidic drinks.', bestFor: 'coffee, savoury cooking' },
      { swap: 'Almond milk', notes: 'Lighter, nutty. Lower protein - not ideal for baking by itself.', bestFor: 'cereals, smoothies' },
      { swap: 'Coconut milk (carton)', notes: 'Sweet, tropical note.', bestFor: 'desserts, curries' },
    ],
  },
  {
    name: 'Butter', category: 'dairy',
    subs: [
      { swap: 'Vegan block butter (Naturli, Violife, Flora Plant)', notes: 'Direct 1:1 swap in most uses.', bestFor: 'baking, spreading, frying' },
      { swap: 'Coconut oil (solid)', notes: '1:1 for baking. Coconut flavour comes through; use refined for neutral taste.' },
      { swap: 'Olive oil', notes: 'Use 3/4 the amount of butter. Best in savoury dishes.' },
    ],
  },
  {
    name: 'Cheese', category: 'dairy',
    subs: [
      { swap: 'Violife / Daiya / Bute Island (shreds)', notes: 'Melts. Good on pizza, in toasties.' },
      { swap: 'Cashew cheese', notes: 'Soak cashews 4hr, blend with nutritional yeast, lemon, garlic. Creamy.', bestFor: 'pasta, dips' },
      { swap: 'Nutritional yeast (nooch)', notes: 'Sprinkle. Cheesy/umami flavour without melting.' },
      { swap: 'Cashew parmesan', notes: 'Blend cashews + nooch + salt. Grates over pasta.' },
    ],
  },
  {
    name: 'Cream', aliases: ['heavy cream', 'double cream', 'whipping cream'], category: 'dairy',
    subs: [
      { swap: 'Oat cream (Oatly Creamy)', notes: 'Works in pasta sauces, gratins.' },
      { swap: 'Soy cream (Alpro Single)', notes: 'Doesn\'t split when heated.' },
      { swap: 'Coconut cream (canned, chilled)', notes: 'Whips when cold. Coconut flavour is strong.' },
      { swap: 'Cashew cream', notes: 'Blend soaked cashews + water until silky.' },
    ],
  },
  {
    name: 'Yogurt', category: 'dairy',
    subs: [
      { swap: 'Coconut yogurt (Coyo, Alpro)', notes: 'Best texture.' },
      { swap: 'Soy yogurt', notes: 'High protein, slightly beany.' },
      { swap: 'Cashew yogurt', notes: 'Cultured, very creamy. Pricier.' },
    ],
  },

  // Eggs
  {
    name: 'Egg (in baking, binder)', aliases: ['egg', 'eggs'], context: 'in baking - binding role', category: 'eggs',
    subs: [
      { swap: 'Flax egg', notes: '1 tbsp ground flaxseed + 3 tbsp water, rest 5 min. Per egg. Adds nutty flavour.', bestFor: 'cookies, brownies, pancakes' },
      { swap: 'Chia egg', notes: 'Same ratio as flax. More neutral flavour.' },
      { swap: 'Aquafaba', notes: '3 tbsp = 1 egg. Liquid from a chickpea can. Magical - whips like egg white.', bestFor: 'meringues, macarons, mousses' },
      { swap: 'Mashed banana', notes: '1/4 cup = 1 egg. Adds sweetness and banana flavour.', bestFor: 'muffins, quick breads' },
      { swap: 'Apple sauce', notes: '1/4 cup = 1 egg. Adds moisture, mild sweetness.', bestFor: 'cakes, muffins' },
      { swap: 'Silken tofu', notes: '1/4 cup blended = 1 egg. Adds protein, no flavour.', bestFor: 'cheesecakes, quiches' },
      { swap: 'Commercial egg replacer (Bob\'s, Orgran, Just Egg)', notes: 'Follow package. Most reliable for recipes that strictly need egg.' },
    ],
  },
  {
    name: 'Scrambled eggs', context: 'breakfast', category: 'eggs',
    subs: [
      { swap: 'Tofu scramble', notes: 'Crumble firm tofu, fry with turmeric, kala namak (black salt for eggy flavour), nooch.' },
      { swap: 'Just Egg', notes: 'Mung bean liquid. Scrambles like real eggs.' },
      { swap: 'Chickpea flour scramble', notes: 'Chickpea flour + water + kala namak, cook like an omelette.' },
    ],
  },
  {
    name: 'Mayonnaise', category: 'condiments',
    subs: [
      { swap: 'Hellmann\'s Vegan / Heinz Vegan Mayo', notes: 'Mainstream brands now ship vegan versions.' },
      { swap: 'Vegenaise / Just Mayo', notes: 'US/specialty.' },
      { swap: 'Cashew mayo', notes: 'Blend soaked cashews + lemon + mustard + oil.' },
    ],
  },

  // Meat
  {
    name: 'Mince / ground beef', aliases: ['ground beef', 'minced beef'], category: 'meat',
    subs: [
      { swap: 'Soy mince (TVP)', notes: 'Rehydrate in stock. Cheapest. Holds shape in bolognese, chilli.' },
      { swap: 'Lentils (brown or green)', notes: 'Cooked and slightly mashed.', bestFor: 'shepherd\'s pie, ragu, tacos' },
      { swap: 'Mushrooms (finely chopped)', notes: 'Pulse in food processor, sauté hard. Deep umami.' },
      { swap: 'Beyond Mince / This Isn\'t Mince', notes: 'Closest to meat texture. Pricier.' },
      { swap: 'Walnut & lentil mix', notes: 'Pulse walnuts + cooked lentils + smoked paprika.', bestFor: 'tacos' },
    ],
  },
  {
    name: 'Chicken', context: 'in stir-fries, curries, sandwiches', category: 'meat',
    subs: [
      { swap: 'Soy curls', notes: 'Rehydrate, marinate, fry. Stringy chicken-like texture.' },
      { swap: 'Seitan', notes: 'Wheat gluten. Buy ready-made or make from scratch. Best texture for fillets.' },
      { swap: 'Oyster mushrooms', notes: 'Tear into strips, fry until crispy.' },
      { swap: 'Jackfruit (young, in brine)', notes: 'Shreds like pulled chicken. Best in BBQ sauces.' },
      { swap: 'Vivera / This Isn\'t Chicken / Beyond Chicken', notes: 'Direct supermarket swaps.' },
    ],
  },
  {
    name: 'Bacon', category: 'meat',
    subs: [
      { swap: 'Tempeh bacon', notes: 'Slice tempeh thin, marinate in soy + maple + smoked paprika + liquid smoke, fry crisp.' },
      { swap: 'Rice paper bacon', notes: 'Stack 2 rice papers, brush with marinade, bake until crispy.' },
      { swap: 'Coconut bacon', notes: 'Coconut flakes marinated and baked. Crispy topper, not slice replacement.' },
      { swap: 'La Vie / This Isn\'t Bacon', notes: 'Supermarket. Closest visual match.' },
    ],
  },
  {
    name: 'Sausage', category: 'meat',
    subs: [
      { swap: 'Linda McCartney sausages', notes: 'Classic UK option.' },
      { swap: 'Beyond Sausage / Vivera', notes: 'Closer to meat texture.' },
      { swap: 'Homemade seitan sausages', notes: 'Wheat gluten + spices + steam in foil.' },
    ],
  },

  // Seafood
  {
    name: 'Tuna', context: 'in sandwiches, sushi, salads', category: 'seafood',
    subs: [
      { swap: 'Mashed chickpeas + nori + vegan mayo', notes: 'Best for tuna salad sandwiches. Add lemon, capers, celery.' },
      { swap: 'Marinated watermelon (raw)', notes: 'Sashimi-style. Soak in soy + ginger + sesame.' },
      { swap: 'Vegan tuna brands (Loma Linda, Good Catch)', notes: 'Pea protein based. Convenient.' },
    ],
  },
  {
    name: 'Fish (fillets)', category: 'seafood',
    subs: [
      { swap: 'Banana blossom', notes: 'Flaky, white. Coat in batter for "fish" and chips.' },
      { swap: 'Tofu wrapped in nori', notes: 'Marinate firm tofu in seaweed + soy + lemon. Fry or bake.' },
      { swap: 'Vivera / Quorn fishless fillets', notes: 'Supermarket.' },
    ],
  },

  // Baking
  {
    name: 'Buttermilk', context: 'in baking', category: 'baking',
    subs: [
      { swap: 'Plant milk + 1 tbsp lemon juice or vinegar', notes: '1 cup plant milk + acid, rest 5 min. Curdles like buttermilk.' },
    ],
  },
  {
    name: 'Honey', category: 'baking',
    subs: [
      { swap: 'Maple syrup', notes: '1:1 swap. Slightly thinner.' },
      { swap: 'Agave nectar', notes: 'Similar texture to honey. More neutral flavour.' },
      { swap: 'Date syrup', notes: 'Richer, caramel-like.' },
      { swap: 'Brown rice syrup', notes: 'Less sweet, more neutral.' },
    ],
  },
  {
    name: 'Gelatin', category: 'baking',
    subs: [
      { swap: 'Agar agar', notes: 'Seaweed-derived. 1 tbsp powder ~ 8 sheets gelatin. Sets firmer than gelatin.' },
      { swap: 'Pectin', notes: 'For fruit jams and jellies.' },
      { swap: 'Cornstarch / arrowroot', notes: 'For pudding-like setting.' },
    ],
  },
  {
    name: 'Worcestershire sauce', category: 'condiments',
    warning: 'Standard Lea & Perrins contains anchovies.',
    subs: [
      { swap: 'Henderson\'s Relish', notes: 'UK staple. Identical use, no anchovies.' },
      { swap: 'Tamari + tamarind + spices', notes: 'DIY recipe online.' },
      { swap: 'The Wizard\'s Vegan Worcestershire', notes: 'US health stores.' },
    ],
  },

  // Misc
  {
    name: 'Pasta (with egg)', context: 'fresh pasta', category: 'misc',
    subs: [
      { swap: 'Dry pasta (most brands)', notes: 'Standard dry pasta is just durum wheat + water. Check the label.' },
      { swap: 'Eggless fresh pasta', notes: 'Just flour + water + olive oil + salt. Roll thin.' },
    ],
  },
  {
    name: 'Chocolate (milk)', category: 'sweets',
    subs: [
      { swap: 'Dark chocolate (70%+)', notes: 'Many dark chocolates are naturally vegan - check for milk traces on the label.' },
      { swap: 'Oat / rice / almond milk chocolate', notes: 'Vego, NoMo, Hotel Chocolat Velvetiser, Tony\'s Chocolonely Dark Milk.' },
    ],
  },
  {
    name: 'Marshmallows', category: 'sweets',
    warning: 'Standard marshmallows contain gelatin.',
    subs: [
      { swap: 'Dandies / Freedom Mallows', notes: 'Mainstream vegan brands. Toast over a fire fine.' },
    ],
  },
]
