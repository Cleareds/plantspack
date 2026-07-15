import type { IngredientArticle } from '../types'

export const eggsArticle: IngredientArticle = {
  slug: 'eggs',
  title: 'Are eggs vegan?',
  metaTitle: 'Are eggs vegan? Backyard eggs, mayo, hidden sources, and the best substitutes | Plants Pack',
  metaDescription: 'Eggs are animal products, so by the mainstream vegan definition they are not vegan, regardless of how the hens were raised. Here is where eggs hide on labels, the backyard-egg debate, and what to use instead.',
  category: 'ingredient',
  searchQueries: [
    'are eggs vegan',
    'is mayo vegan',
    'are backyard eggs vegan',
    'is mayonnaise vegan',
    'what can replace eggs in baking',
    'is egg white vegan',
    'is meringue vegan',
    'do vegans eat eggs',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'No. Eggs are animal products, so the mainstream vegan position is that eggs are not vegan, regardless of how the hens were raised.',
  tldr: 'Eggs come from hens, who are animals, so the Vegan Society definition excludes them. That holds for caged, cage-free, free-range, organic, and even backyard or rescue-hen eggs. Eggs hide in mayonnaise, fresh pasta, brioche, meringue, custard, and a long list of baked goods. For baking, aquafaba and flax eggs cover most cases; for scrambles, Just Egg and chickpea flour omelettes work almost identically.',
  fullAnswer: [
    'Eggs are an animal product by any reasonable definition, so the question is not really debated at the definitional level. The Vegan Society, who coined the word vegan in 1944, explicitly excludes eggs. The standard vegan definition is "a way of living which seeks to exclude, as far as is possible and practicable, all forms of exploitation of, and cruelty to, animals for food." Eggs come from hens, hens are animals, so eggs are out. Major vegan certifications (Vegan Society trademark, V-Label, Certified Vegan) all exclude eggs regardless of source.',
    'The most common edge case is backyard or rescue eggs. Some people who otherwise eat plant-based include eggs from their own hens, or from rescued battery hens they have given a home to. The argument is that the hen is going to lay anyway, the eggs are not being sold, and the bird is well cared for. This is a personal ethical choice and some people are comfortable with it, but it is not vegan by the mainstream definition. Laying is also not a costless process for the hen. Modern laying breeds have been selected to produce roughly 300 eggs a year (wild junglefowl lay around 10-15), which depletes calcium and is linked to reproductive disease. Some rescue keepers feed the eggs back to the hens to return the nutrients.',
    'Eggs hide in more products than people expect. Watch the label for: mayonnaise (the binder is egg yolk), traditional fresh pasta and egg noodles (durum-only dry pasta is usually fine), brioche, challah, most enriched breads, egg wash on pastries and pretzels, crème brûlée, custard, lemon curd, meringue, marshmallow fluff, nougat, traditional Caesar dressing, hollandaise, some protein bars and baked goods that list albumen, ovalbumin, or egg white powder, and lysozyme (E1105, an egg-derived enzyme sometimes used in cheese and wine). Lecithin is usually soy or sunflower but can rarely be egg-derived, so check if it matters. A few wines and beers historically use egg white (albumen) as a fining agent, though this is increasingly rare.',
    'The industrial reality is worth knowing even if you eat eggs only occasionally. The global laying-hen industry kills every male chick within a day of hatching, because males do not lay eggs and the laying breeds are not the same as meat breeds, so the males have no commercial value. This is true for caged, cage-free, free-range, and organic operations. Hens themselves are slaughtered at 18-24 months once their laying rate drops, against a natural lifespan of 8-10 years. Cage-free and free-range improve welfare in measurable ways (space, perching, dust-bathing) but do not change the culling or end-of-lay slaughter. A handful of European producers now use in-ovo sexing to avoid the male cull, but it is a small share of the market.',
    'For substitutes, match the function the egg is doing. For baking and binding: aquafaba (the brine from a can of chickpeas) whips like egg white, three tablespoons replaces one whole egg; a flax egg (one tablespoon ground flax plus three tablespoons water, rested five minutes) binds quick breads and cookies; commercial replacers like Bob\'s Red Mill Egg Replacer, OGGS aquafaba cartons, and Crackd work in most recipes. For scrambled eggs and omelettes: Just Egg (mung bean protein) scrambles and folds almost identically to real egg, silken tofu scrambles well with turmeric and kala namak (black salt, which has a sulphurous egg-like aroma), and a chickpea flour omelette is the cheapest classic. For meringue, aquafaba whipped with sugar and cream of tartar is genuinely indistinguishable. For richness in bakes: mashed banana, applesauce, or a chia egg.',
    'One language note. Some vegetarians eat eggs and dairy (lacto-ovo vegetarian) and some eat eggs but not dairy (ovo-vegetarian). Vegans do not eat either. The term plant-based is ambiguous and depends on the speaker: a plant-based diet can mean strictly vegan, or it can mean "mostly plants but occasional eggs and dairy." If precision matters (a restaurant menu, a recipe blog, a product label), look for vegan specifically rather than plant-based.',
  ],
  whatToLookFor: {
    good: [
      'Just Egg (mung bean liquid, scrambles like real egg)',
      'OGGS aquafaba carton',
      'Crackd plant egg',
      'Bob\'s Red Mill Egg Replacer (powder, for baking)',
      'Aquafaba from a can of chickpeas (homemade)',
      'Flax egg (1 tbsp ground flax + 3 tbsp water)',
      'Chickpea flour (for omelettes and scrambles)',
      'Silken tofu (for scrambles, quiches, custards)',
    ],
    avoid: [
      'Eggs of any kind, including free-range, organic, and backyard',
      'Egg white, egg yolk, whole egg powder',
      'Albumen, ovalbumin (egg white protein)',
      'Lysozyme (E1105) - egg-derived enzyme',
      'Mayonnaise, unless explicitly labelled vegan',
      'Meringue, unless explicitly labelled vegan',
      'Fresh egg pasta and most fresh egg noodles',
      'Brioche, challah, and many enriched breads with egg wash',
    ],
  },
  faq: [
    {
      question: 'Are eggs vegetarian?',
      answer: 'Eggs are accepted by lacto-ovo vegetarians, who eat both eggs and dairy. They are not accepted by vegans. If a recipe or restaurant says vegetarian, assume it may contain eggs and dairy; if it says vegan, it should contain neither.',
    },
    {
      question: 'Are backyard or rescue-hen eggs vegan?',
      answer: 'No, not by the mainstream definition. Some people who keep rescued battery hens do eat their eggs and consider it ethically defensible, but it is a personal choice rather than a vegan one. Many rescue keepers feed the eggs back to the hens to return the calcium and nutrients the laying process takes out of them.',
    },
    {
      question: 'Is mayonnaise vegan?',
      answer: 'Standard mayonnaise is not vegan - the emulsifier is egg yolk. Vegan alternatives exist and taste almost identical: Hellmann\'s Vegan, Just Mayo, Follow Your Heart Vegenaise, and many supermarket own-brand vegan mayos. Check the label for an explicit vegan callout.',
    },
    {
      question: 'What about cage-free or free-range eggs?',
      answer: 'Cage-free and free-range improve hen welfare in real ways (space, perching, outdoor access depending on standard) but they are not vegan. The same industry still culls male chicks at hatch and slaughters hens at 18-24 months when their laying rate drops. Welfare improvements and veganism are different questions.',
    },
    {
      question: 'Are gel capsules on supplements made from egg?',
      answer: 'Usually not - standard gel capsules are gelatin, which is collagen from cow or pig bone and skin, not egg. So they are not vegan either, but for a different reason. Vegan capsules use plant cellulose (HPMC) and are usually called out on the label.',
    },
    {
      question: 'Is Just Egg actually like real egg?',
      answer: 'Close. It is a mung bean protein liquid that you pour into a hot pan and scramble or fold. The texture and feel are very similar to real scrambled egg or omelette; the flavour is mild and works well with the usual seasonings (salt, pepper, kala namak for a more eggy aroma). It is not a 1:1 baking replacement - for that use aquafaba or a flax egg.',
    },
  ],
  relatedTools: ['baking', 'substitutes', 'ingredient-scanner', 'barcode'],
  relatedTopics: ['honey'],
  sources: [
    { title: 'The Vegan Society: definition of veganism', url: 'https://www.vegansociety.com/go-vegan/definition-veganism' },
    { title: 'Compassion in World Farming: the welfare of laying hens', url: 'https://www.ciwf.org.uk/farm-animals/chickens/egg-laying-hens/' },
    { title: 'Just Egg: why we exist (male chick culling and the egg industry)', url: 'https://www.ju.st/stories' },
  ],
  updatedAt: '2026-05-29',
}
