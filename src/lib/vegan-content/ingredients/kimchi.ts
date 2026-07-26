import type { IngredientArticle } from '../types'

export const kimchiArticle: IngredientArticle = {
  slug: 'kimchi',
  title: 'Is kimchi vegan?',
  metaTitle: 'Is kimchi vegan? Fish sauce, shrimp paste and how to find a vegan jar | Plants Pack',
  metaDescription: 'Traditional kimchi is fermented with jeotgal - salted seafood, usually anchovy or shrimp. Vegan kimchi exists and is common in Korea as temple food. Here is what to check.',
  category: 'ingredient',
  searchQueries: [
    'is kimchi vegan',
    'does kimchi have fish sauce',
    'vegan kimchi brands',
    'is kimchi vegetarian',
    'is shop bought kimchi vegan',
  ],
  verdict: 'sometimes',
  verdictHeadline: 'Often not. Traditional kimchi is fermented with salted seafood, but vegan kimchi is a real and widely available tradition.',
  tldr: 'Most traditional and commercial kimchi contains jeotgal - salted fermented seafood, usually anchovy sauce or saeujeot (shrimp paste). That makes it neither vegan nor vegetarian. Vegan kimchi is not a modern invention though: Korean Buddhist temple cuisine has made it for centuries without seafood, and plenty of brands now sell it. Read the jar; the answer varies per product, not per cuisine.',
  fullAnswer: [
    'Kimchi is genuinely ambiguous rather than usually-one-thing, which makes it different from most items on this list. The vegetables, chilli, garlic, ginger and salt are all vegan. What is usually added alongside them is jeotgal, a category of salted fermented seafood, most often myeolchijeot (anchovy sauce) or saeujeot (fermented shrimp paste). These supply glutamates and speed the fermentation, and in a traditional recipe they are considered essential to a proper depth of flavour.',
    'So the honest position is that most kimchi you encounter - in a Korean restaurant, in a supermarket jar, as a banchan you did not order - probably contains seafood, and you cannot tell by looking. Fish sauce leaves no visual trace. Shrimp paste occasionally does, but not reliably. This is the case where asking or checking genuinely is the only route.',
    'The encouraging part is that vegan kimchi has deep roots. Korean Buddhist temple cuisine excludes all animal products, and temple kimchi has been made without jeotgal for centuries, typically using a fermented soybean element, extra salt, or seaweed-based broth to build savouriness. This is not a compromise version invented for Western vegans; it is an established parallel tradition. If you are in Korea, asking for temple-style kimchi is a meaningful and understood request.',
    'Commercially, the situation has improved fast. A growing number of brands sell explicitly vegan kimchi, and because fish and crustaceans are declarable allergens in the UK and EU, the label check is quick and dependable there - anchovy and shrimp must be declared and are normally bolded. Some products are incidentally vegan without saying so, using only vegetables, chilli and salt. Others say "vegetarian," which for this product usually does mean no seafood, but confirm rather than assume.',
    'Making it is very doable and gives you full control. Napa cabbage, coarse salt for the brine, gochugaru (Korean chilli flakes - check it has no additives), garlic, ginger, spring onion, Korean radish, and a savoury element such as a little white miso, soy sauce, or a kombu-based stock in place of the fish sauce. Some recipes add a spoonful of rice flour porridge to feed the fermentation. It keeps for months and improves for the first few weeks.',
  ],
  whatToLookFor: {
    good: [
      'Jars explicitly labelled vegan',
      'Temple-style or Buddhist kimchi (jeol kimchi)',
      'Ingredient lists of only vegetables, chilli, garlic, ginger and salt',
      'Miso, soy sauce, kombu or seaweed used as the savoury element',
    ],
    avoid: [
      'Fish sauce, anchovy, myeolchijeot, saeujeot, shrimp paste, "seafood"',
      'Oyster sauce, which appears in some regional recipes',
      'Restaurant kimchi served as a default side, unless you have asked',
      'Assuming kimchi is vegan because it is a vegetable dish',
    ],
  },
  faq: [
    {
      question: 'Does all kimchi contain fish sauce?',
      answer: 'No, but most commercial and traditional kimchi does. Anchovy sauce or fermented shrimp paste is standard in the common recipes. Vegan versions are a genuine and long-standing alternative rather than a substitute - Korean Buddhist temple cooking has always made kimchi without seafood.',
    },
    {
      question: 'Is kimchi in a Korean restaurant vegan?',
      answer: 'Assume not unless you have asked. Kimchi usually arrives automatically as banchan, made in-house or bought in to a traditional recipe with jeotgal. Because it is a side you did not order, it is easy to eat without thinking about it. Ask specifically about fish sauce and shrimp paste, since "is it vegetarian?" sometimes gets a yes when fish sauce is present.',
    },
    {
      question: 'What does the fish sauce actually do?',
      answer: 'It supplies glutamates for savoury depth and provides salt and enzymes that help fermentation get going. Vegan recipes replace it with a combination of extra salt, fermented soybean products such as miso or soy sauce, and sometimes kombu, which supply umami from plant and seaweed sources instead.',
    },
    {
      question: 'Is gochujang vegan?',
      answer: 'Usually yes - gochujang is fermented chilli paste made from chilli powder, glutinous rice, fermented soybeans and salt. Some brands add other flavourings, so it is still worth a label check, but it is far less likely to contain seafood than kimchi itself.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'barcode', 'menu-scanner', 'cards'],
  relatedTopics: ['worcestershire-sauce', 'e-codes', 'vegan-vs-vegetarian'],
  sources: [
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
    { title: 'UK Food Standards Agency - Allergen labelling rules', url: 'https://www.food.gov.uk/business-guidance/allergen-labelling-for-food-manufacturers' },
  ],
  updatedAt: '2026-07-26',
}
