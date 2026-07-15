import type { IngredientArticle } from '../types'

export const palmOilArticle: IngredientArticle = {
  slug: 'palm-oil',
  title: 'Is palm oil vegan?',
  metaTitle: 'Is palm oil vegan? Yes — but the ethics are complicated | Plants Pack',
  metaDescription: 'Palm oil is plant-derived and technically vegan. The harder question is the environmental and animal-welfare impact of palm cultivation. Here is the nuanced answer.',
  category: 'ingredient',
  searchQueries: [
    'is palm oil vegan',
    'palm oil ethical',
    'sustainable palm oil',
    'rspo palm oil',
    'orangutan palm oil',
  ],
  verdict: 'depends',
  verdictHeadline: 'Technically yes — it is plant-derived. Ethically complicated because of deforestation and orangutan/elephant habitat loss.',
  tldr: 'Palm oil is extracted from oil palm fruit and is fully plant-derived, so it qualifies as vegan by the strict definition. However, palm cultivation has driven major deforestation in Indonesia and Malaysia, killing wild orangutans, elephants, and tigers. Many vegans avoid it for the same animal-welfare reasons they avoid animal products. Certified sustainable palm oil (RSPO) is a partial answer.',
  fullAnswer: [
    'Palm oil comes from the fruit of oil palms (Elaeis guineensis), originally native to West Africa and now cultivated mostly in Indonesia and Malaysia. The fruit is steamed, pressed, and the oil refined. No animal product is involved at any step - so by the standard "no animal ingredients or processing aids" vegan definition, palm oil is vegan.',
    'The complication is that palm cultivation is the largest driver of tropical deforestation in Southeast Asia. Indonesia has lost roughly 25% of its primary forest since 1990, much of it to palm plantations. The animals living in those forests - orangutans (now critically endangered), Sumatran elephants, tigers, sun bears, gibbons - lose their habitat. Roughly 100,000 orangutans died between 1999 and 2015 due to habitat loss and conflict with plantation workers.',
    'For many vegans, this matters as much as eating animal products: the principle is "avoid contributing to animal harm" and palm oil is causally linked to a lot of animal harm. The Vegan Society and Animal Aid both discuss palm oil as an ethical concern even though it does not technically violate the vegan definition.',
    'The counter-arguments are worth knowing too. **First**, palm is the most efficient oil crop by far - it produces 4-10x more oil per hectare than soy, sunflower, or rapeseed. Boycotting palm and switching to another oil would require even more land cleared, just somewhere else. **Second**, palm is a livelihood for millions of smallholder farmers in Indonesia and Malaysia; a full boycott has real costs for vulnerable communities. **Third**, certified sustainable palm oil (RSPO - Roundtable on Sustainable Palm Oil) requires no deforestation, no peatland clearing, and respect for local rights. RSPO is imperfect (audits are mixed) but it is real progress.',
    'Practical approach for most vegans:',
    '- **Strict vegan + environmental**: avoid palm oil entirely. Look for "palm oil free" labels (Ecover, some Lush products, some baked goods). Make peanut butter, chocolate, and cookies from scratch or seek out brands using sunflower/coconut/rapeseed.',
    '- **Pragmatic**: prefer RSPO-certified palm where you cannot avoid it. Most major brands (Nestlé, Unilever, Mars, Mondelez) now use mostly RSPO-certified palm. Look for the RSPO logo.',
    '- **Aware but accepting**: continue using palm products but advocate for RSPO and supply-chain transparency. This is what most consumer-facing campaigns push.',
  ],
  whatToLookFor: {
    good: [
      'RSPO-certified palm oil (Roundtable on Sustainable Palm Oil logo)',
      'Palm oil free brands (Ecover for cleaning; check chocolate, peanut butter, bread)',
      'Products from companies with public no-deforestation commitments (Unilever, Nestlé, Ferrero now publish supplier lists)',
    ],
    avoid: [
      'Generic palm oil from brands without sustainability commitments',
      'Products listing "vegetable oil" or "vegetable fat" without specifying - often unsustainable palm',
      'Palmitic acid, sodium palm kernelate, palm stearin - these are palm derivatives in cosmetics and detergents',
    ],
  },
  faq: [
    {
      question: 'Is RSPO actually meaningful?',
      answer: 'Partially. RSPO certification requires no deforestation of high-conservation-value forest, no peatland clearing, fair labour, and respect for indigenous rights. Audits have been criticised for weak enforcement. RSPO is better than nothing - it has actually reduced deforestation on certified plantations by ~30% according to peer-reviewed studies - but it does not solve the issue entirely.',
    },
    {
      question: 'What about coconut oil instead?',
      answer: 'Coconut oil has its own problems (lower yield per hectare, monoculture issues in the Philippines and Indonesia) but is generally considered less destructive than palm. It is also more expensive and has a stronger flavour. Olive, sunflower, or rapeseed are usually better swaps for cooking.',
    },
    {
      question: 'What are all the names for palm oil?',
      answer: 'Palm oil hides under many names: vegetable oil (sometimes), palm kernel oil, sodium palmate, sodium palm kernelate, palm stearate, palmitic acid, glyceryl stearate, palmitoyl-anything (in cosmetics). If you want to avoid it, check the ingredient list carefully.',
    },
    {
      question: 'Why don\'t we just boycott it?',
      answer: 'Major NGOs (Greenpeace, WWF, Friends of the Earth) deliberately do not call for a full palm boycott because alternatives would require even more land. They focus on supply-chain reform and RSPO certification instead. Personal boycott is a valid individual choice but unlikely to shift the industry on its own.',
    },
    {
      question: 'Is palm oil bad for health too?',
      answer: 'Palm oil is high in saturated fat (~50%) which raises LDL cholesterol. From a health perspective, olive, rapeseed, and sunflower oils are better. From a vegan perspective, the health angle is mostly a side issue - the environmental concern is bigger.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode'],
  relatedTopics: ['sugar', 'honey'],
  sources: [
    { title: 'WWF: 8 things to know about palm oil', url: 'https://www.wwf.org.uk/updates/8-things-know-about-palm-oil' },
    { title: 'RSPO: Roundtable on Sustainable Palm Oil', url: 'https://rspo.org/' },
  ],
  updatedAt: '2026-05-22',
}
