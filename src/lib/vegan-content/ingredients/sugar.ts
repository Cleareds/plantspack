import type { IngredientArticle } from '../types'

export const sugarArticle: IngredientArticle = {
  slug: 'sugar',
  title: 'Is sugar vegan?',
  metaTitle: 'Is sugar vegan? The bone char question, explained | PlantsPack',
  metaDescription: 'Most sugar is technically plant-derived but some refined cane sugar is filtered through bone char. Here is how to tell, what to look for, and which brands are safe.',
  category: 'ingredient',
  searchQueries: [
    'is sugar vegan',
    'is white sugar vegan',
    'bone char sugar',
    'is brown sugar vegan',
    'vegan sugar brands',
  ],
  verdict: 'sometimes',
  verdictHeadline: 'Yes, but some refined cane sugar in the US is filtered through bone char.',
  tldr: 'Sugar is plant-derived (from cane or beet). The issue is filtration: some US cane sugar refineries use bone char to whiten it. Beet sugar, organic cane sugar, and most non-US cane sugar are vegan.',
  fullAnswer: [
    'Sugar itself is made from plants - either sugar cane or sugar beet. The plant material is harvested, crushed, and the sugar crystallised out. Nothing animal is added.',
    'The complication is the whitening step for refined cane sugar. Raw cane sugar is naturally brown because of trace molasses. To get the bright-white sugar most people picture, some refineries pass it through a filter made from charred cattle bones (called "bone char"). The sugar that comes out the other side has no bone particles in it, but the process involves an animal byproduct - which is why it does not qualify as vegan.',
    'Three things determine whether your sugar was bone-char-filtered: source plant, country, and whether it is organic. Beet sugar is never bone-char-filtered (the chemistry does not need it). Cane sugar produced in the EU, UK, Australia, and most of Asia uses granular activated carbon or ion-exchange resins, both vegan, because bone char is largely a North American tradition. Organic cane sugar in any country bypasses bone char regardless - USDA Organic rules prohibit it.',
    'Brown sugar in the US is usually refined white sugar with molasses added back, so the same bone-char question applies. Powdered sugar is just refined sugar plus cornstarch - same story. The safe-bet brands in the US are Wholesome, Florida Crystals (which uses no bone char anywhere in their process), Trader Joe\'s organic cane sugar, and any product labelled "vegan" or "USDA Organic".',
    'For most people outside the US, you can buy sugar without thinking about it. For people in the US who want to be careful, check the brand\'s website or look for organic, beet sugar, or a vegan label.',
  ],
  whatToLookFor: {
    good: [
      'Beet sugar (any country, any brand)',
      'Organic cane sugar (USDA Organic prohibits bone char)',
      'Sugar with a vegan certification logo',
      'Wholesome, Florida Crystals, Trader Joe\'s organic cane',
      'Sugar produced in EU/UK/Australia (uses non-animal filtration)',
    ],
    avoid: [
      'Generic "refined cane sugar" from US manufacturers without organic certification',
      'Domino, C&H, US Sugar (these have historically used bone char in some facilities - check current sourcing if it matters to you)',
    ],
  },
  faq: [
    {
      question: 'Does bone char get into the sugar itself?',
      answer: 'No - bone char is used as a filter, and the sugar molecules pass through it without picking up bone material. The objection is to the use of the animal byproduct in the process, not contamination of the final product.',
    },
    {
      question: 'Is brown sugar vegan?',
      answer: 'It depends on the source. Most commercial brown sugar in the US is refined white sugar with molasses added back, so it inherits the bone-char question. Naturally brown sugars like turbinado, demerara, and muscovado are less processed and rarely involve bone char - but check the brand.',
    },
    {
      question: 'What about powdered sugar / icing sugar?',
      answer: 'It is refined sugar plus cornstarch. Same vegan question as the base sugar - if you started with bone-char-filtered sugar, the powdered version inherits the issue.',
    },
    {
      question: 'Is high-fructose corn syrup vegan?',
      answer: 'Yes. It is made enzymatically from corn starch with no animal-derived steps.',
    },
    {
      question: 'How can I tell what filtration my sugar used?',
      answer: 'Most brands answer this directly on their website or via customer service. Vegan certification logos (Vegan Society, V-Label, Certified Vegan) confirm bone-char-free. Organic certification also rules it out.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'substitutes', 'baking'],
  relatedTopics: ['wine', 'honey'],
  sources: [
    { title: 'PETA: Is sugar vegan?', url: 'https://www.peta.org/living/food/sugar-vegan/' },
    { title: 'USDA Organic standards on processing aids', url: 'https://www.ams.usda.gov/grades-standards/organic-standards' },
  ],
  updatedAt: '2026-05-22',
}
