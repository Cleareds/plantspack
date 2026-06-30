import type { IngredientArticle } from '../types'

export const beerArticle: IngredientArticle = {
  slug: 'beer',
  title: 'Is beer vegan?',
  metaTitle: 'Is beer vegan? Isinglass, gelatin, and the brands to buy | PlantsPack',
  metaDescription: 'Beer is barley + hops + yeast + water — all vegan. But many breweries clarify with isinglass (fish bladder) or gelatin. Here are the safe brands and how to check yours.',
  category: 'drink',
  searchQueries: [
    'is beer vegan',
    'vegan beer',
    'isinglass beer',
    'is guinness vegan',
    'vegan beer brands',
  ],
  verdict: 'sometimes',
  verdictHeadline: 'Sometimes. The ingredients are vegan; the clarifying process often is not.',
  tldr: 'Beer is barley + hops + yeast + water — all vegan. The problem is the optional clarification step. Many cask ales and some bottled beers use isinglass (fish swim bladder) or gelatin to drop yeast out of suspension. Most modern lagers, mass-market beers, and craft beers are vegan; traditional British cask ales are the riskiest. Check Barnivore.com for any specific brand.',
  fullAnswer: [
    'The four traditional beer ingredients - barley (or other grain), hops, water, and yeast - are all vegan. Most beer styles need nothing else. The vegan question comes from optional fining agents that some brewers add to make the beer brighter and clearer.',
    '**Isinglass** is the most common animal-derived finer in beer. It is made from dried fish swim bladders (sturgeon or other species), dissolved in solution, and added to the beer to pull yeast and protein particles to the bottom of the cask. This is especially common in traditional British cask ales - the foamy, hand-pulled pints in old pubs. Most major UK breweries used isinglass for decades, though many have switched to vegan alternatives since the 2010s.',
    '**Gelatin** is sometimes used instead, especially in some American craft brewing. It works the same way as isinglass - protein particles bind to the gelatin and settle out.',
    'Three good news items for vegan beer drinkers:',
    'First, **modern mass-market lagers** (Heineken, Corona, Stella Artois, Budweiser, Coors) skip animal finers and just use centrifuges or longer settling time. These are almost all vegan. **Guinness** famously stopped using isinglass in 2017 and is now fully vegan including the draught version.',
    'Second, **most craft breweries** moved away from animal finers years ago because their core customers cared. If you are buying a craft IPA, stout, or sour from a brewery built post-2010, it is probably vegan - but check Barnivore.com to be sure.',
    'Third, **the label often tells you**. Vegan certifications (Vegan Society, V-Label, Certified Vegan) are increasingly common on beer cans. The UK has a strong "Vegan-friendly" label tradition for craft beer specifically.',
    'The riskiest categories are traditional British cask ales, some Belgian abbey beers (rarely), and a few historical lagers that still use older methods. When in doubt, the same rule as wine applies: check **Barnivore.com**.',
  ],
  whatToLookFor: {
    good: [
      'Modern mass-market lagers (Heineken, Corona, Stella, Budweiser, Coors, Asahi, Sapporo)',
      'Guinness (all variants, vegan since 2017)',
      'Most craft beer post-2010 (BrewDog, Beavertown, Magic Rock, Cloudwater, etc.)',
      'German beer (Reinheitsgebot purity law limits non-traditional ingredients)',
      'Anything carrying a vegan certification logo',
    ],
    avoid: [
      'Traditional British cask ales without explicit vegan claim',
      'Some older UK regional brewers (check Barnivore)',
      'Some honey-based or "milk stout" styles (read the label - some milk stouts use actual lactose)',
    ],
  },
  faq: [
    {
      question: 'Is Guinness vegan?',
      answer: 'Yes. Guinness stopped using isinglass in 2017 and confirmed all of their beers (including draught Guinness, Foreign Extra Stout, and Guinness 0.0) are vegan worldwide. This was a significant moment - Guinness had used isinglass for over 250 years.',
    },
    {
      question: 'Is German beer always vegan?',
      answer: 'Almost always. The German Reinheitsgebot ("purity law") restricts beer to water, malt, hops, and yeast - so finers like isinglass are not used in beer marketed as Reinheitsgebot-compliant. This is most German beer.',
    },
    {
      question: 'Is "milk stout" or "cream ale" vegan?',
      answer: 'Milk stout almost always contains lactose (milk sugar) added for sweetness and body - so it is NOT vegan even if no finers are used. "Cream" in beer names usually refers to texture, not actual cream - but check the brand to confirm.',
    },
    {
      question: 'What about cider?',
      answer: 'Cider can have the same fining issue as beer - some traditional ciders use gelatin or egg-white finers. Most modern mainstream brands (Strongbow, Magners, Bulmers UK) are vegan; check Barnivore for craft cideries.',
    },
    {
      question: 'How can I tell at the pub?',
      answer: 'Most decent pubs with a vegan-aware staff member can tell you which taps are vegan. CAMRA (the UK Campaign for Real Ale) maintains a vegan-friendly cask ale list. Apps like Barnivore (search the brewery name) work fast at the bar.',
    },
  ],
  relatedTools: ['drinks', 'ingredient-scanner', 'barcode'],
  relatedTopics: ['wine', 'sugar'],
  sources: [
    { title: 'Barnivore: vegan beer database', url: 'https://www.barnivore.com/beer' },
    { title: 'Guinness confirms vegan status (2017 statement)', url: 'https://www.guinness.com/en-us/our-craft/our-beers/guinness-faq/' },
  ],
  updatedAt: '2026-05-22',
}
