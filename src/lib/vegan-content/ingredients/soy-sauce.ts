import type { IngredientArticle } from '../types'

export const soySauceArticle: IngredientArticle = {
  slug: 'soy-sauce',
  title: 'Is soy sauce vegan?',
  metaTitle: 'Is soy sauce vegan? Yes - but its neighbours are not | Plants Pack',
  metaDescription: 'Traditional soy sauce is fermented soybeans, wheat, salt and water - vegan. The traps are the sauces next to it: dashi blends with fish, ponzu with bonito, oyster sauce, and fish sauce swaps in restaurant kitchens.',
  category: 'ingredient',
  searchQueries: [
    'is soy sauce vegan',
    'does soy sauce have fish',
    'is tamari vegan',
    'is dark soy sauce vegan',
    'is kikkoman vegan',
    'is teriyaki sauce vegan',
  ],
  verdict: 'usually-yes',
  verdictHeadline: 'Yes - real soy sauce is just fermented soybeans, wheat, salt and water. The danger is the lookalike sauces around it.',
  tldr: 'Traditionally brewed soy sauce is vegan: soybeans and wheat fermented with koji, salt and water, nothing animal anywhere in the process. Tamari and dark soy sauce are vegan too. The real risks sit next to it on the shelf and in the kitchen - dashi-blended soy sauces containing bonito fish flakes, ponzu made with fish stock, oyster sauce, and teriyaki or dipping blends where fish sauce or honey sneak in. Ask what is actually in the bottle when it is a house blend.',
  fullAnswer: [
    'Soy sauce is one of the safest condiments a vegan can reach for, and it earns that status at the ingredient level. The traditional brew - Japanese shoyu, Chinese light and dark soy - is made from soybeans, roasted wheat, salt and water, fermented with koji mould over months. There is no step in that process where an animal product enters. Big mainstream brands follow the same recipe: the standard Kikkoman, Lee Kum Kee and Pearl River Bridge soy sauces list nothing animal-derived. Tamari, the wheat-free cousin, is soybeans, salt and water - also vegan, and useful if you are avoiding gluten as well.',
    'Cheaper "hydrolysed" soy sauces - made in days by chemical hydrolysis rather than brewed - are lower quality but still typically vegan: hydrolysed soy protein, corn syrup, caramel colour, salt. The flavour is the casualty, not the ethics. Additives like lactic acid sound dairy-adjacent but are fermentation-derived and fine, as is the alcohol used as a preservative in some Japanese bottles.',
    'The trouble starts with the bottles that look like soy sauce but are blends. Japanese dashi shoyu is soy sauce blended with dashi stock, and dashi is very often made with katsuobushi - dried bonito fish flakes. Ponzu, the citrus sauce served with dumplings and hot pot, frequently contains bonito or other fish extract. Both sit on the same shelf as plain soy sauce, in similar bottles, with the fish named only in the small print. If the label says dashi, katsuo, bonito or "seafood extract," it is not vegan.',
    'Restaurant kitchens add a second layer. A "soy dipping sauce" at a sushi or dumpling place may be a house blend with dashi, and teriyaki sauce is soy-based but individual recipes add honey routinely and occasionally fish sauce. In Thai, Vietnamese and some Chinese cooking, fish sauce and oyster sauce do jobs that look interchangeable with soy sauce from the dining room - a stir-fry described as "in soy sauce" can arrive glazed in oyster sauce. The useful question is not "is soy sauce vegan" but "is this sauce just soy sauce" - and that one you ask the kitchen.',
    'Sweet soy variants are mostly fine but worth a glance. Indonesian kecap manis is traditionally sweetened with palm sugar and is usually vegan; some commercial versions add honey. Chinese dark soy adds molasses or caramel - vegan. As always with condiments, the base product is trustworthy and the flavoured line extensions are where surprises live. When the bottle is in your hand, the ingredient list settles it in seconds.',
  ],
  whatToLookFor: {
    good: [
      'Traditionally brewed soy sauce: soybeans, wheat, salt, water - nothing else needed',
      'Tamari (soybeans, salt, water) - vegan and usually gluten-free',
      'Standard bottles from major brands: plain Kikkoman, Lee Kum Kee, Pearl River Bridge',
      'Kecap manis sweetened with palm sugar',
    ],
    avoid: [
      'Dashi shoyu and anything listing dashi, katsuo or bonito - fish flakes',
      'Ponzu unless the label confirms no fish extract - many contain bonito',
      'Oyster sauce - made from oysters, not a soy sauce at all despite the shelf position',
      'House "soy dipping sauces" and teriyaki glazes until you have asked - honey and fish sauce are common additions',
    ],
  },
  faq: [
    {
      question: 'Is Kikkoman soy sauce vegan?',
      answer: 'The standard all-purpose Kikkoman soy sauce is brewed from soybeans, wheat, salt and water - no animal ingredients. The same goes for their reduced-sodium version. Kikkoman also sells blended products like ponzu and dashi-based sauces, and those can contain fish extract, so check the specific bottle rather than the brand.',
    },
    {
      question: 'Is teriyaki sauce vegan?',
      answer: 'The base - soy sauce, sugar, mirin, sake - is vegan, and many bottled teriyaki sauces are. But honey is a very common substitution for sugar in both bottled and restaurant versions, and some recipes add fish sauce for depth. Bottled: read the label. Restaurant: ask whether the glaze contains honey.',
    },
    {
      question: 'Does dark soy sauce or mushroom soy sauce contain animal products?',
      answer: 'Normally no. Dark soy sauce is regular soy sauce aged longer with molasses or caramel - vegan. Mushroom-flavoured dark soy adds mushroom extract - also vegan. These are safe picks; the blends to watch are the seafood-flavoured soy sauces some brands sell, which name the fish or shellfish on the label.',
    },
    {
      question: 'What about the alcohol and lactic acid on the label?',
      answer: 'Both are fine. The alcohol in Japanese soy sauce is added as a natural preservative and is plant-derived from the fermentation. Lactic acid, despite the name, is produced by bacterial fermentation of plant sugars in this context - it is not derived from milk.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode', 'menu-scanner'],
  relatedTopics: ['kimchi', 'worcestershire-sauce', 'sugar'],
  sources: [
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-08-23',
}
