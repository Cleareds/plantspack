import type { IngredientArticle } from '../types'

export const pestoArticle: IngredientArticle = {
  slug: 'pesto',
  title: 'Is pesto vegan?',
  metaTitle: 'Is pesto vegan? Parmesan, rennet, and how to spot a vegan jar | Plants Pack',
  metaDescription: 'Traditional pesto contains Parmigiano-Reggiano and Pecorino, both made with animal rennet - so it is not vegan or vegetarian. Vegan pesto is easy to find and easy to make.',
  category: 'ingredient',
  searchQueries: [
    'is pesto vegan',
    'does pesto have cheese',
    'is green pesto vegetarian',
    'vegan pesto brands',
    'is red pesto vegan',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'Traditional pesto is not vegan - it contains hard cheese, and the classic cheeses use animal rennet.',
  tldr: 'Authentic pesto alla genovese contains Parmigiano-Reggiano and often Pecorino. Both are made with animal rennet under their protected-origin rules, so traditional pesto is not vegan and not strictly vegetarian either. Vegan jars are now common in most supermarkets, and homemade vegan pesto is genuinely simple. Watch for milk in "dairy-free" red pesto too.',
  fullAnswer: [
    'Pesto is a good example of a dish where the animal ingredient is authentic rather than incidental. Pesto alla genovese is defined by basil, pine nuts, garlic, olive oil, salt and hard cheese - normally Parmigiano-Reggiano, frequently with Pecorino Sardo alongside it. The cheese is not a topping; it is emulsified into the sauce and contributes both salt and body. Remove it and you have to rebalance the recipe rather than simply leave a gap.',
    'There is a second layer that catches even vegetarians. Parmigiano-Reggiano is a DOP product and its production rules require calf rennet, an enzyme taken from the stomach lining of slaughtered calves. Pecorino Romano and Pecorino Sardo have equivalent requirements using lamb rennet. So genuine Parmigiano is not vegetarian, let alone vegan - a fact that surprises a lot of people who have been eating it for years under the assumption that cheese is a vegetarian food.',
    'Commercial jarred pesto is more variable and slightly more forgiving. Cheaper jars often use generic "hard cheese" or "medium-fat hard cheese" rather than certified Parmigiano, and some of those are made with microbial rennet, which is vegetarian. That still leaves the milk, so it remains firmly non-vegan. The practical upshot: a jar being vegetarian tells you nothing about it being vegan, and you have to read the list either way.',
    'Vegan pesto has become genuinely easy to buy. Sacla, Zest, Rubies in the Rubble and a long list of own-brand ranges make versions that replace the cheese with nutritional yeast, cashews, or a vegan hard-cheese analogue. Quality varies more than with dairy pesto, so it is worth trying a couple. Read the front carefully though - "dairy-free" and "vegan" are not the same claim, and red or sun-dried tomato pesto sometimes contains milk powder even when the green version in the same range does not.',
    'Making it yourself sidesteps everything and takes about five minutes. Basil, garlic, olive oil, toasted pine nuts (or cheaper walnuts, sunflower seeds or cashews), a generous amount of nutritional yeast for the savoury note, salt, and a squeeze of lemon to keep the colour. The nutritional yeast is doing the Parmesan\'s job; do not skip it or the result tastes flat rather than fresh.',
  ],
  whatToLookFor: {
    good: [
      'Jars explicitly labelled vegan',
      'Nutritional yeast, cashew or vegan hard-cheese alternative in the ingredient list',
      'Homemade: basil, garlic, olive oil, nuts or seeds, nutritional yeast, lemon',
    ],
    avoid: [
      'Parmigiano-Reggiano, Grana Padano, Pecorino, "hard cheese", "medium-fat hard cheese"',
      'Milk powder or whey - common in red and sun-dried tomato pesto',
      'Treating "dairy-free" as equivalent to "vegan" on the front of the jar',
      'Restaurant pesto without asking - it is usually the traditional recipe',
    ],
  },
  faq: [
    {
      question: 'Is Parmesan vegetarian?',
      answer: 'Genuine Parmigiano-Reggiano is not. Its DOP production rules require calf rennet, taken from slaughtered calves. Grana Padano and the traditional Pecorinos are the same. Generic "Italian hard cheese" sold outside those protected names may use microbial rennet and be vegetarian, but it is still dairy and therefore not vegan.',
    },
    {
      question: 'Is red or sun-dried tomato pesto more likely to be vegan?',
      answer: 'Not reliably. Red pesto often contains less hard cheese than green, which is why people assume it is safer, but many recipes add milk powder, cream or whey for texture. Check the specific jar - within a single brand the green and red versions frequently have different answers.',
    },
    {
      question: 'What replaces the cheese in vegan pesto?',
      answer: 'Nutritional yeast does most of the work, providing the savoury, slightly cheesy note. Soaked cashews add the creamy body, white miso can deepen the savouriness, and a little extra salt plus lemon juice compensates for what the aged cheese was contributing. Commercial versions typically use a combination of these.',
    },
    {
      question: 'Can I trust pesto pasta in a restaurant?',
      answer: 'Assume it contains cheese unless the menu says otherwise. Pesto is normally bought in or made to the traditional recipe, and it is one of the dishes vegetarian diners most often get wrong too because of the rennet. Ask, or scan the menu and check before ordering.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'menu-scanner', 'barcode', 'substitutes'],
  relatedTopics: ['cheese', 'vegan-vs-vegetarian', 'e-codes'],
  sources: [
    { title: 'Consorzio del Formaggio Parmigiano-Reggiano - Production standard', url: 'https://www.parmigianoreggiano.com/' },
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-07-26',
}
