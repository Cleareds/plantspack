// Dish keyword library for the long-tail SEO surface
// (/vegan-places/{country}/{city}/best-vegan/{dish}).
//
// Each dish entry has:
//   - slug: URL-safe identifier (lowercase, hyphenated)
//   - label: human label for headings ("Donut", "Ramen")
//   - needles: terms to match across name / cuisine_types / subcategory /
//              description. First match wins for scoring.
//   - aliases: optional alternative spellings tolerated in URL parsing
//              (e.g. /best-vegan-doughnut/ aliased to /best-vegan-donut/)
//
// Scoring (in dish-page-data.ts):
//   +10 if a needle matches place.name
//   + 6 if a needle matches place.cuisine_types
//   + 4 if a needle matches place.subcategory
//   + 2 if a needle matches place.description
// Plus bonuses for verification tier and vegan_level.

export interface DishDef {
  slug: string
  label: string
  needles: string[]
  /** Whether this dish typically requires the venue to be a specialised
   *  shop (e.g. donut shop, ramen shop) vs a dish on a wider menu. Tighter
   *  matching threshold for specialised dishes. */
  specialised?: boolean
  /** Subcategory hint (matched on subcategory field for +4 bonus) */
  subcategoryHint?: string
}

export const DISHES: DishDef[] = [
  // Sweet
  { slug: 'donut',       label: 'Donut',        needles: ['donut','doughnut','krapfen','berliner','sufganiyot'], specialised: true },
  { slug: 'ice-cream',   label: 'Ice cream',    needles: ['ice cream','ice-cream','ice_cream','gelato','sorbet','soft serve','soft-serve','glaceria'], subcategoryHint: 'ice-cream' },
  { slug: 'gelato',      label: 'Gelato',       needles: ['gelato','gelateria'], specialised: true },
  { slug: 'cake',        label: 'Cake',         needles: ['cake','tort','torte','gateau','cheesecake'] },
  { slug: 'cheesecake',  label: 'Cheesecake',   needles: ['cheesecake'], specialised: true },
  { slug: 'brownie',     label: 'Brownie',      needles: ['brownie'], specialised: true },
  { slug: 'chocolate',   label: 'Chocolate',    needles: ['chocolate','choco','schoko','cacao','cocoa'], subcategoryHint: 'chocolatier' },
  { slug: 'cinnamon-roll', label: 'Cinnamon roll', needles: ['cinnamon roll','cinnamon-roll','kanelbulle','kanelsnegl','franzbroetchen'], specialised: true },
  { slug: 'pastry',      label: 'Pastry',       needles: ['pastry','pastries','viennoiserie','patisserie'] },
  { slug: 'croissant',   label: 'Croissant',    needles: ['croissant'] },
  { slug: 'bakery',      label: 'Bakery',       needles: ['bakery','baker','boulangerie','panaderia','panaderia','padaria','bäckerei','panificio'], subcategoryHint: 'bakery' },
  { slug: 'bagel',       label: 'Bagel',        needles: ['bagel'], specialised: true },
  { slug: 'dessert',     label: 'Dessert',      needles: ['dessert','postre','dolci','patisserie'] },

  // Italian / Mediterranean
  { slug: 'pizza',       label: 'Pizza',        needles: ['pizza','pizzeria'], subcategoryHint: 'pizzeria' },
  { slug: 'pasta',       label: 'Pasta',        needles: ['pasta','spaghetti','tagliatelle','fettuccine','penne','ravioli'] },
  { slug: 'lasagne',     label: 'Lasagne',      needles: ['lasagne','lasagna'] },
  { slug: 'gnocchi',     label: 'Gnocchi',      needles: ['gnocchi'] },
  { slug: 'risotto',     label: 'Risotto',      needles: ['risotto'] },
  { slug: 'tapas',       label: 'Tapas',        needles: ['tapas'] },
  { slug: 'paella',      label: 'Paella',       needles: ['paella'] },

  // Burger & American
  { slug: 'burger',      label: 'Burger',       needles: ['burger','hamburger','smash-burger','smashburger','burgers'], subcategoryHint: 'burger' },
  { slug: 'hot-dog',     label: 'Hot dog',      needles: ['hot dog','hot-dog','hot_dog','hotdog','frankfurter'] },
  { slug: 'bbq',         label: 'BBQ',          needles: ['bbq','barbecue','barbeque','smoked'] },
  { slug: 'mac-and-cheese', label: 'Mac & cheese', needles: ['mac and cheese','mac & cheese','macaroni cheese'] },
  // Plant versions of traditionally animal dishes — high-intent queries
  // ("vegan fried chicken berlin"). The label must never contain "vegan": the
  // page title is already `Best Vegan ${label} in ${city}`.
  { slug: 'chicken',     label: 'Chicken',      needles: ['chicken','fried chicken','nugget'] },
  { slug: 'fish-and-chips', label: 'Fish and chips', needles: ['fish and chips','fish_and_chips','fish & chips','fish-and-chips'] },
  { slug: 'fries',       label: 'Fries',        needles: ['fries','frite','friture','frituur','pommes','patat'] },

  // Asian
  { slug: 'ramen',       label: 'Ramen',        needles: ['ramen'], specialised: true },
  { slug: 'sushi',       label: 'Sushi',        needles: ['sushi','maki','temaki','onigiri'], subcategoryHint: 'sushi' },
  { slug: 'pho',         label: 'Pho',          needles: ['pho','phở'], specialised: true },
  { slug: 'banh-mi',     label: 'Banh mi',      needles: ['banh mi','banh-mi','bánh mì'], specialised: true },
  { slug: 'dim-sum',     label: 'Dim sum',      needles: ['dim sum','dim-sum','dimsum'] },
  { slug: 'bao',         label: 'Bao',          needles: ['bao','baozi'] },
  { slug: 'dumpling',    label: 'Dumpling',     needles: ['dumpling','jiaozi','potsticker','gyoza','mandu'] },
  { slug: 'pad-thai',    label: 'Pad Thai',     needles: ['pad thai','pad-thai'], specialised: true },
  // 'noodle' also matches the cuisine value 'noodles' by substring.
  { slug: 'noodles',     label: 'Noodles',      needles: ['noodle','nudel'] },
  { slug: 'indonesian-food', label: 'Indonesian food', needles: ['indonesian','nasi goreng','tempeh warung'] },
  { slug: 'thai',        label: 'Thai food',    needles: ['thai','siam','isan'] },
  { slug: 'curry',       label: 'Curry',        needles: ['curry','curri','tikka','masala'] },
  { slug: 'biryani',     label: 'Biryani',      needles: ['biryani','biriyani'] },
  { slug: 'indian',      label: 'Indian food',  needles: ['indian','desi','bhel','chaat','dosa','samosa'] },

  // Middle Eastern & Mediterranean
  { slug: 'falafel',     label: 'Falafel',      needles: ['falafel'], specialised: true },
  { slug: 'hummus',      label: 'Hummus',       needles: ['hummus','houmous'] },
  { slug: 'kebab',       label: 'Kebab',        needles: ['kebab','kebap','döner','doner','shawarma','shawerma'] },
  { slug: 'gyros',       label: 'Gyros',        needles: ['gyros','gyro','souvlaki'] },
  { slug: 'mediterranean', label: 'Mediterranean food', needles: ['mediterranean','levantine'] },
  { slug: 'ethiopian',   label: 'Ethiopian food', needles: ['ethiopian','injera','habesha'] },
  { slug: 'turkish-food', label: 'Turkish food', needles: ['turkish','türkisch','turkiye','anatolian'] },
  { slug: 'lebanese-food', label: 'Lebanese food', needles: ['lebanese','libanais','libanesisch'] },
  { slug: 'middle-eastern', label: 'Middle Eastern food', needles: ['middle eastern','middle_eastern','middle-eastern','arab','arabic','syrian','persian'] },
  { slug: 'greek-food',  label: 'Greek food',   needles: ['greek','griechisch','hellenic'] },
  { slug: 'moroccan-food', label: 'Moroccan food', needles: ['moroccan','marocain','tagine','tajine'] },

  // Mexican / Latin
  { slug: 'taco',        label: 'Taco',         needles: ['taco','tacos','taqueria'], specialised: true },
  { slug: 'burrito',     label: 'Burrito',      needles: ['burrito','burritos'] },
  { slug: 'tamale',      label: 'Tamale',       needles: ['tamale','tamales'] },
  { slug: 'mexican',     label: 'Mexican food', needles: ['mexican','mexicana','mexicano'] },
  { slug: 'arepa',       label: 'Arepa',        needles: ['arepa','arepas'] },
  { slug: 'brazilian-food', label: 'Brazilian food', needles: ['brazilian','brasileir','feijoada'] },
  { slug: 'peruvian-food', label: 'Peruvian food', needles: ['peruvian','peruana','ceviche'] },

  // Bowl & casual
  { slug: 'bowl',        label: 'Bowl',         needles: ['bowl','poke','poké','rice bowl','grain bowl','buddha bowl'] },
  { slug: 'acai-bowl',   label: 'Açaí bowl',    needles: ['acai','açaí'] },
  { slug: 'salad',       label: 'Salad',        needles: ['salad','salade','ensalada','insalata'] },
  { slug: 'sandwich',    label: 'Sandwich',     needles: ['sandwich','panini'] },
  { slug: 'wrap',        label: 'Wrap',         needles: ['wrap','wrap '] },
  { slug: 'soup',        label: 'Soup',         needles: ['soup','soupe','suppe','zuppa'] },

  // Breakfast / brunch
  { slug: 'breakfast',   label: 'Breakfast',    needles: ['breakfast','breakfast.','desayuno','colazione','frühstück'] },
  { slug: 'brunch',      label: 'Brunch',       needles: ['brunch'] },
  { slug: 'pancake',     label: 'Pancake',      needles: ['pancake','pannenkoek','crêpe','crepe'] },
  { slug: 'waffle',      label: 'Waffle',       needles: ['waffle','gaufre','wafel'] },
  { slug: 'porridge',    label: 'Porridge',     needles: ['porridge','oats','oatmeal'] },
  { slug: 'avocado-toast', label: 'Avocado toast', needles: ['avocado toast','avocado-toast'] },

  // Drinks / cafe
  { slug: 'coffee',      label: 'Coffee',       needles: ['coffee','café','cafe','espresso','specialty coffee'], subcategoryHint: 'cafe' },
  { slug: 'smoothie',    label: 'Smoothie',     needles: ['smoothie','juice bar'] },
  { slug: 'matcha',      label: 'Matcha',       needles: ['matcha'] },
  { slug: 'bubble-tea',  label: 'Bubble tea',   needles: ['bubble tea','bubble_tea','boba','milk tea'] },
  { slug: 'kombucha',    label: 'Kombucha',     needles: ['kombucha'] },

  // Regional & national
  { slug: 'german-food', label: 'German food',  needles: ['german','schnitzel','currywurst','bratwurst','rouladen'] },
  { slug: 'french-food', label: 'French food',  needles: ['french','francaise','bistro','brasserie','crêperie'] },
  { slug: 'italian-food', label: 'Italian food', needles: ['italian','italiana','italiano','trattoria','osteria'] },
  { slug: 'japanese-food', label: 'Japanese food', needles: ['japanese','nihon'] },
  { slug: 'korean-food', label: 'Korean food',  needles: ['korean','bibimbap','kimchi'] },
  { slug: 'chinese-food', label: 'Chinese food', needles: ['chinese','china','sichuan','cantonese'] },
  { slug: 'vietnamese-food', label: 'Vietnamese food', needles: ['vietnamese','viet'] },
  { slug: 'american-food', label: 'American food', needles: ['american','diner'] },
  { slug: 'british-food', label: 'British food', needles: ['british','english breakfast','pub food'] },
  { slug: 'spanish-food', label: 'Spanish food', needles: ['spanish','española','espanola','catalan'] },
  { slug: 'polish-food', label: 'Polish food',  needles: ['polish','polska','pierogi'] },
  { slug: 'african-food', label: 'African food', needles: ['african','afrikan','nigerian','senegal'] },

  // Allergen / diet niches
  { slug: 'gluten-free', label: 'Gluten-free',  needles: ['gluten-free','gluten free','glutenfree','sans gluten','glutenfrei'] },
  { slug: 'raw',         label: 'Raw',          needles: ['raw food','raw vegan','crudo'] },
  { slug: 'organic',     label: 'Organic',      needles: ['organic','bio','biologico'] },
]

/** O(1) lookup by slug */
export const DISH_BY_SLUG: Record<string, DishDef> = Object.fromEntries(DISHES.map(d => [d.slug, d]))

/** Normalise URL-supplied dish slug (handle common aliases) */
export function normaliseDishSlug(input: string | undefined | null): string | null {
  if (!input) return null
  const s = input.toLowerCase().replace(/^best-vegan-/, '')
  // Direct match
  if (DISH_BY_SLUG[s]) return s
  // Common aliases
  const ALIAS: Record<string, string> = {
    'doughnut': 'donut',
    'doughnuts': 'donut',
    'donuts': 'donut',
    'icecream': 'ice-cream',
    'iceeream': 'ice-cream',
    'soft-serve': 'ice-cream',
    'cinnamonroll': 'cinnamon-roll',
    'cinnamon-rolls': 'cinnamon-roll',
    'hot-dogs': 'hot-dog',
    'hotdog': 'hot-dog',
    'tacos': 'taco',
    'burritos': 'burrito',
    'dumplings': 'dumpling',
    'döner': 'kebab',
    'doner': 'kebab',
    'shawarma': 'kebab',
    'pancakes': 'pancake',
    'waffles': 'waffle',
    'salads': 'salad',
    'sandwiches': 'sandwich',
    'sushi-bar': 'sushi',
    'pizzas': 'pizza',
    'pizzeria': 'pizza',
    'pasta-bar': 'pasta',
    'phở': 'pho',
    'bánh-mì': 'banh-mi',
    'açaí': 'acai-bowl',
    'acai': 'acai-bowl',
    'thai-food': 'thai',
    'curry-house': 'curry',
  }
  return ALIAS[s] || null
}
