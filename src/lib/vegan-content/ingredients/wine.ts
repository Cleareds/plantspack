import type { IngredientArticle } from '../types'

export const wineArticle: IngredientArticle = {
  slug: 'wine',
  title: 'Is wine vegan?',
  metaTitle: 'Is wine vegan? Fining agents, brands, and how to tell | PlantsPack',
  metaDescription: 'Wine is grape juice fermented with yeast, but the fining step often uses animal products: isinglass, gelatin, egg whites, or casein. Here is how to find vegan wine.',
  category: 'drink',
  searchQueries: [
    'is wine vegan',
    'vegan wine',
    'is red wine vegan',
    'is white wine vegan',
    'wine fining agents',
    'vegan wine brands',
  ],
  verdict: 'sometimes',
  verdictHeadline: 'Sometimes. The grapes are vegan; the fining step often is not.',
  tldr: 'Wine is grape juice + yeast, both vegan. But to clarify the wine (remove particles), many producers use isinglass (fish bladder), gelatin, egg whites, or casein (milk). These ingredients are not in the final wine but are used in production. Check Barnivore.com for any brand.',
  fullAnswer: [
    'At its core, wine is just fermented grape juice - which is fully vegan. The grapes go into a tank, yeast eats the sugars, you get alcohol and the leftover dead yeast cells settle out.',
    'The problem is the next step: clarification. Young wine looks cloudy because of tiny suspended particles (tannins, proteins, dead yeast). Producers can wait for these to settle naturally over months, or they can add a "fining agent" that grabs the particles and pulls them to the bottom of the tank within days. Faster equals cheaper, so most commercial wine uses fining agents.',
    'Four traditional fining agents are animal-derived: **isinglass** (dried fish swim bladders), **gelatin** (animal collagen), **egg whites** (used in red wines especially), and **casein** (milk protein, common for whites). These agents are filtered out before bottling - the final wine contains essentially none - but their use in production is enough to disqualify the wine from being vegan.',
    'Three vegan-friendly alternatives are widely used: **bentonite clay**, **activated charcoal**, and **pea protein**. Many producers have switched to these in the last 15 years, but adoption varies wildly by country, price tier, and producer tradition. Older French/Italian estates are more likely to still use egg whites; New World producers (Australia, New Zealand, South Africa, parts of California) are more likely vegan.',
    'You usually cannot tell from the label - the EU does not require fining agents to be declared because they are processing aids, not ingredients. The best resource is **Barnivore.com**, a community-maintained database of ~63,000 wines, beers, and spirits with vegan status verified directly with producers. Some wines now carry vegan certifications (Vegan Society, V-Label) which is the fastest way to be sure.',
  ],
  whatToLookFor: {
    good: [
      'Vegan-certified labels (Vegan Society, V-Label, Certified Vegan)',
      'Organic + biodynamic wines (often vegan by default though not always)',
      'New World producers (Australia, NZ, South Africa, Chile)',
      'Wines explicitly marketed as "unfined" or "natural"',
      'Brands marked vegan on Barnivore.com',
    ],
    avoid: [
      'Cheap European reds without certification (often use egg whites)',
      'Sparkling wines without explicit vegan claim',
      'Mass-market table wines from older producers',
    ],
  },
  faq: [
    {
      question: 'Are wine fining agents in the final wine?',
      answer: 'Essentially no - the agents bind to particles and are filtered out before bottling. The objection is to their use in production, not to consuming animal-derived particles. For vegans who avoid animal products on principle, that still disqualifies the wine.',
    },
    {
      question: 'Is red wine more likely to be vegan than white?',
      answer: 'Whites and rosés more often use casein (milk) or isinglass (fish). Reds more often use egg whites. Neither colour is reliably one way or the other - check the specific producer.',
    },
    {
      question: 'Is organic wine vegan?',
      answer: 'Not automatically. Organic rules govern how the grapes were grown, not how the wine was clarified. Many organic wines are still fined with egg whites or isinglass. Look for "vegan" in addition to organic.',
    },
    {
      question: 'What is the fastest way to check?',
      answer: 'Barnivore.com (barnivore.com/wine). Search the producer or specific wine name. Their database is verified directly with manufacturers and updated regularly.',
    },
    {
      question: 'Is champagne vegan?',
      answer: 'Most major champagne houses use isinglass or fining agents that are not vegan. Some smaller producers (and a growing list of major ones) have moved to bentonite. Same rule as still wine: check the producer.',
    },
  ],
  relatedTools: ['ingredient-scanner'],
  relatedTopics: ['sugar', 'honey'],
  sources: [
    { title: 'Barnivore: vegan wine database', url: 'https://www.barnivore.com/wine' },
    { title: 'Decanter: What does "vegan wine" mean?', url: 'https://www.decanter.com/learn/vegan-wine-what-it-is-460527/' },
  ],
  updatedAt: '2026-05-22',
}
