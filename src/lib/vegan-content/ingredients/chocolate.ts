import type { IngredientArticle } from '../types'

export const chocolateArticle: IngredientArticle = {
  slug: 'chocolate',
  title: 'Is chocolate vegan?',
  metaTitle: 'Is chocolate vegan? Dark, milk, and white chocolate explained | PlantsPack',
  metaDescription: 'Plain dark chocolate is usually vegan, milk and white chocolate are not. Here is how to read the label, the hidden non-vegan ingredients, and the brands that are reliably vegan.',
  category: 'ingredient',
  searchQueries: [
    'is dark chocolate vegan',
    'is milk chocolate vegan',
    'is white chocolate vegan',
    'vegan chocolate brands',
    'what does vegan chocolate taste like',
    'is lindt vegan',
  ],
  verdict: 'depends',
  verdictHeadline: 'Dark chocolate often yes, milk chocolate no, white chocolate no - unless explicitly labelled vegan.',
  tldr: 'Plain dark chocolate (cocoa mass, sugar, cocoa butter, soy lecithin) is vegan. Milk chocolate and standard white chocolate contain dairy and are not. Read the allergen line carefully - many dark bars carry a "may contain milk" warning from shared equipment, which is a tolerance call rather than a strict rule. For zero ambiguity, buy bars explicitly labelled vegan.',
  fullAnswer: [
    'Plain dark chocolate is the simplest case. The standard ingredient list is cocoa mass (also called cocoa liquor or cacao), sugar, cocoa butter, and an emulsifier - usually soy lecithin or sunflower lecithin. All four are plant-based, so dark chocolate at around 70% cocoa and above is normally vegan. The thing to watch for is the allergen line: many dark bars are made on equipment that also runs milk chocolate, and the label will say "may contain milk" or "produced in a factory that handles milk." This is legal cross-contamination, not an ingredient - strict vegans tend to accept it, allergy-sensitive vegans avoid it, and it is a personal call.',
    'Milk chocolate is essentially never vegan unless the bar explicitly says so. Standard milk chocolate is 20-30% milk solids (milk powder, whole milk powder, or skimmed milk powder) blended into the cocoa base. That dairy is what gives it the pale brown colour and creamy mouthfeel. A handful of brands now make vegan milk chocolate using oat milk, rice milk, almond milk, or hazelnut paste in place of dairy - these are clearly labelled "vegan" or "plant-based" on the front, and they have become much easier to find in 2024-2026.',
    'White chocolate is the trickiest. It contains no cocoa solids at all, only cocoa butter, sugar, and milk solids - so by default white chocolate is dairy and not vegan. The cocoa butter itself is plant-based (it is the pressed fat from the cacao bean), so a vegan version is technically just cocoa butter + sugar + plant milk powder + vanilla. Several brands now make this (iChoc, Vego, Nomo, Moo Free), but a bar that just says "white chocolate" without a vegan label will contain dairy. Always check.',
    'Hidden non-vegan ingredients to scan for, beyond the obvious "milk" word: milk fat, milk solids, lactose, whey, whey powder, butter oil, anhydrous milk fat, casein, and skim milk powder are all dairy. E120 (carmine, cochineal) is a red colour made from crushed insects and turns up in some red, pink, or coloured chocolate coatings and pralines. E904 (shellac) is a resin secreted by lac beetles, used as a glaze on some chocolate-coated sweets and pearls. Honey shows up in some artisan and "raw" chocolate bars. Some filled chocolates use gelatine in the filling. None of these have to be on a vegan bar, but they appear often enough on standard chocolate that the ingredient list is worth a real read.',
    'Reliably vegan chocolate is easy to find. Certified vegan brands that are widely stocked in Europe and increasingly in the US: Tony\'s Chocolonely (most dark bars, plus their dedicated vegan milk range), Booja-Booja (truffles, all vegan), Ombar (raw chocolate, all vegan), Loving Earth (all vegan), Vego (hazelnut bars, all vegan), iChoc (oat-milk chocolate, all vegan), Nomo (full vegan range including white and caramel), Moo Free (allergen-friendly, all vegan), and Endangered Species in the explicitly labelled "vegan" varieties. Most supermarket own-brand dark chocolate at 70%+ is also vegan in ingredients, though it usually carries the "may contain milk" warning. Lindt Excellence dark bars at 70% and above are vegan in ingredients but again carry the cross-contamination warning.',
    'The bigger ethical conversation, which a lot of vegans care about more than the dairy question: cocoa has a serious child labour and forced labour problem. Roughly two-thirds of the world\'s cocoa comes from Côte d\'Ivoire and Ghana, where investigations by the US Department of Labor, the Washington Post, and the Fair Labor Association have repeatedly documented children working on cocoa farms - often unpaid, often in hazardous conditions. Fairtrade, Rainforest Alliance, and direct-trade certifications are imperfect but meaningfully better than uncertified mass-market chocolate. Palm oil is a separate concern (deforestation, orangutan habitat loss) and turns up in cheaper chocolate fillings and spreads. A bar can be vegan and still be ethically loaded - the Tony\'s Chocolonely model of explicitly traceable, slavery-free cocoa is worth supporting where you can.',
  ],
  whatToLookFor: {
    good: [
      'Tony\'s Chocolonely (dark range and dedicated vegan milk bars)',
      'Booja-Booja truffles (entirely vegan brand)',
      'Ombar raw chocolate (entirely vegan)',
      'Loving Earth (entirely vegan)',
      'iChoc oat-milk chocolate, Vego hazelnut bars, Nomo, Moo Free',
      'Endangered Species in the explicitly labelled "vegan" varieties',
      'Most supermarket own-brand 70%+ dark chocolate (check the allergen line if cross-contamination matters to you)',
    ],
    avoid: [
      'Milk fat, milk solids, milk powder, whole or skimmed milk powder',
      'Lactose, whey, whey powder, casein',
      'Butter oil, anhydrous milk fat',
      'E120 (carmine) in red or pink chocolate coatings',
      'E904 (shellac) glaze on chocolate-coated sweets',
      'Honey in artisan or raw chocolate bars',
      'Gelatine in filled chocolates and pralines',
    ],
  },
  faq: [
    {
      question: 'Is 70% dark chocolate vegan?',
      answer: 'Usually yes in ingredients. The standard recipe at 70% is cocoa mass, sugar, cocoa butter, and lecithin - all plant-based. The catch is the allergen line: most 70% bars are made on equipment that also runs milk chocolate, so they carry a "may contain milk" warning. That is cross-contamination, not an ingredient. Strict vegans generally accept it; if it bothers you, buy a bar made in a dedicated dairy-free facility (Moo Free, Nomo, iChoc, Vego).',
    },
    {
      question: 'What does "may contain milk" actually mean?',
      answer: 'It is a precautionary allergen statement. The recipe does not include dairy, but the bar was made on shared equipment with products that do, and trace amounts could in theory end up in the bar. It is required by law for allergy-safety reasons. Most vegans treat this as fine because no animal product is in the recipe; people with dairy allergies and stricter vegans avoid it.',
    },
    {
      question: 'Is white chocolate ever vegan?',
      answer: 'Yes, but you have to buy a bar explicitly labelled vegan. Standard white chocolate is cocoa butter, sugar, and milk solids - the dairy is what makes it white. Vegan white chocolate swaps in rice, oat, or almond milk powder. Brands that make it: Nomo, iChoc, Vego (white bar), Moo Free. A bar that just says "white chocolate" with no vegan label contains dairy.',
    },
    {
      question: 'Is cocoa butter vegan?',
      answer: 'Yes. This is a common misconception because of the word "butter." Cocoa butter is the natural fat pressed from cacao beans - it has nothing to do with dairy butter. It is entirely plant-based and appears in almost all chocolate (dark, milk, and white) as well as in vegan cosmetics and skincare.',
    },
    {
      question: 'Why does some dark chocolate have milk in it?',
      answer: 'Two reasons. First, smaller chocolatiers often run dark and milk chocolate on the same lines and add a trace of milk powder to dark bars to soften the texture or to label them consistently. Second, cheaper "dark" chocolate in mainstream brands sometimes blends in milk fat to cut the price of cocoa butter. Always check the ingredient list, not just the cocoa percentage.',
    },
    {
      question: 'Is Lindt chocolate vegan?',
      answer: 'Lindt does not currently make any certified vegan chocolate. Their Excellence dark range at 70%, 78%, 85%, 90%, and 99% is vegan in ingredients (cocoa mass, sugar, cocoa butter, vanilla, sometimes lecithin) but every bar carries a "may contain milk" cross-contamination warning. If that warning is acceptable to you, those bars are fine; if you want a dedicated vegan facility, look at Tony\'s, Moo Free, Nomo, or iChoc instead.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode'],
  relatedTopics: ['palm-oil', 'sugar'],
  sources: [
    { title: 'The Vegan Society: is chocolate vegan?', url: 'https://www.vegansociety.com/whats-new/blog/vegan-chocolate' },
    { title: 'US Department of Labor: child labour in cocoa supply chains', url: 'https://www.dol.gov/agencies/ilab/our-work/child-forced-labor-trafficking/child-labor-cocoa' },
    { title: 'Tony\'s Chocolonely: slavery-free cocoa sourcing model', url: 'https://tonyschocolonely.com/uk/en/our-mission' },
  ],
  updatedAt: '2026-05-29',
}
