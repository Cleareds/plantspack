import type { IngredientArticle } from '../types'

export const breadArticle: IngredientArticle = {
  slug: 'bread',
  title: 'Is bread vegan?',
  metaTitle: 'Is bread vegan? Mostly yes, but watch for milk, eggs, butter, honey and L-cysteine | Plants Pack',
  metaDescription: 'Most plain bread is vegan - flour, water, yeast, salt. But brioche, challah, milk bread, and many supermarket loaves hide dairy, eggs, honey, or animal-derived dough conditioners like L-cysteine and mono- and diglycerides.',
  category: 'ingredient',
  searchQueries: [
    'is bread vegan',
    'is sourdough vegan',
    'is white bread vegan',
    'is brioche vegan',
    'is challah vegan',
    'is pita bread vegan',
    'is bagel vegan',
  ],
  verdict: 'usually-yes',
  verdictHeadline: 'Most plain bread is vegan, but watch for milk, butter, eggs, honey, and animal-derived dough conditioners (E920, E471).',
  tldr: 'Traditional bread is flour, water, yeast, and salt - vegan by default. Trouble shows up in enriched breads (brioche, challah, milk bread), in some artisan loaves sweetened with honey, and in commercial loaves that use L-cysteine (E920, often from duck feathers or pig bristles) or mono- and diglycerides (E471, can be animal fat). Sourdough, French baguettes, most ciabatta, and most rye are reliably vegan. Always read the label.',
  fullAnswer: [
    'In its most basic form, bread is one of the most vegan-friendly foods on the planet. The traditional recipe is four ingredients: flour, water, yeast, and salt. That covers most sourdough, most French baguettes (which are legally restricted to those four ingredients in France under the 1993 "decret pain"), most Italian ciabatta, most rye bread, and most plain whole wheat loaves. If a loaf has a short ingredient list and nothing jumps out, it is almost certainly vegan.',
    'The trouble starts with enriched breads. Brioche is made with butter and eggs - sometimes a lot of both - and is never vegan unless explicitly labelled. Challah, the traditional Jewish braided loaf, contains eggs (and often honey). Milk bread, Japanese shokupan, and Hong Kong-style sweet buns use milk and sometimes butter. Croissants are laminated with butter. Greek tsoureki uses eggs, butter, and sometimes milk. Some pita breads and naan are made with yogurt, milk, or ghee. None of these are vegan by default, though vegan versions of each exist if you look for them.',
    'Then there is the L-cysteine problem. L-cysteine (E920) is an amino acid used as a dough conditioner in commercial bread to make it softer and speed up production. It shows up most often in bagels, pizza dough, factory sandwich bread, and fast-food buns. The catch: L-cysteine is most commonly extracted from duck and chicken feathers or pig bristles. A synthetic version exists, and some brands use it, but the label just says "L-cysteine" or "E920" without specifying the source. Unless the product is certified vegan, you cannot tell from the packaging. This is the single biggest hidden non-vegan ingredient in supermarket bread.',
    'The other common offender is mono- and diglycerides (E471), an emulsifier that turns up in almost every soft supermarket loaf, hamburger bun, and packaged sandwich bread. Like L-cysteine, it can be made from plant oils or animal fats, and the label does not say which. Manufacturer-dependent. Some brands disclose the source on request or on their website; most do not. For strict vegans, E471 in an uncertified product is a coin flip, which is why a lot of vegans skip plastic-wrapped supermarket bread entirely and stick to bakery loaves with short ingredient lists.',
    'The reliably vegan options are easy to remember. Traditional sourdough - flour, water, wild yeast starter, salt - is almost always vegan. A French baguette bought in France is legally just flour, water, yeast, and salt. Most Italian ciabatta and focaccia are vegan (focaccia uses olive oil, not butter). Most rye breads and pumpernickel are vegan. Plain whole wheat loaves from a bakery with a short ingredient list are usually fine. Anything labelled "vegan" or carrying a Vegan Society, V-Label, or Certified Vegan mark has been checked end to end.',
    'In practice: read the label, and when in doubt, ask the baker. A real bakery will tell you straight away whether they use eggs, milk, butter, honey, or commercial dough conditioners - most artisan bakers use none of these in their standard loaves. Supermarket bread is where you have to be more careful, and where certified vegan brands (Warburtons, Hovis, Schar gluten-free, store-brand "free from" lines) earn their keep. If you want a single safe default, traditional sourdough from a local bakery is hard to beat.',
  ],
  whatToLookFor: {
    good: [
      'Traditional sourdough (flour, water, starter, salt)',
      'French baguette - legally just flour, water, yeast, salt in France',
      'Most Italian ciabatta and focaccia (olive oil, not butter)',
      'Most rye bread and pumpernickel',
      'Plain whole wheat loaves with a short ingredient list',
      'Certified vegan brands (Vegan Society, V-Label, Certified Vegan logos)',
    ],
    avoid: [
      'Brioche, challah, milk bread, shokupan, tsoureki - dairy and eggs',
      'Croissants, danishes, most laminated pastry - butter',
      'Naan and some pita - may contain yogurt, milk, or ghee',
      'Mono- and diglycerides (E471) - can be animal or plant fat, manufacturer dependent',
      'L-cysteine (E920) - usually from duck feathers or pig bristles, sometimes synthetic',
      'Honey, milk powder, whey, butter, eggs, egg wash listed in the ingredients',
    ],
  },
  faq: [
    {
      question: 'Is sourdough vegan?',
      answer: 'Almost always yes. Traditional sourdough is flour, water, wild yeast starter, and salt - no dairy, no eggs, no honey. The wild yeast and lactic acid bacteria in the starter are microorganisms, not animals. The only exceptions are flavoured sourdoughs (cheese sourdough, milk sourdough) or commercial versions with added dairy or dough conditioners, so still glance at the label.',
    },
    {
      question: 'Is brioche vegan?',
      answer: 'No. Brioche is defined by its high butter and egg content - that is what gives it the rich yellow colour and soft crumb. A standard brioche is not vegan. Vegan brioche exists and uses plant butter and aquafaba or flax egg, but you have to seek it out and it will be labelled.',
    },
    {
      question: 'Is naan vegan?',
      answer: 'Often yes, sometimes no. Traditional Indian naan is usually made with yogurt and sometimes ghee, which makes it not vegan. Many restaurant and supermarket naans, especially plain or garlic versions, are made with just flour, water, yeast, oil, and salt - check the label or ask. Stuffed and "butter naan" varieties almost always contain dairy.',
    },
    {
      question: 'Are bagels vegan?',
      answer: 'Usually yes, with two caveats. First, L-cysteine (E920) is common in commercial bagels and is usually animal-derived - if the brand is not certified vegan you cannot be sure. Second, egg bagels (sometimes labelled "egg," "challah-style," or with a shiny egg-washed crust) contain eggs. Plain, sesame, poppy, and everything bagels from a kosher pareve bakery are typically safe.',
    },
    {
      question: 'Is supermarket sliced bread vegan?',
      answer: 'Often yes on paper, but with E471 and E920 caveats. Most plastic-wrapped sliced loaves are dairy and egg free, but contain mono- and diglycerides (E471) and sometimes L-cysteine (E920), both of which can be animal-derived without being labelled as such. If you want certainty, buy a certified vegan brand or stick to bakery loaves with short ingredient lists.',
    },
    {
      question: 'What about gluten-free bread?',
      answer: 'Often vegan, since gluten-free brands tend to avoid the wheat-flour dough conditioners (L-cysteine) that turn up in conventional bread. But they sometimes use eggs as a binder to make up for the missing gluten, so check the label. Schar, BFree, and most "free from" supermarket lines have clearly labelled vegan options.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode'],
  relatedTopics: ['honey', 'sugar'],
  sources: [
    { title: 'The Vegan Society: hidden non-vegan ingredients in bread', url: 'https://www.vegansociety.com/resources/nutrition-and-health/ingredients' },
    { title: 'Food Standards Agency UK: food additives reference (E920, E471)', url: 'https://www.food.gov.uk/safety-hygiene/food-additives' },
    { title: 'French decree on bread of tradition (decret 93-1074, 1993)', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000727617' },
  ],
  updatedAt: '2026-05-29',
}
