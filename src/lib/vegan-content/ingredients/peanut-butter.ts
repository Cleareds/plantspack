import type { IngredientArticle } from '../types'

export const peanutButterArticle: IngredientArticle = {
  slug: 'peanut-butter',
  title: 'Is peanut butter vegan?',
  metaTitle: 'Is peanut butter vegan? Almost always - here are the exceptions | Plants Pack',
  metaDescription: 'Peanuts, oil and salt - nearly all peanut butter is vegan. The exceptions are real though: honey-roasted and honey varieties, omega-3 blends enriched with fish oil, and the bone-char sugar question in the US.',
  category: 'ingredient',
  searchQueries: [
    'is peanut butter vegan',
    'does peanut butter have dairy',
    'is skippy vegan',
    'is jif peanut butter vegan',
    'peanut butter honey vegan',
    'is crunchy peanut butter vegan',
  ],
  verdict: 'usually-yes',
  verdictHeadline: 'Almost always. Peanuts, oil and salt - the exceptions announce themselves: honey and omega-3 fish oil blends.',
  tldr: 'Plain peanut butter - smooth or crunchy - is vegan: peanuts, usually salt, often a stabilising oil, sometimes sugar. The genuine exceptions are honey varieties (honey-roasted or sweetened with honey, named on the front), a handful of omega-3 enriched blends that use fish oil, and for strict US vegans the possibility that the added sugar was refined with bone char. If the jar just says peanuts and salt, you are done.',
  fullAnswer: [
    'Peanut butter is about as safe as processed food gets for vegans. The core recipe is ground roasted peanuts, and most supermarket jars add only salt, a stabilising vegetable oil (usually palm) to stop separation, and sometimes sugar. Nothing dairy, nothing egg, nothing animal in the standard product from the big brands - a plain Skippy, Jif, Whole Earth or supermarket own-brand jar is vegan by ingredients.',
    'The first real exception is honey, and it does not hide: "honey roasted," "with honey," "honey nut" - it is a selling point, printed on the front of the jar. Honey is an animal product, so these varieties are out for vegans. The naming is reliable enough that this is the easiest check in this whole article, but it is also the most common way a vegan buys a non-vegan peanut butter, because the jar looks identical at a glance.',
    'The second exception is rarer but sneakier: omega-3 enriched peanut butters. Some brands have boosted omega-3 content using fish oil - anchovy and sardine oil appeared in mainstream US "omega-3" peanut butter lines - while others achieve it with flaxseed, which is vegan. The word "omega-3" on the label is therefore a prompt to read the ingredient list, not a verdict either way. Fish oil is always named in the ingredients.',
    'Then the familiar small print. Added sugar in US jars carries the bone-char question - some US cane sugar is filtered through animal bone char, it never appears on the label, and it is unknowable jar by jar; European sugar refining essentially does not use it. Palm oil is vegan but avoided by many for environmental reasons, and "natural" peanut butters that list only peanuts and salt sidestep both issues at once. Cross-contact lines ("may contain milk") appear on some jars because factories share equipment with chocolate spreads - a trace statement, not an ingredient.',
    'Powdered peanut butter (peanut flour) is normally just defatted peanuts, sometimes with sugar and salt - vegan, same sugar caveat. Flavoured lines are where to slow down: chocolate peanut butter can use milk chocolate, cookie or pretzel blends can bring dairy, and protein-boosted versions can use whey. The plain jar is a safe default; the novelty jar deserves ten seconds with the label or the barcode scanner.',
  ],
  whatToLookFor: {
    good: [
      'Jars listing only peanuts, or peanuts and salt - the "natural" style',
      'Standard smooth or crunchy from major brands - plain varieties are vegan by ingredients',
      'Omega-3 versions enriched with flaxseed rather than fish oil',
      'Powdered peanut butter with peanuts, sugar and salt only',
    ],
    avoid: [
      'Anything with "honey" on the front - honey roasted, honey nut, with honey',
      'Omega-3 blends listing fish oil, anchovy or sardine oil',
      'Chocolate, cookie and dessert-flavoured blends until you have read the label - milk chocolate and whey turn up',
      'Protein-boosted versions using whey protein rather than pea or soy',
    ],
  },
  faq: [
    {
      question: 'Is Skippy or Jif peanut butter vegan?',
      answer: 'The plain creamy and crunchy varieties of both list peanuts, sugar, palm oil and salt - no animal ingredients, so they are vegan by recipe. Both brands also sell honey varieties, which are not. For strict vegans in the US, the added sugar carries the usual bone-char uncertainty since refiners are not named on labels.',
    },
    {
      question: 'Does peanut butter ever contain dairy?',
      answer: 'Plain peanut butter does not. Dairy appears in flavoured lines - chocolate blends made with milk chocolate, cookie-flavoured spreads, and some protein versions using whey. Some plain jars carry a "may contain milk" cross-contact note from shared factory lines, which is a trace statement rather than an ingredient.',
    },
    {
      question: 'Why do some peanut butters contain fish oil?',
      answer: 'A few brands used fish oil (typically anchovy and sardine) to market omega-3 enriched peanut butter, mostly in the US. It is always declared in the ingredient list. Other brands achieve the same omega-3 claim with flaxseed, which is vegan - so the front-of-jar claim tells you to check, and the ingredient list gives the answer.',
    },
    {
      question: 'Is the palm oil in peanut butter a problem?',
      answer: 'Palm oil is plant-derived, so it is vegan. Many vegans avoid it anyway over deforestation and habitat loss, which is a values decision rather than an ingredients one. If you want to skip it, "natural" peanut butters that list only peanuts and salt separate at room temperature but avoid palm oil entirely.',
    },
  ],
  relatedTools: ['barcode', 'ingredient-scanner'],
  relatedTopics: ['honey', 'sugar', 'palm-oil'],
  sources: [
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-08-23',
}
