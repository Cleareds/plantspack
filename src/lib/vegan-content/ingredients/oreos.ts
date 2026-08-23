import type { IngredientArticle } from '../types'

export const oreosArticle: IngredientArticle = {
  slug: 'oreos',
  title: 'Are Oreos vegan?',
  metaTitle: 'Are Oreos vegan? Ingredients yes, small print no | Plants Pack',
  metaDescription: 'Classic Oreos contain no milk, eggs or animal ingredients by recipe. So why does the company itself say they are not suitable for vegans? Cross-contact, sugar processing and the varieties that genuinely contain dairy, explained.',
  category: 'ingredient',
  searchQueries: [
    'are oreos vegan',
    'do oreos have milk',
    'are oreos dairy free',
    'why are oreos not vegan',
    'are golden oreos vegan',
    'oreo ingredients vegan',
  ],
  verdict: 'usually-yes',
  verdictHeadline: 'By ingredients, yes - the classic ones. The company itself refuses the label, and some varieties genuinely contain dairy.',
  tldr: 'Classic Oreos are made without milk, eggs or any other animal ingredient - the famous "creme" is sugar and vegetable fat, not cream. Mondelez still says Oreos are not suitable for vegans because they are produced on lines that also handle milk, so trace cross-contact is possible. Strict vegans also point at the sugar, which in some countries may be refined with bone char. And the coated and cake varieties are a different story: fudge-covered Oreos and Cakesters contain actual dairy or egg. Read the pack for anything that is not a plain sandwich cookie.',
  fullAnswer: [
    'Oreos are probably the most argued-about "accidentally vegan" product in existence, and both sides of the argument are working from true facts. The ingredient list of a classic Oreo contains no animal products: flour, sugar, vegetable oil, alkalised cocoa, starch, leavening, salt, soy lecithin, an emulsifier and vanillin. The creme filling that looks like dairy is not - it is sugar and fat. Nothing in the recipe comes from an animal.',
    'The complication is that Mondelez, the company that makes them, explicitly says Oreos are "not suitable for vegans." That is not because of a hidden ingredient - it is a cross-contact statement. Oreos are produced in facilities and on lines that also handle milk, so trace amounts can end up in the cookie, and the company words its answer defensively. Whether that matters is the same personal line as a shared fryer in a chip shop: no animal ingredient is used on purpose, but the label cannot promise zero contact. Most vegans treat unintentional traces as acceptable - the Vegan Society itself says unavoidable cross-contamination does not make a product non-vegan - but it is exactly why you will never see a vegan logo on the pack.',
    'The second caveat is sugar. In the United States, some cane sugar is filtered through bone char, an animal-derived processing aid that never appears on any label. Mondelez buys sugar from multiple suppliers, so there is no way to know whether the sugar in a given Oreo touched bone char. In the EU and UK this practice is essentially not used, so European Oreos do not carry this concern. If bone-char sugar is inside your personal line, US Oreos are a "probably fine but unknowable" - the same status as most mainstream sweets there.',
    'The third caveat is the variety. The plain sandwich cookies - classic, Golden, Double Stuf, most seasonal creme flavours - share the dairy-free recipe. The further a product gets from a plain sandwich cookie, the more likely real dairy or egg appears: fudge-covered and chocolate-dipped Oreos contain milk in the coating, Cakesters are soft cakes made with egg, and some regional or limited editions add milk chocolate pieces. The brand name tells you nothing; the specific product\'s ingredient list tells you everything. Recipes also differ slightly between countries, so check the pack in front of you rather than an ingredient list from another market.',
    'There is also palm oil, which is in most Oreos worldwide. Palm oil is plant-derived and vegan by definition, but many vegans avoid it for deforestation and habitat reasons - a values call rather than an ingredients call. If that is you, Oreos are out on those grounds regardless of the dairy question.',
  ],
  whatToLookFor: {
    good: [
      'Classic, Golden and Double Stuf sandwich cookies - no animal ingredients by recipe',
      'The ingredient list on the pack in front of you, not one from another country',
      'EU and UK packs, if bone-char sugar processing is a concern for you',
    ],
    avoid: [
      'Fudge-covered, chocolate-dipped and "enrobed" Oreo varieties - the coating contains milk',
      'Oreo Cakesters and other soft-baked variants - made with egg and dairy',
      'Limited editions with chocolate pieces or candy inclusions until you have read the label',
      'Assuming the "may contain milk" line is an ingredient - it is a cross-contact statement',
    ],
  },
  faq: [
    {
      question: 'Why does Oreo say their cookies are not suitable for vegans?',
      answer: 'Because of cross-contact, not ingredients. Oreos are made on production lines that also handle milk, so the company cannot guarantee zero traces and words its official answer defensively. No milk, egg or other animal ingredient is in the classic recipe on purpose. Most vegans accept unavoidable trace contact - the Vegan Society takes the same position - but the company will never market the cookie as vegan while it shares lines with dairy products.',
    },
    {
      question: 'Are Golden Oreos vegan?',
      answer: 'Same status as the classic ones: no animal ingredients in the recipe, same cross-contact disclaimer, same sugar caveat in the US. The vanilla cookie does not use butter or milk. Check the pack for your specific country, but Golden Oreos are generally in the "accidentally vegan by ingredients" category.',
    },
    {
      question: 'Is the creme filling dairy?',
      answer: 'No. Despite the look and the name, the filling is sugar, vegetable oil and flavouring - no cream, no milk solids by recipe. The spelling "creme" rather than "cream" exists precisely because it contains no dairy cream.',
    },
    {
      question: 'What about the sugar and bone char?',
      answer: 'Some US cane sugar refineries use bone char as a filter, and Mondelez sources from multiple suppliers, so the status of the sugar in any given US pack is unknowable. Bone char never appears on labels anywhere. In the EU and UK the practice is essentially absent. Many vegans treat this as below their practical line since it cannot be verified product by product; strict vegans in the US often prefer brands that certify their sugar as unrefined or beet-based.',
    },
  ],
  relatedTools: ['barcode', 'ingredient-scanner'],
  relatedTopics: ['sugar', 'palm-oil', 'chocolate'],
  sources: [
    { title: 'PETA - Accidentally vegan snacks list', url: 'https://www.peta.org/living/food/accidentally-vegan/' },
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-08-23',
}
