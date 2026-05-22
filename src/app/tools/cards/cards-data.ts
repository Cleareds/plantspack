export type RestaurantCard = {
  lang: string
  label: string // English label of the language
  native: string // Native language name
  title: string // "I am vegan" headline
  body: string // explanation paragraph
  thanks: string // closing thank-you line
}

// "I also cannot eat:" prefix in each supported language. Falls back to English.
export const ALSO_AVOID_PREFIX: Record<string, string> = {
  en: 'I also cannot eat',
  es: 'Tampoco puedo comer',
  fr: 'Je ne peux pas non plus manger',
  de: 'Ich darf außerdem nicht essen',
  it: 'Non posso mangiare nemmeno',
  pt: 'Também não posso comer',
  nl: 'Ik mag ook niet eten',
  pl: 'Nie mogę też jeść',
  cs: 'Také nemohu jíst',
  sv: 'Jag kan inte heller äta',
  tr: 'Ayrıca yiyemem',
  ru: 'Я также не могу есть',
  ar: 'لا أستطيع أيضاً تناول',
  zh: '我也不能吃',
  ja: '以下も食べられません',
  ko: '다음도 먹을 수 없습니다',
  th: 'ฉันก็กินไม่ได้เช่นกัน',
  vi: 'Tôi cũng không thể ăn',
  id: 'Saya juga tidak bisa makan',
  hi: 'मैं ये भी नहीं खा सकता',
  el: 'Επίσης δεν μπορώ να φάω',
  hu: 'Sem ezeket nem tudom enni',
  he: 'אני גם לא יכול לאכול',
}

// Common allergen labels in each language so a custom card can say
// "I am vegan AND I also avoid X" naturally. Falls back to English if
// a language's translation is missing.
export const ALLERGEN_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { gluten: 'gluten', soy: 'soy', nuts: 'tree nuts', peanuts: 'peanuts', sesame: 'sesame', mustard: 'mustard', celery: 'celery', lupin: 'lupin', sulphites: 'sulphites', corn: 'corn', nightshades: 'nightshades', coconut: 'coconut' },
  es: { gluten: 'gluten', soy: 'soja', nuts: 'frutos secos', peanuts: 'cacahuetes', sesame: 'sésamo', mustard: 'mostaza', celery: 'apio', lupin: 'altramuces', sulphites: 'sulfitos', corn: 'maíz', nightshades: 'solanáceas', coconut: 'coco' },
  fr: { gluten: 'gluten', soy: 'soja', nuts: 'fruits à coque', peanuts: 'arachides', sesame: 'sésame', mustard: 'moutarde', celery: 'céleri', lupin: 'lupin', sulphites: 'sulfites', corn: 'maïs', nightshades: 'solanacées', coconut: 'noix de coco' },
  de: { gluten: 'Gluten', soy: 'Soja', nuts: 'Nüsse', peanuts: 'Erdnüsse', sesame: 'Sesam', mustard: 'Senf', celery: 'Sellerie', lupin: 'Lupinen', sulphites: 'Sulfite', corn: 'Mais', nightshades: 'Nachtschattengewächse', coconut: 'Kokosnuss' },
  it: { gluten: 'glutine', soy: 'soia', nuts: 'frutta a guscio', peanuts: 'arachidi', sesame: 'sesamo', mustard: 'senape', celery: 'sedano', lupin: 'lupini', sulphites: 'solfiti', corn: 'mais', nightshades: 'solanacee', coconut: 'cocco' },
  pt: { gluten: 'glúten', soy: 'soja', nuts: 'frutos secos', peanuts: 'amendoim', sesame: 'sésamo', mustard: 'mostarda', celery: 'aipo', lupin: 'tremoço', sulphites: 'sulfitos', corn: 'milho', nightshades: 'solanáceas', coconut: 'coco' },
  nl: { gluten: 'gluten', soy: 'soja', nuts: 'noten', peanuts: 'pinda\'s', sesame: 'sesam', mustard: 'mosterd', celery: 'selderij', lupin: 'lupine', sulphites: 'sulfieten', corn: 'maïs', nightshades: 'nachtschadefamilie', coconut: 'kokos' },
  ja: { gluten: 'グルテン', soy: '大豆', nuts: 'ナッツ類', peanuts: '落花生', sesame: 'ごま', mustard: 'マスタード', celery: 'セロリ', lupin: 'ルピナス', sulphites: '亜硫酸塩', corn: 'とうもろこし', nightshades: 'ナス科', coconut: 'ココナッツ' },
  zh: { gluten: '麸质', soy: '大豆', nuts: '坚果', peanuts: '花生', sesame: '芝麻', mustard: '芥末', celery: '芹菜', lupin: '羽扇豆', sulphites: '亚硫酸盐', corn: '玉米', nightshades: '茄科', coconut: '椰子' },
  ko: { gluten: '글루텐', soy: '대두', nuts: '견과류', peanuts: '땅콩', sesame: '참깨', mustard: '겨자', celery: '셀러리', lupin: '루핀', sulphites: '아황산염', corn: '옥수수', nightshades: '가지과', coconut: '코코넛' },
  th: { gluten: 'กลูเตน', soy: 'ถั่วเหลือง', nuts: 'ถั่วเปลือกแข็ง', peanuts: 'ถั่วลิสง', sesame: 'งา', mustard: 'มัสตาร์ด', celery: 'ขึ้นฉ่าย', lupin: 'ลูพิน', sulphites: 'ซัลไฟต์', corn: 'ข้าวโพด', nightshades: 'ตระกูลมะเขือ', coconut: 'มะพร้าว' },
}

export function translateAllergen(allergen: string, lang: string): string {
  const dict = ALLERGEN_TRANSLATIONS[lang] ?? ALLERGEN_TRANSLATIONS.en
  return dict[allergen] ?? allergen
}

// Translations reviewed against vegan-passport-style wording.
// Keep the body literal: avoid figurative meaning that doesn't translate.
export const RESTAURANT_CARDS: RestaurantCard[] = [
  {
    lang: 'en', label: 'English', native: 'English',
    title: 'I am vegan',
    body: 'I do not eat any animal products. This includes meat, fish, shellfish, poultry, eggs, dairy, butter, cheese, cream, honey, gelatin, or any animal-derived ingredients. Could you please show me dishes that contain none of these, or prepare something simple from vegetables, fruit, grains, and legumes?',
    thanks: 'Thank you very much for your help.',
  },
  {
    lang: 'es', label: 'Spanish', native: 'Español',
    title: 'Soy vegano',
    body: 'No como ningún producto de origen animal. Esto incluye carne, pescado, marisco, aves, huevos, lácteos, mantequilla, queso, nata, miel, gelatina, ni ningún ingrediente derivado de animales. ¿Podría enseñarme platos que no contengan nada de esto, o preparar algo sencillo a base de verduras, fruta, cereales y legumbres?',
    thanks: 'Muchas gracias por su ayuda.',
  },
  {
    lang: 'fr', label: 'French', native: 'Français',
    title: 'Je suis végane',
    body: 'Je ne mange aucun produit d\'origine animale. Cela inclut la viande, le poisson, les fruits de mer, la volaille, les œufs, les produits laitiers, le beurre, le fromage, la crème, le miel, la gélatine, et tout ingrédient d\'origine animale. Pourriez-vous m\'indiquer des plats qui n\'en contiennent pas, ou préparer quelque chose de simple à base de légumes, fruits, céréales et légumineuses ?',
    thanks: 'Merci beaucoup pour votre aide.',
  },
  {
    lang: 'de', label: 'German', native: 'Deutsch',
    title: 'Ich lebe vegan',
    body: 'Ich esse keinerlei tierische Produkte. Dazu gehören Fleisch, Fisch, Meeresfrüchte, Geflügel, Eier, Milchprodukte, Butter, Käse, Sahne, Honig, Gelatine sowie alle Zutaten tierischen Ursprungs. Könnten Sie mir Gerichte zeigen, die nichts davon enthalten, oder etwas Einfaches aus Gemüse, Obst, Getreide und Hülsenfrüchten zubereiten?',
    thanks: 'Vielen Dank für Ihre Hilfe.',
  },
  {
    lang: 'it', label: 'Italian', native: 'Italiano',
    title: 'Sono vegano',
    body: 'Non mangio nessun prodotto di origine animale. Ciò include carne, pesce, frutti di mare, pollame, uova, latticini, burro, formaggio, panna, miele, gelatina e qualsiasi ingrediente di origine animale. Potrebbe indicarmi piatti che non contengono nulla di tutto questo, o preparare qualcosa di semplice a base di verdure, frutta, cereali e legumi?',
    thanks: 'Grazie mille per il vostro aiuto.',
  },
  {
    lang: 'pt', label: 'Portuguese', native: 'Português',
    title: 'Sou vegano',
    body: 'Não como nenhum produto de origem animal. Isto inclui carne, peixe, marisco, aves, ovos, lacticínios, manteiga, queijo, natas, mel, gelatina, nem qualquer ingrediente derivado de animais. Poderia indicar-me pratos que não contenham nada disto, ou preparar algo simples com legumes, fruta, cereais e leguminosas?',
    thanks: 'Muito obrigado pela sua ajuda.',
  },
  {
    lang: 'nl', label: 'Dutch', native: 'Nederlands',
    title: 'Ik ben veganist',
    body: 'Ik eet geen dierlijke producten. Dit omvat vlees, vis, schaaldieren, gevogelte, eieren, zuivel, boter, kaas, room, honing, gelatine en alle ingrediënten van dierlijke oorsprong. Kunt u mij gerechten aanwijzen die hier niets van bevatten, of iets eenvoudigs bereiden met groenten, fruit, granen en peulvruchten?',
    thanks: 'Hartelijk bedankt voor uw hulp.',
  },
  {
    lang: 'pl', label: 'Polish', native: 'Polski',
    title: 'Jestem weganinem',
    body: 'Nie jem żadnych produktów pochodzenia zwierzęcego. Obejmuje to mięso, ryby, owoce morza, drób, jajka, nabiał, masło, ser, śmietanę, miód, żelatynę oraz wszelkie składniki pochodzenia zwierzęcego. Czy może mi Pan/Pani wskazać dania, które tego nie zawierają, lub przygotować coś prostego z warzyw, owoców, zbóż i roślin strączkowych?',
    thanks: 'Bardzo dziękuję za pomoc.',
  },
  {
    lang: 'cs', label: 'Czech', native: 'Čeština',
    title: 'Jsem vegan',
    body: 'Nejím žádné živočišné produkty. To zahrnuje maso, ryby, mořské plody, drůbež, vejce, mléčné výrobky, máslo, sýr, smetanu, med, želatinu ani žádné suroviny živočišného původu. Můžete mi prosím ukázat jídla, která nic z toho neobsahují, nebo připravit něco jednoduchého ze zeleniny, ovoce, obilovin a luštěnin?',
    thanks: 'Velmi vám děkuji za pomoc.',
  },
  {
    lang: 'sv', label: 'Swedish', native: 'Svenska',
    title: 'Jag är vegan',
    body: 'Jag äter inga animaliska produkter. Det inkluderar kött, fisk, skaldjur, fågel, ägg, mejeriprodukter, smör, ost, grädde, honung, gelatin och alla ingredienser av animaliskt ursprung. Skulle ni kunna visa mig rätter som inte innehåller något av detta, eller laga något enkelt av grönsaker, frukt, spannmål och baljväxter?',
    thanks: 'Tack så mycket för hjälpen.',
  },
  {
    lang: 'tr', label: 'Turkish', native: 'Türkçe',
    title: 'Ben veganım',
    body: 'Hiçbir hayvansal ürün yemiyorum. Buna et, balık, deniz ürünleri, kümes hayvanları, yumurta, süt ürünleri, tereyağı, peynir, krema, bal, jelatin ve hayvansal kökenli tüm malzemeler dahildir. Bana bunlardan hiçbirini içermeyen yemekleri gösterebilir misiniz, ya da sebze, meyve, tahıl ve baklagillerden basit bir şey hazırlayabilir misiniz?',
    thanks: 'Yardımınız için çok teşekkür ederim.',
  },
  {
    lang: 'ru', label: 'Russian', native: 'Русский',
    title: 'Я веган',
    body: 'Я не ем никаких продуктов животного происхождения. Это включает мясо, рыбу, морепродукты, птицу, яйца, молочные продукты, масло, сыр, сливки, мёд, желатин и любые ингредиенты животного происхождения. Не могли бы вы показать мне блюда, которые ничего из этого не содержат, или приготовить что-нибудь простое из овощей, фруктов, круп и бобовых?',
    thanks: 'Большое спасибо за помощь.',
  },
  {
    lang: 'ar', label: 'Arabic', native: 'العربية',
    title: 'أنا نباتي صرف (فيغان)',
    body: 'أنا لا آكل أي منتجات حيوانية. وهذا يشمل اللحوم والأسماك والمحار والدواجن والبيض ومنتجات الألبان والزبدة والجبن والقشدة والعسل والجيلاتين وأي مكونات مشتقة من الحيوانات. هل يمكنك أن تريني أطباقاً لا تحتوي على أي من هذه المكونات، أو أن تحضّر شيئاً بسيطاً من الخضروات والفواكه والحبوب والبقوليات؟',
    thanks: 'شكراً جزيلاً على مساعدتك.',
  },
  {
    lang: 'zh', label: 'Chinese (Simplified)', native: '简体中文',
    title: '我是纯素食者',
    body: '我不吃任何动物产品。这包括肉、鱼、贝类、禽类、蛋、奶制品、黄油、奶酪、奶油、蜂蜜、明胶以及任何动物来源的成分。请问能否给我看一些不含这些成分的菜，或者用蔬菜、水果、谷物和豆类做一些简单的菜？',
    thanks: '非常感谢您的帮助。',
  },
  {
    lang: 'ja', label: 'Japanese', native: '日本語',
    title: '私はヴィーガンです',
    body: '私は動物性食品を一切食べません。これには肉、魚、貝、鶏肉、卵、乳製品、バター、チーズ、クリーム、はちみつ、ゼラチン、動物由来のすべての材料が含まれます。これらを含まない料理を教えていただくか、野菜、果物、穀物、豆類でシンプルな料理を作っていただけますか？',
    thanks: 'ご協力ありがとうございます。',
  },
  {
    lang: 'ko', label: 'Korean', native: '한국어',
    title: '저는 비건입니다',
    body: '저는 어떤 동물성 식품도 먹지 않습니다. 여기에는 고기, 생선, 해산물, 가금류, 달걀, 유제품, 버터, 치즈, 크림, 꿀, 젤라틴 및 모든 동물 유래 재료가 포함됩니다. 이러한 재료가 들어가지 않은 요리를 알려주시거나, 채소, 과일, 곡물, 콩류로 간단한 요리를 만들어 주실 수 있을까요?',
    thanks: '도와주셔서 정말 감사합니다.',
  },
  {
    lang: 'th', label: 'Thai', native: 'ไทย',
    title: 'ฉันเป็นวีแกน',
    body: 'ฉันไม่กินผลิตภัณฑ์จากสัตว์ใดๆ ทั้งสิ้น รวมถึงเนื้อสัตว์ ปลา อาหารทะเล สัตว์ปีก ไข่ ผลิตภัณฑ์จากนม เนย ชีส ครีม น้ำผึ้ง เจลาติน และส่วนผสมใดๆ ที่มาจากสัตว์ คุณช่วยแนะนำเมนูที่ไม่มีส่วนผสมเหล่านี้ หรือทำอะไรง่ายๆ จากผัก ผลไม้ ธัญพืช และพืชตระกูลถั่วได้ไหมคะ/ครับ',
    thanks: 'ขอบคุณมากสำหรับความช่วยเหลือ',
  },
  {
    lang: 'vi', label: 'Vietnamese', native: 'Tiếng Việt',
    title: 'Tôi ăn thuần chay',
    body: 'Tôi không ăn bất kỳ sản phẩm nào từ động vật. Điều này bao gồm thịt, cá, hải sản, gia cầm, trứng, sữa và các sản phẩm từ sữa, bơ, phô mai, kem, mật ong, gelatin và bất kỳ thành phần nào có nguồn gốc từ động vật. Anh/chị có thể chỉ cho tôi những món không chứa các nguyên liệu này, hoặc chế biến món đơn giản từ rau, trái cây, ngũ cốc và các loại đậu được không?',
    thanks: 'Cảm ơn rất nhiều vì sự giúp đỡ.',
  },
  {
    lang: 'id', label: 'Indonesian', native: 'Bahasa Indonesia',
    title: 'Saya seorang vegan',
    body: 'Saya tidak makan produk hewani apa pun. Ini termasuk daging, ikan, makanan laut, unggas, telur, susu dan produk susu, mentega, keju, krim, madu, gelatin, serta bahan apa pun yang berasal dari hewan. Bisakah Anda menunjukkan menu yang tidak mengandung bahan-bahan ini, atau menyiapkan sesuatu yang sederhana dari sayuran, buah, biji-bijian, dan kacang-kacangan?',
    thanks: 'Terima kasih banyak atas bantuannya.',
  },
  {
    lang: 'hi', label: 'Hindi', native: 'हिन्दी',
    title: 'मैं वीगन हूँ',
    body: 'मैं किसी भी प्रकार के पशु उत्पाद नहीं खाता/खाती। इसमें मांस, मछली, समुद्री भोजन, मुर्गी, अंडे, दूध और डेयरी उत्पाद, मक्खन, पनीर, क्रीम, शहद, जिलेटिन, और कोई भी पशु-व्युत्पन्न सामग्री शामिल है। क्या आप मुझे ऐसे व्यंजन दिखा सकते हैं जिनमें ये कुछ भी न हो, या सब्ज़ियों, फलों, अनाज और दालों से कुछ सरल बना सकते हैं?',
    thanks: 'आपकी मदद के लिए बहुत-बहुत धन्यवाद।',
  },
  {
    lang: 'el', label: 'Greek', native: 'Ελληνικά',
    title: 'Είμαι vegan',
    body: 'Δεν τρώω κανένα προϊόν ζωικής προέλευσης. Αυτό περιλαμβάνει κρέας, ψάρι, θαλασσινά, πουλερικά, αυγά, γαλακτοκομικά, βούτυρο, τυρί, κρέμα, μέλι, ζελατίνη και οποιοδήποτε συστατικό ζωικής προέλευσης. Θα μπορούσατε να μου δείξετε πιάτα που δεν περιέχουν τίποτα από αυτά, ή να ετοιμάσετε κάτι απλό από λαχανικά, φρούτα, δημητριακά και όσπρια;',
    thanks: 'Σας ευχαριστώ πολύ για τη βοήθεια.',
  },
  {
    lang: 'hu', label: 'Hungarian', native: 'Magyar',
    title: 'Vegán vagyok',
    body: 'Nem eszem semmilyen állati eredetű terméket. Ez magában foglalja a húst, halat, tenger gyümölcseit, baromfit, tojást, tejterméket, vajat, sajtot, tejszínt, mézet, zselatint, valamint bármilyen állati eredetű hozzávalót. Tudna olyan ételeket mutatni, amelyek ezekből semmit sem tartalmaznak, vagy készíteni valami egyszerűt zöldségből, gyümölcsből, gabonából és hüvelyesekből?',
    thanks: 'Köszönöm szépen a segítségét.',
  },
  {
    lang: 'he', label: 'Hebrew', native: 'עברית',
    title: 'אני טבעוני',
    body: 'אני לא אוכל מוצרים מן החי. זה כולל בשר, דגים, פירות ים, עוף, ביצים, מוצרי חלב, חמאה, גבינה, שמנת, דבש, ג\'לטין, וכל מרכיב שמקורו בחי. האם תוכל להראות לי מנות שאינן מכילות אף אחד מאלה, או להכין משהו פשוט מירקות, פירות, דגנים וקטניות?',
    thanks: 'תודה רבה על העזרה.',
  },
]

export type NonVeganE = { code: string; name: string; source: string }

// E-numbers commonly derived from animals. Conservative list - some can be
// vegan depending on source (mono- and diglycerides, lactic acid), so we
// flag those as "check the source" instead of strictly non-vegan.
export const NON_VEGAN_E_NUMBERS: NonVeganE[] = [
  { code: 'E120', name: 'Carmine / Cochineal', source: 'Crushed scale insects. Red colouring.' },
  { code: 'E441', name: 'Gelatin', source: 'Animal bones, skin, and connective tissue.' },
  { code: 'E542', name: 'Bone phosphate', source: 'Animal bones.' },
  { code: 'E631', name: 'Disodium inosinate', source: 'Usually fish or meat (rarely plant). Flavour enhancer.' },
  { code: 'E635', name: 'Disodium 5\'-ribonucleotides', source: 'Same as E631 - usually animal-derived.' },
  { code: 'E901', name: 'Beeswax', source: 'From bees.' },
  { code: 'E904', name: 'Shellac', source: 'Secretion of the lac insect. Glaze on apples, sweets, pills.' },
  { code: 'E913', name: 'Lanolin', source: 'Sheep wool grease.' },
  { code: 'E920', name: 'L-Cysteine', source: 'Often from poultry feathers or human hair. Used in bread.' },
  { code: 'E966', name: 'Lactitol', source: 'Derived from lactose (dairy).' },
]

export const MAYBE_VEGAN_E_NUMBERS: NonVeganE[] = [
  { code: 'E322', name: 'Lecithin', source: 'Usually soy (vegan), sometimes egg. Check brand.' },
  { code: 'E471', name: 'Mono- and diglycerides', source: 'Can be from vegetable or animal fat. Most major brands now use vegetable.' },
  { code: 'E472', name: 'Esters of mono- and diglycerides', source: 'Same as E471 - check source.' },
  { code: 'E270', name: 'Lactic acid', source: 'Usually from plant fermentation (vegan). Name is misleading - "lactic" refers to milk historically but most is now plant-derived.' },
  { code: 'E422', name: 'Glycerol', source: 'Can be vegetable or animal. Vegetable glycerol is common in EU.' },
  { code: 'E1105', name: 'Lysozyme', source: 'From egg whites. Common in some cheeses.' },
]

export type HiddenIngredient = { name: string; where: string }

export const HIDDEN_NON_VEGAN_INGREDIENTS: HiddenIngredient[] = [
  { name: 'Casein / Sodium caseinate', where: 'Milk protein. In "non-dairy" creamers, protein bars, soy cheeses (sometimes).' },
  { name: 'Whey / Whey powder', where: 'Milk byproduct. In crisps, bread, chocolate, protein powders.' },
  { name: 'Lactose', where: 'Milk sugar. In medicines, sweets, baked goods.' },
  { name: 'Gelatin / Gelatine', where: 'Gummies, marshmallows, capsules, some yogurts, jelly.' },
  { name: 'Isinglass', where: 'Fish bladder. Used to clarify some beers and wines.' },
  { name: 'Carmine / Natural Red 4', where: 'Insect-derived red dye. In sweets, drinks, yogurts.' },
  { name: 'Shellac / Confectioner\'s glaze', where: 'Insect resin. Shiny coating on sweets, apples, pills.' },
  { name: 'L-Cysteine', where: 'Dough conditioner. Often from feathers or hair. In commercial bread, bagels.' },
  { name: 'Mono- and diglycerides', where: 'Emulsifier. Bread, margarine, ice cream. Check source.' },
  { name: 'Honey / Royal jelly / Propolis', where: 'Bee products. In cereals, throat lozenges, cosmetics.' },
  { name: 'Lanolin / Vitamin D3', where: 'Sheep wool grease. D3 in fortified foods is usually lanolin-derived; D2 is plant-derived.' },
  { name: 'Anchovies', where: 'Worcestershire sauce, Caesar dressing, some pasta sauces, fish sauce.' },
  { name: 'Cod liver oil / Fish oil', where: 'Supplements, some omega-3 fortified products.' },
  { name: 'Albumen / Albumin', where: 'Egg white protein. In some wines, baked goods.' },
  { name: 'Tallow / Suet / Lard', where: 'Animal fat. In some fries, pastries, refried beans.' },
]
