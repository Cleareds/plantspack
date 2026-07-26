import type { IngredientArticle } from '../types'

export const naanArticle: IngredientArticle = {
  slug: 'naan',
  title: 'Is naan bread vegan?',
  metaTitle: 'Is naan vegan? Yoghurt, ghee and milk in Indian breads | Plants Pack',
  metaDescription: 'Most naan contains yoghurt or milk and is brushed with ghee, so it is usually not vegan. Chapati, roti and most poori are. Here is which Indian bread to order.',
  category: 'ingredient',
  searchQueries: [
    'is naan vegan',
    'does naan have dairy',
    'is naan bread dairy free',
    'vegan indian bread',
    'is roti vegan',
    'is chapati vegan',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'Usually not. Traditional naan is made with yoghurt or milk and brushed with ghee.',
  tldr: 'Naan is enriched bread - yoghurt or milk in the dough gives it the soft, pillowy texture, and it is typically finished with ghee or butter. That makes most naan non-vegan even when nothing on the menu says so. Chapati, roti, phulka and most poori are naturally vegan, which usually makes them the better order.',
  fullAnswer: [
    'The thing that makes naan naan is dairy. Plain flatbreads like chapati are flour, water and salt; naan is an enriched dough, and the enrichment is normally yoghurt, milk, or both. That is what produces the soft, slightly tangy, pillowy crumb rather than a thin dry round. Then, in most kitchens, it comes out of the tandoor and gets brushed with ghee or melted butter. So there are commonly two separate dairy points: one in the dough, one on the surface.',
    'This makes naan a frequent accidental slip, because Indian food has a strong reputation as vegan-friendly and often deserves it. The vegetable curries frequently are vegan or trivially made so. The bread that arrives alongside is the part nobody thinks to question. If you are ordering at a restaurant, naan is the item to ask about rather than the dal.',
    'The rest of the bread basket is much better news. Chapati, roti and phulka are typically just wholewheat flour, water and salt cooked on a dry tava, and are vegan as standard - though some kitchens brush them with ghee too, so it is worth one question. Poori is deep-fried and usually vegan, depending on the frying fat. Paratha varies enormously: plain paratha is often laminated with oil and fine, but many versions use ghee, and stuffed parathas may contain paneer or be served with butter. Kulcha and bhatura are usually enriched like naan and should be treated the same way.',
    'Supermarket naan is a genuinely mixed bag and worth checking rather than guessing. Some ranges use milk powder and butter; others are made with oil and are incidentally vegan without advertising it. A growing number are explicitly labelled vegan. Because the front of the pack rarely tells you and the recipe varies between brands and even between flavours in one range, this is a five-second ingredient-list check rather than something to reason about.',
    'If you want naan specifically rather than a substitute, it is straightforward to make at home: strong white flour, a plant yoghurt (coconut or soy work well and the tang matters), yeast or baking powder, oil, salt. Cook it in the driest, hottest pan you own. Brush it with garlic oil instead of ghee. The texture holds up well, because plant yoghurt does the same job in the dough that dairy yoghurt was doing.',
  ],
  whatToLookFor: {
    good: [
      'Chapati, roti, phulka - usually flour, water and salt',
      'Poori, if you can confirm the frying fat',
      'Supermarket naan explicitly labelled vegan',
      'Homemade naan with plant yoghurt and garlic oil instead of ghee',
    ],
    avoid: [
      'Yoghurt, curd, dahi, milk, milk powder, whey in the ingredient list',
      'Ghee or butter brushed on after cooking - ask, it is often not on the menu',
      'Kulcha, bhatura and most stuffed parathas without checking',
      'Peshwari and other sweet naans, which often contain dairy and sometimes honey',
      'Assuming the bread is vegan because the curry is',
    ],
  },
  faq: [
    {
      question: 'Is roti or chapati vegan?',
      answer: 'Usually yes. Both are typically wholewheat flour, water and salt cooked on a dry pan, with no dairy in the dough. The one thing to check is whether the kitchen brushes them with ghee before serving, which some do as a matter of habit. Ask for them dry or with oil.',
    },
    {
      question: 'Why does naan need yoghurt?',
      answer: 'The acidity and fat in yoghurt tenderise the gluten and help produce naan\'s soft, chewy, slightly tangy crumb rather than a crisp or dry flatbread. It is doing real structural work, which is why plant yoghurt is the sensible swap - plain water gives a noticeably different bread.',
    },
    {
      question: 'Can I ask a restaurant to make naan without ghee?',
      answer: 'You can ask them to skip the ghee brushing, and most will. That does not fix the dough, which usually already contains yoghurt or milk. Ask about both, or order chapati or roti instead, which are far more likely to be vegan from the start.',
    },
    {
      question: 'Is garlic naan any more likely to be vegan?',
      answer: 'No - garlic naan is standard naan dough with garlic added, and it is often brushed with more ghee than plain, not less. The flavour variant tells you nothing about the dairy content.',
    },
  ],
  relatedTools: ['ingredient-scanner', 'menu-scanner', 'barcode', 'cards'],
  relatedTopics: ['bread', 'cheese', 'vegan-vs-vegetarian'],
  sources: [
    { title: 'The Vegan Society - Definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
  ],
  updatedAt: '2026-07-26',
}
