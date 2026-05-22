import type { TravelGuide } from '../types'

export const japanGuide: TravelGuide = {
  countrySlug: 'japan',
  countryName: 'Japan',
  metaTitle: 'How to eat vegan in Japan — phrasebook & dish guide | PlantsPack',
  metaDescription: 'Practical guide to eating vegan in Japan: key phrases, dishes that are safe, dishes that hide dashi, and what to watch for. Pairs with PlantsPack\'s directory of vegan places in Japan.',
  vegFriendliness: 3,
  vegFriendlinessNote: 'Improving fast in Tokyo, Kyoto, and Osaka with dedicated vegan restaurants. Outside the big cities, eating vegan needs more planning - dashi (fish stock) hides in almost everything traditional.',
  tldr: 'Japan has a strong vegan scene in Tokyo, Kyoto, and Osaka but limited outside them. The hidden ingredient that catches travellers most often is dashi - fish/bonito stock - which is in miso soup, ramen broth, most simmered dishes, and even some "vegetable" tempura batters. Learn one phrase and you are set: "Dashi nuki de onegaishimasu" (without dashi, please).',
  intro: [
    'Japan is a country of opposites for vegan travellers. The cities have some of the world\'s most creative plant-based restaurants - particularly Tokyo (Ain Soph chain, T\'s TanTan ramen) and Kyoto (Choice, Mumokuteki Cafe). But traditional Japanese cuisine is built on dashi, a stock made from fish flakes and kelp, and it is in places you would not expect: miso soup, soba broth, tempura batter, simmered vegetables, even rice seasoning.',
    'The good news is that shojin ryori, the temple cuisine of Japanese Buddhist monks, is fully vegan by definition. Many temples in Kyoto and Mount Koya serve it to visitors. Outside of shojin ryori, your best bets are: dedicated vegan/vegetarian restaurants, convenience-store onigiri (look for ume, kombu, or sea-salt flavours), and any restaurant where the chef speaks enough English to confirm dashi-free preparation.',
    'Tofu, edamame, seaweed salads, sushi (avoiding fish), most pickles, soba and udon noodles (without the broth), and rice are reliably plant-based. The challenge is the soup, sauce, and seasoning that often comes with them.',
  ],
  phrases: [
    { english: 'I am vegan', native: '私はビーガンです', pronunciation: 'Watashi wa biigan desu' },
    { english: 'Without dashi (fish stock), please', native: 'だし抜きでお願いします', pronunciation: 'Dashi nuki de onegaishimasu' },
    { english: 'No meat, no fish, no dairy, no eggs', native: '肉、魚、乳製品、卵なしで', pronunciation: 'Niku, sakana, nyuuseihin, tamago nashi de' },
    { english: 'Does this contain animal products?', native: 'これに動物性のものは入っていますか？', pronunciation: 'Kore ni doubutsusei no mono wa haitte imasu ka?' },
    { english: 'Is this vegetarian (no meat or fish)?', native: 'これはベジタリアンですか？', pronunciation: 'Kore wa bejitarian desu ka?' },
    { english: 'Thank you very much', native: 'ありがとうございます', pronunciation: 'Arigatou gozaimasu' },
  ],
  dishes: {
    vegan: [
      { name: 'Edamame', nativeName: '枝豆', status: 'vegan', note: 'Salted young soybeans. Reliably vegan.' },
      { name: 'Inari sushi', nativeName: 'いなり寿司', status: 'vegan', note: 'Rice in sweetened tofu pockets. Almost always vegan.' },
      { name: 'Kappa maki', nativeName: 'かっぱ巻き', status: 'vegan', note: 'Cucumber sushi roll. Vegan.' },
      { name: 'Umeboshi onigiri', nativeName: '梅おにぎり', status: 'vegan', note: 'Pickled plum rice ball. Convenience-store standard.' },
      { name: 'Shojin ryori', nativeName: '精進料理', status: 'vegan', note: 'Buddhist temple cuisine. 100% plant-based by tradition.' },
      { name: 'Goma-ae (sesame spinach)', nativeName: 'ごま和え', status: 'usually-vegan', note: 'Spinach in sesame dressing. Sometimes uses dashi in the dressing - ask.' },
    ],
    ask: [
      { name: 'Miso soup', nativeName: '味噌汁', status: 'ask', note: 'Almost always made with bonito dashi. Ask for "konbu dashi only".' },
      { name: 'Tempura', nativeName: '天ぷら', status: 'ask', note: 'Some batters include egg. Even vegetable tempura is often fried in oil shared with shrimp.' },
      { name: 'Soba / udon', nativeName: 'そば / うどん', status: 'ask', note: 'Noodles are fine. The broth almost always contains fish dashi - ask for konbu broth or eat with sesame oil and soy.' },
      { name: 'Inari / oden vegetables', nativeName: 'おでん', status: 'ask', note: 'The broth is fish-based. The tofu/daikon themselves are vegan but absorb dashi.' },
      { name: 'Yasai itame (stir-fried vegetables)', nativeName: '野菜炒め', status: 'ask', note: 'Often seasoned with bonito or oyster sauce - ask for "shoyu only" (just soy sauce).' },
    ],
    avoid: [
      { name: 'Ramen broth', nativeName: 'ラーメン', status: 'avoid', note: 'Almost always pork, chicken, or fish-based. Look specifically for vegan ramen (T\'s TanTan, Afuri, Kyushu Jangara).' },
      { name: 'Okonomiyaki', nativeName: 'お好み焼き', status: 'avoid', note: 'Batter uses dashi + eggs, topped with bonito flakes that move in the heat. Hard to veganise on the fly.' },
      { name: 'Takoyaki', nativeName: 'たこ焼き', status: 'avoid', note: 'Octopus + dashi batter + bonito topping.' },
      { name: 'Curry rice', nativeName: 'カレーライス', status: 'avoid', note: 'Japanese curry roux blocks usually contain dairy and beef extract. Some "vegetable curry" is still made with beef stock.' },
    ],
  },
  hiddenIngredients: [
    'Dashi (出汁) - bonito/fish stock. The single most common hidden animal product. In almost every traditional soup, simmered dish, and seasoning.',
    'Bonito flakes (鰹節, katsuobushi) - shaved dried fish. Sprinkled on top of "vegetable" dishes, okonomiyaki, takoyaki, sometimes tofu.',
    'Honey in salad dressings and yakitori glazes.',
    'Eggs in tempura batter, ramen, soba dipping sauce (tsuyu sometimes), some sweets.',
    'Mayonnaise (Kewpie is the standard) contains egg yolks.',
    'Dairy in Japanese curry roux blocks, melon pan, some breads.',
  ],
  tips: [
    'Convenience stores (7-Eleven, FamilyMart, Lawson) are your friend for snacks: onigiri with ume/kombu/seaweed, edamame, fruit, plain mochi, dark chocolate.',
    'Use HappyCow + PlantsPack to plan ahead - many cities have one or two great vegan spots but no broader scene.',
    'In a non-vegan restaurant, "Dashi nuki de" (without dashi) is the magic phrase. Many places can accommodate.',
    'Mount Koya offers an overnight temple stay (shukubo) with shojin ryori dinner and breakfast - one of the most reliable vegan experiences in Japan.',
    'Donguri Republic and Calbee chips often have vegan flavours; some Pocky and Hi-Chew flavours are vegan but check the wrapper.',
  ],
  relatedTopics: [],
  updatedAt: '2026-05-22',
}
