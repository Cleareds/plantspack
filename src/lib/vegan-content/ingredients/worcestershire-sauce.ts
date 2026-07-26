import type { IngredientArticle } from '../types'

export const worcestershireSauceArticle: IngredientArticle = {
  slug: 'worcestershire-sauce',
  title: 'Is Worcestershire sauce vegan?',
  metaTitle: 'Is Worcestershire sauce vegan? The anchovy problem and which brands are safe | Plants Pack',
  metaDescription: 'The original recipe is fermented with anchovies, so classic Worcestershire sauce is not vegan or vegetarian. Several brands make a fish-free version. Here is how to tell them apart.',
  category: 'ingredient',
  searchQueries: [
    'is worcestershire sauce vegan',
    'does worcestershire sauce have fish',
    'is lea and perrins vegan',
    'vegan worcestershire sauce substitute',
    'is worcestershire sauce vegetarian',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'Classic Worcestershire sauce is not vegan - the traditional recipe is fermented with anchovies.',
  tldr: 'Lea & Perrins and most traditional Worcestershire sauces contain anchovies, which makes them neither vegan nor vegetarian. Dedicated vegan versions exist (Biona, Free & Easy, and various own-brand vegetarian Worcestershire sauces) and taste close enough for almost any recipe. Because the fish is a fermentation ingredient rather than a headline one, people miss it constantly.',
  fullAnswer: [
    'Worcestershire sauce is one of the most reliable ways for an otherwise vegan dish to stop being vegan. The traditional recipe, which Lea & Perrins has used since the 1830s, ferments anchovies in vinegar for months as a core part of building the sauce\'s savoury depth. The anchovies are not a garnish or a trace - they are structural. That puts classic Worcestershire outside both vegan and vegetarian diets.',
    'The reason it slips past people is placement. Worcestershire is a condiment you add by the splash, usually to something else, and the something else is what you are thinking about. It turns up in Caesar dressing, Bloody Marys, shepherd\'s pie, chilli, marinades, cheese on toast, devilled anything, and a great many "vegetarian" pub recipes written by people who never checked. If a savoury recipe has an unexplained depth of flavour and a short list of British pantry ingredients, Worcestershire is a likely suspect.',
    'The good news is that fish-free versions are widely available and genuinely good. Biona makes an organic vegan Worcestershire sauce, Free & Easy makes one, and many supermarket own-brands produce a vegetarian version that is also vegan - though you should confirm, since "vegetarian" on this particular product sometimes still means it dropped the anchovy but kept something else worth checking. Tamarind, molasses, vinegar and spice do most of the heavy lifting, and once the anchovy is gone the gap is smaller than you would expect.',
    'One labelling quirk is worth knowing. In the UK and EU, fish is a declarable allergen, so anchovy must appear in the ingredient list and is usually emphasised in bold. That makes the check fast and reliable: if you can read the label, you can settle this in five seconds. In markets with weaker allergen rules the fish may be buried in "natural flavourings," which is exactly the situation where scanning the ingredient list beats squinting at the front of the bottle.',
    'If you have none to hand, a workable substitute is soy sauce or tamari plus a small amount of tamarind paste or balsamic vinegar and a pinch of sugar. It will not be identical, but in a cooked dish - a chilli, a stew, a marinade - almost nobody notices. For a Bloody Mary, where the sauce is doing more of the work, a purpose-made vegan Worcestershire is worth buying.',
  ],
  whatToLookFor: {
    good: [
      'Bottles explicitly labelled vegan (Biona, Free & Easy, various own-brand)',
      'Ingredient lists built on tamarind, molasses, vinegar, onion and spice with no fish',
      'Soy sauce or tamari plus tamarind paste as a quick homemade stand-in',
    ],
    avoid: [
      'Anchovy, anchovies, "fish" in bold in the allergen line',
      'Lea & Perrins original and most traditional Worcestershire sauces',
      'Assuming "vegetarian" on the label means vegan - confirm the rest of the list',
      'Caesar dressing, shepherd\'s pie and Bloody Mary mixes that do not declare their Worcestershire',
    ],
  },
  faq: [
    {
      question: 'Is Lea & Perrins Worcestershire sauce vegan?',
      answer: 'No. The original Lea & Perrins recipe contains anchovies as a fermentation ingredient, which makes it neither vegan nor vegetarian. Some regional Lea & Perrins formulations differ, so check the bottle in front of you, but the default answer for the classic product is no.',
    },
    {
      question: 'Why is there fish in a brown sauce at all?',
      answer: 'Fermented anchovy provides glutamates - deep savoury umami - in the same way fish sauce does in Southeast Asian cooking or as anchovy does in Roman garum, which Worcestershire is descended from. It is there for flavour chemistry, not as a token ingredient, which is why removing it takes reformulation rather than omission.',
    },
    {
      question: 'Is vegetarian Worcestershire sauce automatically vegan?',
      answer: 'Usually but not always. Dropping the anchovy is the main change, and most vegetarian versions happen to contain nothing else animal-derived. Since "vegetarian" only promises no fish or meat, check the full list for anything dairy-derived before assuming.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode'],
  relatedTopics: ['e-codes', 'cheese', 'vegan-vs-vegetarian'],
  sources: [
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
    { title: 'UK Food Standards Agency - Allergen labelling rules', url: 'https://www.food.gov.uk/business-guidance/allergen-labelling-for-food-manufacturers' },
  ],
  updatedAt: '2026-07-26',
}
