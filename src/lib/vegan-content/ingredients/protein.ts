import type { IngredientArticle } from '../types'

export const proteinArticle: IngredientArticle = {
  slug: 'protein',
  title: 'How do vegans get protein?',
  metaTitle: 'How do vegans get protein? The actual numbers, foods, and day-in-the-life | PlantsPack',
  metaDescription: 'Most adults need about 0.8g of protein per kg of bodyweight. A varied vegan diet of beans, tofu, tempeh, seitan, lentils, and whole grains hits that comfortably. Here are the numbers.',
  category: 'lifestyle',
  searchQueries: [
    'how do vegans get protein',
    'best vegan protein sources',
    'vegan protein',
    'what has protein in a vegan diet',
    'do vegans get enough protein',
    'vegan protein deficiency',
    'best vegan protein powder',
    'is tofu high in protein',
  ],
  verdict: 'usually-yes',
  verdictHeadline: 'Easily. Most adults need about 0.8g protein per kg of bodyweight, and a varied plant-based diet hits that comfortably from beans, tofu, tempeh, seitan, lentils, quinoa, and whole grains.',
  tldr: 'The recommended intake is 0.8g protein per kg bodyweight (about 56g for a 70kg adult). Published cohort studies show vegans average 1.0-1.1g/kg without trying. Staples like tofu (20g per 100g), lentils (18g per cooked cup), and seitan (~25g per 100g cooked) make this trivial. The "you must combine rice and beans at the same meal" idea is debunked.',
  fullAnswer: [
    'The actual numbers first. The Dietary Reference Intake for protein is 0.8g per kg of bodyweight per day, which works out to roughly 56g for a 70kg adult or 48g for a 60kg adult. Athletes in strength sports may need 1.2-2.0g per kg, so 84-140g for the same 70kg person. Published cohort studies (EPIC-Oxford, Adventist Health Study-2) consistently show that vegans average 1.0-1.1g per kg without specifically targeting protein. Clinical protein deficiency in vegans living in industrialised countries is rare; it shows up in famine and severe illness, not in someone eating lentils and tofu.',
    'The high-protein staples, with grams per typical serving: lentils (18g per cooked cup), chickpeas (15g per cup), black beans (15g per cup), kidney beans (15g per cup), firm tofu (20g per 100g), tempeh (20g per 100g), edamame (17g per cup), seitan (about 25g per 100g cooked, the highest-protein common vegan food), quinoa (8g per cooked cup), oats (5g per half-cup dry), peanut butter (8g per 2 tablespoons), hemp seeds (10g per 3 tablespoons), pumpkin seeds (9g per quarter-cup), nutritional yeast (8g per 2 tablespoons). Vegan protein bars and shakes are fine if convenient but not necessary.',
    'The "complete protein" myth is worth addressing because it still appears in older nutrition books. The claim was that vegans had to "combine" rice and beans at the same meal to get all nine essential amino acids. This is debunked. The body pools amino acids across the day from a varied diet, so eating beans at lunch and grains at dinner works the same as eating them together. The Academy of Nutrition and Dietetics Position Paper on vegetarian diets explicitly states that protein from a variety of plant foods eaten during the course of a day supplies enough essential amino acids when caloric requirements are met.',
    'A practical day-in-the-life for a 70kg adult: oatmeal with soy milk and peanut butter for breakfast hits around 20g. Lentil soup with whole-grain bread for lunch adds 25g. Tofu stir-fry with rice and broccoli for dinner brings 30g. A handful of trail mix or hemp seeds as a snack adds 10g. Total: about 85g. That is well above the 56g requirement and comfortably in the range strength athletes target. No supplements, no powders, no thinking about it.',
    'On protein powders, if you want one: pea protein is the most neutral-tasting and digestible for most people. Soy protein isolate has the highest amino acid score (PDCAAS of 1.0, same as whey). Brown rice protein is mild and hypoallergenic. Hemp protein is less concentrated but comes with fibre and omega-3s. Common vegan brands: Vega, Naked, Garden of Life, Bulk, Form, Huel. Watch the label closely if you are trying to stay vegan: many "plant-based" protein blends are actually mixed with whey or casein, and some bars marketed as plant protein contain milk derivatives.',
    'When protein really does matter and you should pay attention: pregnancy (needs increase by about 25g per day in the second and third trimesters), strength athletes building muscle, recovery from illness or surgery, and growing children. In those cases consulting a registered dietitian is reasonable, not because vegan diets are deficient but because protein needs change. The Academy of Nutrition and Dietetics Position Paper states that appropriately planned vegan diets are appropriate for all stages of the life cycle, including infancy, childhood, adolescence, pregnancy, and athletic performance. The key word is planned: pay attention, eat a variety of foods, and the numbers work out.',
  ],
  whatToLookFor: {
    good: [
      'Tofu, tempeh, seitan, edamame, lentils, chickpeas, black beans, kidney beans, quinoa, oats, nutritional yeast, hemp seeds, pumpkin seeds, peanut butter, peas',
      'Plant-based protein powders (pea, soy, hemp, rice)',
      'Vegan-certified protein bars (Misfits, Vivo Life, No Cow, Pulsin)',
    ],
    avoid: [
      'Whey or casein hidden in "plant" protein bars - read the full ingredient list',
      'Collagen supplements (animal-derived gelatin, marketed as protein but not vegan)',
      'Fish oil for omega-3 (use algae oil, which is where the fish got it from anyway)',
    ],
  },
  faq: [
    {
      question: 'Is protein deficiency common in vegans?',
      answer: 'No. Multiple large cohort studies (EPIC-Oxford, Adventist Health Study-2) show vegans hit and exceed the DRI of 0.8g/kg comfortably, averaging 1.0-1.1g/kg. Clinical protein deficiency in vegans in industrialised countries is rare and usually tied to severe under-eating, not the absence of animal products.',
    },
    {
      question: 'Do I need to combine rice and beans at the same meal?',
      answer: 'No. This idea comes from a 1971 book (Diet for a Small Planet) whose author retracted it in later editions. The body pools amino acids across the day from varied foods. Eat a range of beans, grains, nuts, and seeds across your meals and the amino acid profile works out.',
    },
    {
      question: 'What is the highest-protein vegan food?',
      answer: 'Seitan, by a wide margin. It is about 75g of protein per 100g dry weight (it is essentially pure wheat gluten) and around 25g per 100g cooked. Tofu and tempeh come next at roughly 20g per 100g. Edamame and lentils sit around 17-18g per cup cooked.',
    },
    {
      question: 'Is tofu really a good protein source?',
      answer: 'Yes. Firm tofu has about 20g of protein per 100g, and it is a complete protein (it scores 1.0 on the PDCAAS amino acid quality scale, the same as egg and whey). It is also one of the cheapest protein sources per gram, vegan or not.',
    },
    {
      question: 'What about vegan kids and protein?',
      answer: 'The Academy of Nutrition and Dietetics 2016 Position Paper states: "appropriately planned vegetarian, including vegan, diets are healthful, nutritionally adequate, and may provide health benefits for the prevention and treatment of certain diseases. These diets are appropriate for all stages of the life cycle, including infancy, childhood, adolescence, pregnancy, lactation, and for athletes." That said, paediatric vegan diets benefit from a registered dietitian check-in to make sure calories, B12, iron, and protein are all on track.',
    },
    {
      question: 'How much protein per meal for muscle building?',
      answer: 'Around 25-30g per meal is the rough target for maximising muscle protein synthesis if you are training. A tofu bowl with 150g tofu and a cup of edamame hits this easily. So does a lentil-and-quinoa salad. You do not need a shake unless you want one.',
    },
  ],
  relatedTools: ['substitutes', 'baking', 'ingredient-scanner', 'calculator'],
  relatedTopics: ['vitamins', 'sugar'],
  sources: [
    { title: 'Academy of Nutrition and Dietetics: Position on Vegetarian Diets (2016)', url: 'https://pubmed.ncbi.nlm.nih.gov/27886704/' },
    { title: 'EPIC-Oxford cohort: protein intake across diet groups', url: 'https://pubmed.ncbi.nlm.nih.gov/12740075/' },
    { title: 'The Vegan Society: Protein', url: 'https://www.vegansociety.com/resources/nutrition-and-health/nutrients/protein' },
  ],
  updatedAt: '2026-05-29',
}
