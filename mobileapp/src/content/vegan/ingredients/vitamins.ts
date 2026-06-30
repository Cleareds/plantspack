import type { IngredientArticle } from '../types'

export const vitaminsArticle: IngredientArticle = {
  slug: 'vitamins',
  title: 'Are vitamins vegan? B12, D3, omega-3 and the hidden ones',
  metaTitle: 'Are vitamins vegan? B12, D3, omega-3 and what to look for | PlantsPack',
  metaDescription: 'Most vitamins themselves are synthesised, but capsules and certain forms (D3 from lanolin, omega-3 from fish, gelatin shells) often are not vegan. A practical buyer\'s guide.',
  category: 'lifestyle',
  searchQueries: [
    'are vitamins vegan',
    'is vitamin d3 vegan',
    'vegan b12',
    'vegan omega 3',
    'vegan multivitamin',
    'gelatin capsules',
  ],
  verdict: 'sometimes',
  verdictHeadline: 'The molecules themselves are usually fine — the capsule shells, the D3 source, and the omega-3 source are where most vitamins fail.',
  tldr: 'Most B vitamins, vitamin C, and vitamin E in supplements are synthesised and vegan. Vitamin D3 is often from sheep wool (lanolin) - look for "D3 from lichen" or "vegan D3" instead. Omega-3 EPA/DHA is usually from fish - look for algae-based. Capsule shells are gelatin (not vegan) or vegetable cellulose (vegan). Read carefully.',
  fullAnswer: [
    'Vitamins are tricky because the product has multiple animal-product surfaces: the active molecule, the carrier oil or excipient, the capsule shell, and sometimes added gelatin for stability. A "vitamin D" bottle on the shelf could be vegan, or could have three non-vegan elements bundled together.',
    'The active molecule is usually fine. B vitamins, vitamin C, vitamin E, vitamin K1, and most B-complex ingredients are synthesised in factories from plant or microbial sources. Even when an animal-derived precursor exists (like some forms of lanosterol), most commercial vitamin manufacturers use plant or fermentation sources because they are cheaper at scale.',
    'The exceptions are **vitamin D3 (cholecalciferol)** and **omega-3 EPA/DHA**. Vitamin D3 is traditionally extracted from sheep wool (lanolin) - so non-vegan. The vegan alternative is D3 from lichen, which is now widely available (look for brands like Garden of Life, Doctor\'s Best vegan D3, Future Kind). Note: vitamin D2 (ergocalciferol) is always plant-derived but absorbs slightly less efficiently than D3 - many vegans now use lichen-D3 to get both the efficacy of D3 and the vegan status.',
    'Omega-3 EPA and DHA traditionally come from fish oil or krill oil. The vegan source is microalgae (the same source fish eat to get their omega-3 in the first place). Algal omega-3 products (Testa, Nordic Naturals Algae Omega, Ovega-3) deliver the same EPA/DHA and are increasingly mainstream. Note: flax/chia/walnut omega-3 is ALA, which converts poorly to EPA/DHA in humans - if omega-3 levels matter to you, algal is the better source.',
    '**B12 is the most important vegan vitamin to get right** because plant foods do not reliably contain it. The good news: pharmaceutical B12 (both cyanocobalamin and methylcobalamin) is grown by bacteria in fermentation tanks and is almost always vegan. The bad news: many B12 supplements come in **gelatin capsules**, which are not vegan. Look for tablets, vegetable-cellulose capsules ("vegetable capsules" or "HPMC"), or sublingual drops. The Vegan Society recommends 10 micrograms daily or 2000mcg weekly for adults.',
    'Practical guidance: prefer supplements that explicitly say "vegan," "plant-based," or carry a vegan certification. The cheap unmarked supermarket multivitamin is more likely to have gelatin capsules and lanolin D3. Vegan-targeted brands (Future Kind, VEG 1 from the Vegan Society, Mama\'s Select, Cytoplan) are designed to avoid these issues.',
  ],
  whatToLookFor: {
    good: [
      'B12 as methylcobalamin or cyanocobalamin (almost always vegan)',
      'Vitamin D3 from lichen (explicitly labelled)',
      'Omega-3 from algae (algal oil)',
      'Vegetable cellulose capsules ("vegetable capsule" or "HPMC")',
      'Vegan Society "VEG 1" multivitamin (one of the cleanest options)',
      'Tablets and sublingual sprays (avoid capsule shell entirely)',
    ],
    avoid: [
      'Vitamin D3 without source disclosed (default is lanolin / sheep wool)',
      'Fish oil omega-3, cod liver oil',
      'Gelatin capsules (very common in mainstream brands)',
      'Glucosamine (often shellfish-derived; vegan corn-based versions exist)',
      'Collagen supplements (always animal-derived; "vegan collagen boosters" only support your own collagen production)',
    ],
  },
  faq: [
    {
      question: 'Which B12 form should I take?',
      answer: 'Both cyanocobalamin and methylcobalamin work. Cyanocobalamin is cheaper and shelf-stable; methylcobalamin is the active form some people prefer. The Vegan Society recommends cyanocobalamin because the evidence base is largest. Both are vegan when grown by bacterial fermentation, which is essentially always.',
    },
    {
      question: 'Do I need vitamin D3 specifically, or is D2 fine?',
      answer: 'D3 is preferred — it raises blood levels more efficiently. Until lichen D3 became available, vegans had to use D2 (ergocalciferol, plant-derived) and take slightly more. Now lichen D3 is widely available and is the best option: vegan AND as effective as lanolin D3.',
    },
    {
      question: 'Are children\'s vitamins different?',
      answer: 'Often worse. Most children\'s gummy vitamins use gelatin and animal-derived colours (cochineal/carmine in red gummies). Vegan-specific brands (Mama Bear, SmartyPants, Llama Naturals) make pectin-based gummies that are usually vegan. Read the label.',
    },
    {
      question: 'What about iron and zinc?',
      answer: 'Both iron and zinc themselves are minerals (no animal/vegan question), and most supplements use plant-friendly forms (ferrous bisglycinate, zinc citrate). The non-vegan risk is the capsule shell or the carrier - same issue as B12.',
    },
    {
      question: 'Should I trust pharmacy multivitamins?',
      answer: 'Read the label every time. Many mainstream pharmacy multivitamins use gelatin capsules and lanolin D3. The cleaner options are usually behind the "vegan multivitamin" section or the Vegan Society VEG 1.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode'],
  relatedTopics: ['honey'],
  sources: [
    { title: 'The Vegan Society: nutrition essentials (B12, D)', url: 'https://www.vegansociety.com/resources/nutrition-and-health' },
    { title: 'Vegan Society VEG 1 multivitamin', url: 'https://www.vegansociety.com/whats-new/news/veg-1-multivitamin' },
  ],
  updatedAt: '2026-05-22',
}
