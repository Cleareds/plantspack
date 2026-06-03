import type { IngredientArticle } from '../types'

export const cheeseArticle: IngredientArticle = {
  slug: 'cheese',
  title: 'Is cheese vegan?',
  metaTitle: 'Is cheese vegan? Dairy, rennet, and the vegan alternatives | PlantsPack',
  metaDescription: 'Dairy cheese is never vegan - it is milk plus, in most hard cheeses, animal rennet. Here is what to avoid, what to buy, and which vegan cheeses actually melt.',
  category: 'ingredient',
  searchQueries: [
    'is cheese vegan',
    'is vegan cheese real cheese',
    'best vegan cheese',
    'is mozzarella vegan',
    'is parmesan vegan',
    'is goat cheese vegan',
    'vegan cheese that melts',
    'is feta vegan',
  ],
  verdict: 'usually-no',
  verdictHeadline: 'No. Cheese is made from milk, so all dairy cheese is non-vegan - and most hard cheeses also use animal rennet.',
  tldr: 'Any cheese made from cow, goat, sheep, or buffalo milk is non-vegan by definition. On top of that, traditional hard cheeses like Parmigiano-Reggiano, Grana Padano, and most aged cheddars are set with rennet taken from the stomach lining of slaughtered calves. Plant-based cheeses made from cashew, soy, almond, coconut, or oat are vegan; check the label for casein and whey, which are dairy proteins that sometimes slip into "non-dairy" products.',
  fullAnswer: [
    'Cheese starts with milk. Milk is an animal product, taken from a lactating mammal who was kept pregnant or recently calved to keep producing it, so every cheese made from cow, goat, sheep, or buffalo milk falls outside the vegan definition before you even get to the rest of the ingredient list. This includes cheeses people sometimes hope are different - goat cheese, sheep\'s milk feta, buffalo mozzarella, raw-milk artisan cheese. The animal still had to lactate, and in dairy production that means the calf or kid was separated shortly after birth so the milk could be sold.',
    'The second issue is rennet. Most hard and semi-hard cheeses are set using rennet, an enzyme mix that curdles milk. Traditional rennet is extracted from the stomach lining of unweaned calves slaughtered for veal. Modern dairies often use microbial or fermentation-produced (FPC) rennet instead, which is genuinely not animal-derived, but you cannot tell which type was used unless the label says so. Crucially, several famous cheeses are required by law to use animal rennet: Parmigiano-Reggiano, Grana Padano, Pecorino Romano, and Gorgonzola all carry EU DOP/PDO regulations that mandate calf or lamb rennet. So real Parmesan is doubly non-vegan - it is dairy, and it is set with a slaughterhouse byproduct. Generic "parmesan" sold outside the EU may use microbial rennet, but it is still cow\'s milk.',
    'Vegan cheese is a real category now, not the rubbery soy slices of fifteen years ago. The base is usually cashew, almond, soy, coconut oil, or oat, fermented or cultured to develop tang, then thickened with starches (tapioca, potato) for melt. Miyoko\'s Creamery makes cultured cashew wheels that age and develop rinds the way dairy cheese does. Violife (coconut-oil based) and Daiya (tapioca and pea protein) dominate the melting-slice and shred market. Bute Island Sheese and Vevan do good UK supermarket-tier blocks. For pizza melt, Violife mozzarella shreds and Miyoko\'s liquid mozzarella perform best; for a board, cultured cashew wheels (Miyoko\'s, Nuts For Cheese, Jules) are the closest analog to aged dairy. Hard, gratable "parmesan" alternatives exist (Violife Prosociano, Follow Your Heart) but they are nutritional-yeast-forward rather than truly aged.',
    'The gotcha category is processed foods labelled "non-dairy" or "lactose-free." In the US, "non-dairy" is a marketing term, not a legal one - non-dairy creamers and some "non-dairy" cheese products can legally contain sodium caseinate, which is a milk-derived protein. Same with whey (milk byproduct), lactose, and milk solids. These appear in cheese-flavoured chips, cracker dust, ranch seasoning, processed "cheese sauces," and supposedly plant-based shreds from less careful brands. Reading the ingredient list matters more than the marketing on the front of the package. The European "may contain milk" allergen warning is different - that is cross-contamination, not an intentional ingredient, and the product itself can still be vegan.',
    'The practical buying guide: anything labelled certified vegan (Vegan Society trademark, V-Label, Certified Vegan, Eve Vegan) is safe. Brands to trust without checking every time include Miyoko\'s, Violife, Daiya, Bute Island, Follow Your Heart, Vevan, Nuts For Cheese, and the supermarket own-brand vegan lines from Tesco, Sainsbury\'s, Aldi, Lidl, and Trader Joe\'s. On unlabelled products, scan for casein, caseinate, whey, lactose, milk solids, milk powder, lactalbumin, lactoglobulin, and "rennet" without a "microbial" or "vegetable" qualifier. If you see any of those, it is not vegan.',
    'Worth flagging: a small number of plant-based cheeses use casein for melt and stretch (this is rare now but historically common with some Galaxy/Veggie Slices products before reformulation). Always check the back. And nutritional yeast, often called "nooch," is the cheap home cheat code for cheesy flavour - it is fully vegan, fortified with B12 in most brands, and works in pasta, popcorn, and homemade cheese sauces.',
  ],
  whatToLookFor: {
    good: [
      'Miyoko\'s Creamery (cultured cashew wheels, mozzarella, butter)',
      'Violife (coconut-oil shreds, slices, feta, prosociano)',
      'Daiya (shreds and slices that melt for pizza)',
      'Bute Island Sheese (UK blocks and spreads)',
      'Follow Your Heart (slices, shreds, parmesan alternative)',
      'Nuts For Cheese, Jules, Climax Foods (artisan cultured cashew wheels)',
      'Certified vegan supermarket own-brand (Tesco Plant Chef, Sainsbury\'s Plant Pioneers, Aldi, Lidl)',
      'Nutritional yeast for cheesy flavour in sauces and on pasta',
    ],
    avoid: [
      'All dairy cheese - cow, goat, sheep, buffalo, regardless of "artisan" or "raw"',
      'Parmigiano-Reggiano, Grana Padano, Pecorino Romano, Gorgonzola (DOP law mandates animal rennet)',
      'Casein, sodium caseinate, calcium caseinate (milk protein in some "non-dairy" products)',
      'Whey, whey protein, lactose, milk solids, milk powder',
      'Rennet without a "microbial," "vegetable," or "FPC" qualifier',
      'Cheese-flavoured chips and crackers without checking - many contain whey or actual cheese powder',
    ],
  },
  faq: [
    {
      question: 'Is mozzarella vegan?',
      answer: 'Dairy mozzarella is not - it is cow or buffalo milk, usually set with rennet (microbial in most mass-market versions, animal rennet in traditional Italian buffalo mozzarella DOP). Vegan mozzarella exists and is one of the better-developed plant cheese categories: Violife, Miyoko\'s liquid mozzarella, and Daiya all make versions that actually melt on pizza.',
    },
    {
      question: 'Why is real Parmesan never vegan, even setting aside the dairy?',
      answer: 'Parmigiano-Reggiano is a protected designation of origin (DOP) cheese, and the regulation requires it to be made with rennet from unweaned calves. The same applies to Grana Padano, Pecorino Romano (lamb rennet), and Gorgonzola. So even a hypothetical lactose-tolerant cheese-eater who cared about rennet has no DOP-legal path to vegan Parmesan. Generic shelf-stable "parmesan" sold outside the EU may use microbial rennet, but it is still milk.',
    },
    {
      question: 'Is goat cheese any better than cow cheese?',
      answer: 'Not for vegan purposes - it is still milk from a lactating animal whose kid was separated to free up the supply. Goat dairy has the same fundamental issue as cow dairy. Some people find it ethically marginally better because goat farms tend to be smaller, but small scale does not change the underlying mechanism. If goat cheese is what you miss, Miyoko\'s and a few French vegan brands (Jay & Joy) make cultured cashew chèvre-style logs that get close.',
    },
    {
      question: 'What\'s the best vegan cheese that actually melts?',
      answer: 'For pizza, Violife mozzarella shreds and Miyoko\'s liquid mozzarella are the consensus picks - they stretch and brown rather than just softening. Daiya melts well too and is cheaper. For grilled cheese, Violife slices and Field Roast Chao slices work. For a melted board cheese (raclette, fondue) the options are weaker; Schinkenspicker and a few small artisan brands make raclette-style discs but melting hard-cheese analogs is still the hardest problem in the category.',
    },
    {
      question: 'Are cheese-flavoured chips vegan?',
      answer: 'Usually not. Most cheese-and-onion crisps, nacho cheese tortilla chips, and cheesy crackers contain whey powder, milk solids, or actual cheese powder. There are exceptions - some brands have reformulated, and dedicated vegan ranges (Hippeas, Off the Eaten Path vegan flavours, some Trader Joe\'s, Violife-flavoured snacks) use nutritional yeast and natural flavours instead. Always check the ingredient list; "vegetarian" on a chip front does not mean vegan.',
    },
    {
      question: 'Can "non-dairy" cheese still contain dairy?',
      answer: 'In the US, yes. "Non-dairy" is a marketing term, not a regulated one, and products labelled non-dairy can legally contain sodium caseinate, a milk-derived protein. This is most common in coffee creamers but has historically applied to some plant-style cheese slices too. The "certified vegan" or Vegan Society logo is the only label that guarantees no milk derivatives. In the EU and UK, allergen labelling is stricter and milk must be highlighted in the ingredient list, but the rule is still: read the back, not the front.',
    },
  ],
  relatedTools: ['substitutes', 'baking', 'ingredient-scanner', 'barcode'],
  relatedTopics: ['palm-oil'],
  sources: [
    { title: 'The Vegan Society: ingredients to avoid', url: 'https://www.vegansociety.com/resources/nutrition-and-health/ingredients-animal-origin' },
    { title: 'Miyoko\'s Creamery: how cultured plant cheese is made', url: 'https://miyokos.com/pages/our-story' },
    { title: 'Consorzio Parmigiano-Reggiano: production regulation (animal rennet requirement)', url: 'https://www.parmigianoreggiano.com/how/specifications-regulations' },
  ],
  updatedAt: '2026-05-29',
}
