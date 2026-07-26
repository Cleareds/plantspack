import type { IngredientArticle } from '../types'

export const frenchFriesArticle: IngredientArticle = {
  slug: 'french-fries',
  title: 'Are french fries vegan?',
  metaTitle: 'Are french fries vegan? The beef fat problem, country by country | Plants Pack',
  metaDescription: 'Potatoes and oil are vegan, but plenty of fries are not. Beef tallow, beef flavouring, shared fryers and milk-derived coatings all show up. Here is what to check and where it goes wrong.',
  category: 'ingredient',
  searchQueries: [
    'are french fries vegan',
    'are mcdonalds fries vegan',
    'are chips vegan',
    'do fries have beef fat',
    'are belgian fries vegan',
    'are fries fried in animal fat',
  ],
  verdict: 'depends',
  verdictHeadline: 'Often, but not reliably. The potato is vegan; the fat, the flavouring and the fryer might not be.',
  tldr: 'Plain fries in clean vegetable oil are vegan. Three things break that: frying in beef tallow (still standard in traditional Belgian and some British shops), added beef or dairy flavouring (McDonald\'s in the US), and shared fryers used for meat and fish. It varies by country and by branch of the same chain, so this is a question you have to ask locally rather than answer once.',
  fullAnswer: [
    'Fries are the single most common thing vegans eat by accident. The ingredient list is disarmingly short - potato, oil, salt - and that is exactly why people stop checking. The animal products in fries are usually not in the potato. They are in the fat it was cooked in, in a flavouring added before freezing, or in whatever else went through the same oil.',
    'Beef tallow is the biggest one. Traditional Belgian friture and frituur shops fry in ossewit or blanc de boeuf, which is beef fat, and many consider it essential to the result. Plenty of British chip shops use beef dripping for the same reason. Neither is required to advertise it prominently, and in both countries it is common enough that "are these fried in vegetable oil?" is a normal question to ask rather than a fussy one. Some shops keep a separate vegetarian fryer; many do not.',
    'Added flavouring is the sneakier one. McDonald\'s fries in the United States contain "natural beef flavor," which the company itself documents as containing hydrolysed wheat and hydrolysed milk derivatives - so those fries are neither vegan nor vegetarian, despite being cooked in vegetable oil. In the UK and much of the EU, McDonald\'s fries have a different specification and the company has listed them as suitable for vegans. Same chain, same product name, different answer depending on which country you are standing in. This pattern repeats across international chains and is worth assuming rather than hoping about.',
    'Then there is the shared fryer. A place can use pure sunflower oil and still cook your fries in the same bath as breaded fish, chicken nuggets and mozzarella sticks. Whether that matters is a personal line - it is cross-contamination rather than an ingredient - but it is the most common reason a restaurant will tell you their fries are "not really vegan" when the ingredients look fine. If you are avoiding it, the question to ask is about the fryer, not the recipe.',
    'Finally, coatings. Frozen fries are often par-fried and dusted before freezing, and some coatings for extra crispness use dextrose, dairy derivatives, or beef flavour. Curly fries, seasoned fries and anything described as "battered" carry more risk than plain cut fries, because the seasoning blend is where animal-derived ingredients hide. If the packet is in front of you, the ingredient list settles it in seconds - that is exactly what the ingredient scanner is for.',
  ],
  whatToLookFor: {
    good: [
      'Plain cut fries fried in sunflower, rapeseed, peanut or palm oil',
      'Shops that advertise a dedicated vegetarian or vegan fryer',
      'Oven chips with an ingredient list showing only potato, oil and salt',
      'Chains that publish a full allergen and suitability chart per country',
    ],
    avoid: [
      'Beef tallow, beef dripping, ossewit, blanc de boeuf, lard, "animal fat"',
      '"Natural beef flavor" - contains milk derivatives in the US McDonald\'s spec',
      'Shared fryers also used for fish, chicken or cheese, if cross-contamination matters to you',
      'Seasoned, battered or curly fries without a checked ingredient list',
      'Assuming one country\'s answer applies to the same chain elsewhere',
    ],
  },
  faq: [
    {
      question: 'Are McDonald\'s fries vegan?',
      answer: 'It depends entirely on the country. In the United States they contain "natural beef flavor" which McDonald\'s documents as including hydrolysed milk derivatives, so they are not vegan or even vegetarian. In the UK and various EU markets the recipe differs and McDonald\'s has listed them as suitable for vegans. Check the allergen information for the specific country you are in - the brand name tells you nothing on its own.',
    },
    {
      question: 'Why would a chip shop fry in beef fat?',
      answer: 'Flavour and tradition. Beef dripping and Belgian blanc de boeuf have a higher smoke point than some vegetable oils and produce a taste and texture many customers specifically prefer. In Belgium it is close to a cultural default at traditional friture shops. It is not done to trick anyone, which is also why staff will normally answer honestly if you just ask what the fryer uses.',
    },
    {
      question: 'Do I need to worry about shared fryers?',
      answer: 'That is a personal call. No animal ingredient is in your food by recipe, but traces from breaded fish or chicken will be in the oil. Some vegans avoid it strictly, others accept it as unavoidable when eating out. If it matters to you, ask specifically about the fryer rather than the ingredients - a place can answer "our fries are vegan" truthfully and still share the oil.',
    },
    {
      question: 'Are frozen supermarket fries usually vegan?',
      answer: 'Most plain frozen fries are, but the coatings on premium or "extra crispy" ranges are where dairy and beef derivatives turn up, and some use dextrose from questionable sources. The ingredient list is definitive and takes a moment - scan the packet rather than generalising from the brand.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode', 'menu-scanner'],
  relatedTopics: ['palm-oil', 'e-codes', 'bread'],
  sources: [
    { title: 'McDonald\'s USA - Fries ingredient listing', url: 'https://www.mcdonalds.com/us/en-us/product/french-fries-medium.html' },
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-07-26',
}
