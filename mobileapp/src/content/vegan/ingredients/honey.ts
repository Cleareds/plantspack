import type { IngredientArticle } from '../types'

export const honeyArticle: IngredientArticle = {
  slug: 'honey',
  title: 'Is honey vegan?',
  metaTitle: 'Is honey vegan? Why most vegans say no, and what to use instead | PlantsPack',
  metaDescription: 'Honey is produced by bees, who are animals — so the mainstream vegan position is that honey is not vegan. Here is the reasoning, the dissenting view, and the best alternatives.',
  category: 'ingredient',
  searchQueries: [
    'is honey vegan',
    'why is honey not vegan',
    'vegan honey substitute',
    'is honey ethical',
    'beegan',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'No, by the mainstream vegan definition. Honey is produced by bees, who are animals.',
  tldr: 'The Vegan Society definition excludes "all forms of exploitation of, and cruelty to, animals," and bees count as animals. Honey production involves harvesting what bees made for their own colony. There is a minority "beegan" position that local, small-scale beekeeping is acceptable, but it is not the mainstream view.',
  fullAnswer: [
    'Honey is produced by honeybees, who collect flower nectar, transform it through their bodies, and store it in honeycombs as the colony\'s winter food. Beekeepers harvest this food and replace it with sugar syrup. Most vegans consider this a form of animal exploitation - the bees made the honey for themselves, not for us - which puts honey outside the vegan definition.',
    'The Vegan Society, which coined the word "vegan" in 1944, has always excluded honey. Their definition is "a way of living which seeks to exclude, as far as is possible and practicable, all forms of exploitation of, and cruelty to, animals for food, clothing or any other purpose." Honey production involves both: bees are managed, queens are sometimes wing-clipped or replaced, and commercial pollination operations transport hives in ways that stress and kill bees.',
    'There is a minority position, sometimes called "beeganism," that small-scale local beekeeping where bees keep most of their honey and are not commercially exploited may be acceptable. Proponents argue that managed honeybee colonies are doing the same thing wild bees do, and that supporting beekeepers supports pollinator populations. This view is not widely shared in the vegan movement and most vegan certifications (Vegan Society, V-Label, Certified Vegan) exclude honey regardless of source.',
    'The bigger picture worth knowing: commercial beekeeping is concerning even from a non-vegan angle. Honeybees are not native to most of the world (they were brought from Europe to the Americas) and dense managed colonies can outcompete and spread disease to native wild pollinators - the bumblebees, mason bees, and solitary bees that do more pollination work in the wild. "Saving the bees" by buying honey is mostly a myth: it props up one introduced species while wild pollinators decline.',
    'Practically: there are many excellent vegan honey alternatives. Maple syrup is the closest 1:1 swap for cooking and topping. Agave nectar matches honey\'s sweetness and thinness. Date syrup is richer and works in baking. Brown rice syrup is less sweet and more neutral. Several commercial "vegan honeys" exist (Bee Free Honee, Plant Based Artisan) that mimic the flavour and viscosity for tea or recipes that genuinely need that specific texture.',
  ],
  whatToLookFor: {
    good: [
      'Maple syrup (real, not pancake syrup which is often artificial)',
      'Agave nectar (light or dark)',
      'Date syrup or date paste',
      'Brown rice syrup',
      'Coconut nectar',
      'Commercial vegan honey alternatives (Bee Free Honee, Plant Based Artisan)',
    ],
    avoid: [
      'Honey of any kind, including "local," "raw," and "manuka"',
      'Royal jelly, propolis, bee pollen, bee bread',
      'Beeswax in food (E901) - common shiny coating on sweets, apples, supplements',
      'Mead (honey wine)',
    ],
  },
  faq: [
    {
      question: 'Is local honey from a small beekeeper vegan?',
      answer: 'Not by the mainstream Vegan Society definition. Local beekeeping is generally less harmful than industrial pollination operations, but it still involves taking food bees produced for themselves. Some people call themselves "beegans" if they include local honey while otherwise being vegan, but that is a personal label, not a recognised category.',
    },
    {
      question: 'Do bees die when honey is harvested?',
      answer: 'Some always do - bees get crushed during hive inspection and honey collection. Commercial operations also routinely cull "drones" (male bees) and aging queens. Even small-scale beekeeping replaces the honey bees made with sugar water, which is nutritionally worse for the colony.',
    },
    {
      question: 'But aren\'t bees just insects? Do they matter ethically?',
      answer: 'This is a genuine open question in animal ethics. Recent research suggests bees have more complex cognition than previously thought (they can count, recognise faces, and learn from each other). Most vegans extend their ethical concern to insects on the principle of "when in doubt, default to not exploiting." If you find that bar too high, you might still use honey - but that is then not technically vegan.',
    },
    {
      question: 'What about beeswax in candles and lipstick?',
      answer: 'Same issue - beeswax is a bee product. Vegan candles use soy wax, coconut wax, or rapeseed wax. Vegan lip balms use candelilla wax, carnauba wax, or shea butter. Most major brands now offer both versions; check the label.',
    },
    {
      question: 'Is "vegan" labelled honey real?',
      answer: 'Yes. Several brands make plant-based honey alternatives from apples (Bee Free Honee), cane sugar with floral flavouring (MeliBio), or other plant sources. They look and pour like honey and work in tea or baking, though they\'re pricier than maple or agave.',
    },
  ],
  relatedTools: ['baking', 'substitutes', 'ingredient-scanner'],
  relatedTopics: ['sugar', 'wine'],
  sources: [
    { title: 'The Vegan Society: definition and FAQ on honey', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
    { title: 'PETA: Why honey is not vegan', url: 'https://www.peta.org/living/food/honey-not-vegan-bees/' },
  ],
  updatedAt: '2026-05-22',
}
