#!/usr/bin/env tsx
/**
 * Translate non-Latin city names to English and fix mojibake/encoding errors.
 * Fetches all distinct non-Latin city names from DB at runtime (avoids copy-paste
 * encoding mismatches), then looks each up in the translation table by normalized key.
 *
 * Usage:
 *   npx tsx scripts/fix-city-languages.ts --dry-run   # preview
 *   npx tsx scripts/fix-city-languages.ts             # apply
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DRY_RUN = process.argv.includes('--dry-run');

// Strip all combining marks (Latin U+0300-U+036F and Arabic U+064B-U+065F),
// lowercase, collapse whitespace — same key used in audit-city-names.ts.
function normKey(s: string): string {
  return s.normalize('NFD')
    .replace(/[̀-ًͯ-ٟ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Translation table keyed by normKey(city).
// Values are the correct English city name to use.
const BY_NORM: Record<string, string> = {
  // Arabic
  [normKey('الإسكندرية')]: 'Alexandria',
  [normKey('أبو ظبي')]: 'Abu Dhabi',
  [normKey('أبوظبي')]: 'Abu Dhabi',
  [normKey('دبي')]: 'Dubai',
  [normKey('ديرة')]: 'Dubai',
  [normKey('أبراج بحيرات الجميرا')]: 'Dubai',
  [normKey('المزهر 2')]: 'Dubai',
  [normKey('البرشاء جنوب')]: 'Dubai',
  [normKey('مجمع التقنية بدبي')]: 'Dubai',
  [normKey('السمحة')]: 'Abu Dhabi',
  [normKey('جبل حفيت')]: 'Al Ain',
  [normKey('ولاية بوشر')]: 'Muscat',
  [normKey('مدينة الشارقة')]: 'Sharjah',
  [normKey('رأس الخيمة')]: 'Ras Al Khaimah',
  [normKey('أم القيوين')]: 'Umm Al Quwain',
  [normKey('أربيل')]: 'Erbil',
  [normKey('سلیمانی')]: 'Sulaymaniyah',
  [normKey('مشهد')]: 'Mashhad',
  [normKey('تهران')]: 'Tehran',
  [normKey('کرج')]: 'Karaj',
  [normKey('سنندج')]: 'Sanandaj',
  [normKey('دهستان طرقبه')]: 'Mashhad',
  [normKey('دهستان نیوان')]: 'Ardabil',
  [normKey('دهستان سده')]: 'Isfahan',
  [normKey('دهستان جوکار')]: 'Malayer',
  [normKey('دهستان حومه شرقی')]: 'Zabol',
  [normKey('دهستان بالاخیابان لیتکوه')]: 'Amol',
  [normKey('آبسرد')]: 'Absar',
  [normKey('خليج نبق')]: 'Nabq Bay',
  [normKey('جرينة')]: 'Jreena',
  [normKey('قريه البعيرات')]: 'Al Ain',
  [normKey('حي سوق المال')]: 'Riyadh',
  [normKey('مهذب')]: 'Damascus',
  [normKey('سلام')]: 'Tehran',

  // Korean
  [normKey('서울특별시')]: 'Seoul',
  [normKey('부산광역시')]: 'Busan',
  [normKey('청주시')]: 'Cheongju',
  [normKey('제주시')]: 'Jeju',
  [normKey('고양시')]: 'Goyang',
  [normKey('시흥시')]: 'Siheung',
  [normKey('광주광역시')]: 'Gwangju',

  // Chinese (mainland)
  [normKey('大竹县')]: 'Dazhu',
  [normKey('上海市')]: 'Shanghai',
  [normKey('广州市')]: 'Guangzhou',
  [normKey('景洪市')]: 'Jinghong',
  [normKey('思明区')]: 'Xiamen',
  [normKey('天河区')]: 'Guangzhou',
  [normKey('乌鲁木齐市')]: 'Urumqi',
  [normKey('桂林市')]: 'Guilin',
  [normKey('叠彩区')]: 'Guilin',
  [normKey('历下区')]: 'Jinan',
  [normKey('市中区')]: 'Jinan',
  [normKey('莲湖区')]: "Xi'an",
  [normKey('金牛区')]: 'Chengdu',
  [normKey('黄山市')]: 'Huangshan',
  [normKey('濮阳市')]: 'Puyang',
  [normKey('厦门市')]: 'Xiamen',
  [normKey('梧村街道')]: 'Xiamen',
  [normKey('鹿城区')]: 'Wenzhou',
  [normKey('和平区')]: 'Shenyang',
  [normKey('泰安市')]: "Tai'an",
  [normKey('宜兴市')]: 'Yixing',
  [normKey('芝罘区')]: 'Yantai',
  [normKey('南宁市')]: 'Nanning',
  [normKey('三亚市')]: 'Sanya',
  [normKey('虎跳峡镇')]: 'Tiger Leaping Gorge',
  [normKey('秦淮区')]: 'Nanjing',
  [normKey('文昌市')]: 'Wenchang',
  [normKey('顺德区')]: 'Foshan',
  [normKey('开福区')]: 'Changsha',
  [normKey('嘉莲街道')]: 'Xiamen',
  [normKey('七里半')]: 'Zhangjiajie',

  // Traditional Chinese (Taiwan/HK)
  [normKey('高雄市')]: 'Kaohsiung',
  [normKey('臺中市')]: 'Taichung',
  [normKey('臺南市')]: 'Tainan',
  [normKey('新竹縣')]: 'Hsinchu',
  [normKey('香港')]: 'Hong Kong',

  // Japanese
  [normKey('富士河口湖町')]: 'Fujikawaguchiko',
  [normKey('川崎市')]: 'Kawasaki',
  [normKey('福岡市')]: 'Fukuoka',
  [normKey('本部町')]: 'Motobu',
  [normKey('金沢市')]: 'Kanazawa',
  [normKey('船橋市')]: 'Funabashi',
  [normKey('逗子市')]: 'Zushi',
  [normKey('糸島市')]: 'Itoshima',
  [normKey('読谷村')]: 'Yomitan',
  [normKey('横浜市')]: 'Yokohama',
  [normKey('京都市')]: 'Kyoto',
  [normKey('新宿区')]: 'Tokyo',
  [normKey('渋谷区')]: 'Tokyo',
  [normKey('杉並区')]: 'Tokyo',
  [normKey('台東区')]: 'Tokyo',
  [normKey('世田谷区')]: 'Tokyo',
  [normKey('那覇市')]: 'Naha',
  [normKey('沖縄市')]: 'Okinawa City',
  [normKey('北中城村')]: 'Kitanakagusuku',
  [normKey('西原町')]: 'Nishihara',
  [normKey('北谷町')]: 'Chatan',

  // Cyrillic
  [normKey('Мінск')]: 'Minsk',
  [normKey('Гродна')]: 'Grodno',
  [normKey('Прыгарадны сельскі Савет')]: 'Minsk',
  [normKey('Варна')]: 'Varna',
  [normKey('Пловдив')]: 'Plovdiv',
  [normKey('Шумен')]: 'Shumen',
  [normKey('Близнаци')]: 'Bliznaci',
  [normKey('Алматы')]: 'Almaty',
  [normKey('Бишкек')]: 'Bishkek',
  [normKey('ниш медијана')]: 'Niš',
  [normKey('Ниш')]: 'Niš',
  [normKey('Прилеп')]: 'Prilep',

  // Greek
  [normKey('Καλλιθεα')]: 'Kallithea',
  [normKey('Ναυπλιο')]: 'Nafplio',
  [normKey('Αργυρούπολη')]: 'Argyroupoli',
  [normKey('Νεα Ιωνια')]: 'Nea Ionia',
  [normKey('Ρόδος')]: 'Rhodes',
  [normKey('Μυτιληνη')]: 'Mytilene',
  [normKey('Παιανια')]: 'Paiania',
  [normKey('Νεα Φιλαδελφεια')]: 'Nea Filadelfia',
  [normKey('Κορωπι')]: 'Koropi',
  [normKey('Παλληνη')]: 'Pallini',
  [normKey('Αχαρνες')]: 'Acharnes',
  [normKey('Νεο Ηρακλειο')]: 'Neo Iraklio',
  [normKey('Απολλωνια')]: 'Apollonia',
  [normKey('Καλλιοπη')]: 'Kalliopi',
  [normKey('Ερετρια')]: 'Eretria',
  [normKey('Π. Φαληρο')]: 'Palaio Faliro',
  [normKey('Κιατο')]: 'Kiato',
  [normKey('Ανω Λιοσια')]: 'Ano Liosia',
  [normKey('Γουβια')]: 'Gouvia',
  [normKey('Ροδα')]: 'Roda',
  [normKey('Οια')]: 'Oia',
  [normKey('Ορμος Αιγιαλης')]: 'Ormos Aegialis',

  // Hebrew
  [normKey('יוקנעם עילית')]: 'Yokneam Illit',
  [normKey('קרית שמונה')]: 'Kiryat Shmona',
  [normKey('תל מונד')]: 'Tel Mond',
  [normKey('ראשון לציון')]: 'Rishon LeZion',
  [normKey('יסודות')]: 'Yesodot',

  // Lao
  [normKey('ວຽງຈັນ')]: 'Vientiane',
  [normKey('ວຽງແກ້ວ')]: 'Vang Vieng',
  [normKey('ເມືອງປາກເຊ')]: 'Pakse',
  [normKey('ຄອນເຫນືອ')]: 'Khon Nuea',
  [normKey('ວຽງໄຊ')]: 'Vieng Xai',
  [normKey('ຫົວຊຽງ')]: 'Huachiang',

  // Nepali
  [normKey('काठमाडौँ महानगरपालिका')]: 'Kathmandu',
  [normKey('ललितपुर')]: 'Lalitpur',
  [normKey('खुम्बु पासाङल्हामु गाउँपालिका')]: 'Khumbu Pasanglhamu',

  // Vietnamese district-level → city
  [normKey('Phường Lâm Viên - Đà Lạt')]: 'Da Lat',
  [normKey('Phường Cam Ly - Đà Lạt')]: 'Da Lat',
  [normKey('Phường Lang Biang - Đà Lạt')]: 'Da Lat',

  // Burmese
  [normKey('ပုဂံ')]: 'Bagan',
  [normKey('မြပြင်')]: 'Myaing',
  [normKey('လက်ပန်လှရွာ')]: 'Laik Pan La Village',

  // Bengali
  [normKey('দিনাজপুর শহর')]: 'Dinajpur',
  [normKey('ঢাকা')]: 'Dhaka',

  // Khmer
  [normKey('ភូមិ​គ្រួស')]: 'Phoum Kruos',
  [normKey('ខណ្ឌចំការមន')]: 'Phnom Penh',

  // Georgian
  [normKey('ასპინძა')]: 'Aspindza',
  [normKey('თოხლიაური')]: 'Tokhlilauri',

  // Armenian
  [normKey('Գյումրի')]: 'Gyumri',
  [normKey('Դիլիջան')]: 'Dilijan',

  // Japanese (additional districts/cities)
  [normKey('千代田区')]: 'Tokyo',
  [normKey('石景山区')]: 'Beijing',
  [normKey('目黒区')]: 'Tokyo',
  [normKey('港区')]: 'Tokyo',
  [normKey('大田区')]: 'Tokyo',
  [normKey('武蔵野市')]: 'Musashino',
  [normKey('富士吉田市')]: 'Fujiyoshida',
  [normKey('札幌市')]: 'Sapporo',
  [normKey('大阪市')]: 'Osaka',
  [normKey('広島市')]: 'Hiroshima',
  [normKey('神山町')]: 'Kamiyama',

  // Chinese+Uyghur combined form
  [normKey('乌鲁木齐市 ئۈرۈمچى')]: 'Urumqi',

  // Chinese (additional)
  [normKey('成都市')]: 'Chengdu',
  [normKey('成都')]: 'Chengdu',
  [normKey('台怀镇')]: 'Wutai Mountain',
  [normKey('闵行区')]: 'Shanghai',
  [normKey('深圳市')]: 'Shenzhen',
  [normKey('石景山区')]: 'Beijing',
  [normKey('昭通市')]: 'Zhaotong',

  // Traditional Chinese (additional Taiwan)
  [normKey('彰化縣')]: 'Changhua',
  [normKey('花蓮縣')]: 'Hualien',
  [normKey('南投縣')]: 'Nantou',
  [normKey('嘉義縣')]: 'Chiayi',
  [normKey('宜蘭縣')]: 'Yilan',

  // Kurdish (Sorani) — different from Arabic سلیمانی
  [normKey('سلێمانی')]: 'Sulaymaniyah',

  // Arabic (additional)
  [normKey('نخلة جميرا')]: 'Dubai',       // Palm Jumeirah
  [normKey('شیراز')]: 'Shiraz',
  [normKey('رام الله')]: 'Ramallah',
  [normKey('بيروت')]: 'Beirut',
  [normKey('صيدا')]: 'Sidon',
  [normKey('خميس مشيط')]: 'Khamis Mushait',
  [normKey('الثنية 5')]: 'Al Thaniyah',
  [normKey('دهستان سخت سر')]: 'Sari',
  [normKey('دهستان لیالستان')]: 'Langarud',

  // Hebrew (additional)
  [normKey('רחובות')]: 'Rehovot',
  [normKey('תל אביב')]: 'Tel Aviv',

  // Lao (additional)
  [normKey('ຈູມຄ້ອງ')]: 'Chomphet',

  // Greek (additional)
  [normKey('Χανια')]: 'Chania',
  [normKey('Κυθηρα')]: 'Kythira',
  [normKey('Νεο Ψυχικο')]: 'Neo Psychiko',

  // Georgian (additional)
  [normKey('ბათუმი')]: 'Batumi',

  // Cyrillic (additional)
  [normKey('Лозовое')]: 'Lozove',
  [normKey('Каракол')]: 'Karakol',
  [normKey('Скопjе')]: 'Skopje',

  // Thai
  [normKey('เทศบาลนครเกาะสมุย')]: 'Koh Samui',
  [normKey('ต.บ่อผุด')]: 'Koh Samui',
  [normKey('แขวงบางบำหรุ')]: 'Bangkok',
  [normKey('มาบฟักทอง')]: 'Rayong',

  // Nepali (additional)
  [normKey('इटहरी उपमहानगरपालिका')]: 'Itahari',

  // Vietnamese district-level → city (additional)
  [normKey('Phường Nam Gia Nghĩa')]: 'Gia Nghia',
  [normKey('Phường Định Công')]: 'Hanoi',
  [normKey('Phường An Hội')]: 'Hoi An',

  // UAE
  [normKey('Kalba')]: 'Kalba',

  // Latin-extended city names that should be ASCII (per project policy):
  // strip diacritics for consistent English display
  [normKey('Wrocław')]: 'Wroclaw',
  [normKey('Łódź')]: 'Lodz',
  [normKey('Kraków')]: 'Krakow',
  [normKey('Gdańsk')]: 'Gdansk',
  [normKey('Poznań')]: 'Poznan',
  [normKey('Szczecin')]: 'Szczecin',  // already ASCII

  // Greek cities and suburbs
  [normKey('Αθηνα')]: 'Athens',
  [normKey('Δημος Αθηναιων')]: 'Athens',
  [normKey('Δημοτικη Ενοτητα Θεσαλονικης')]: 'Thessaloniki',
  [normKey('Θεσσαλονικη')]: 'Thessaloniki',
  [normKey('Χαλανδρι')]: 'Chalandri',
  [normKey('Μαρουσι')]: 'Maroussi',
  [normKey('Γλυφαδα')]: 'Glyfada',
  [normKey('Αγιος Δημητριος')]: 'Agios Dimitrios',
  [normKey('Δημος Πειραιως')]: 'Piraeus',
  [normKey('Πειραιας')]: 'Piraeus',
  [normKey('Δημοτικη Ενοτητα Ταυρου')]: 'Tavros',
  [normKey('Αγια Παρασκευη')]: 'Agia Paraskevi',
  [normKey('Δημοτικη Ενοτητα Μελισσιων')]: 'Melissia',
  [normKey('Νεα Ερυθραια')]: 'Nea Erythrea',
  [normKey('Δημοτικη Ενοτητα Πατρεων')]: 'Patras',
  [normKey('Δημος Καλλιθεας')]: 'Kallithea',
  [normKey('Ζωγραφου')]: 'Zografou',
  [normKey('Δημοτικη Ενοτητα Αγιας')]: 'Agia',
  [normKey('Αιδηψος')]: 'Aidipsos',
  [normKey('Δημοτικη Ενοτητα Λαγανα')]: 'Laganas',
  [normKey('Χαλκιδα')]: 'Chalkida',
  [normKey('Ιλιον')]: 'Ilion',
  [normKey('Δημοτικη Ενοτητα Λυκοβρυσεως')]: 'Lykovrysi',
  [normKey('Αιγαλεω')]: 'Egaleo',
  [normKey('Δημοτικη Ενοτητα Ναυπακτου')]: 'Nafpaktos',
  [normKey('Νεα Ζωη')]: 'Nea Zoi',
  [normKey('Δημοτικη Ενοτητα Βαρης')]: 'Vari',
  [normKey('Γαλατσι')]: 'Galatsi',
  [normKey('Ανοιξη')]: 'Anoixi',
  [normKey('Δημοτικη Ενοτητα Χολαργου')]: 'Cholargos',
  [normKey('Δημοτικη Ενοτητα Μηλεων')]: 'Milies',
  [normKey('Αφιωνας')]: 'Afionas',
  [normKey('Δημοτικη Ενοτητα Σπαρτιατων')]: 'Sparti',
  [normKey('Δημοτικη Ενοτητα Αγιου Ιωαννου Ρεντη')]: 'Agios Ioannis Rentis',
  [normKey('Δημοτικη Ενοτητα Ιτεας')]: 'Itea',
  [normKey('Δημοτικη Ενοτητα Λαυρεωτικης')]: 'Lavrio',
  [normKey('Σεριφος')]: 'Serifos',
  [normKey('Δημοτικη Ενοτητα Ερισου')]: 'Erissos',
  [normKey('Καστρακι')]: 'Kastraki',
  [normKey('Δημοτικη Ενοτητα Νεας Φιλαδελφειας')]: 'Nea Filadelfia',
  [normKey('Εξανθεια')]: 'Exanthia',
  [normKey('Αλιστρατη')]: 'Alistrati',
  [normKey('Λακκα')]: 'Lakka',
  [normKey('Αμαρυνθος')]: 'Amarynthos',
  [normKey('Δημοτικη Ενοτητα Ραφηνας')]: 'Rafina',
  [normKey('Δημοτικη Ενοτητα Αρχαιας Ολυμπιας')]: 'Ancient Olympia',
  [normKey('Δημοτικη Ενοτητα Συκεων')]: 'Sykies',
  [normKey('Κρηστωνη')]: 'Krestoni',
  [normKey('Κουμπελης')]: 'Koumpelis',
  [normKey('Δημοτικη Ενοτητα Αχαρνων')]: 'Acharnes',
  [normKey('Ηρακλειο')]: 'Heraklion',
  [normKey('Ταλαντα')]: 'Atalanti',
  [normKey('Ιουλιδα')]: 'Ioulis',
  [normKey('Παλαιο Φαληρο')]: 'Palaio Faliro',
  [normKey('Δημοτικη Ενοτητα Ασινης')]: 'Asini',
  [normKey('Αγιος Στεφανος')]: 'Agios Stefanos',
  [normKey('Κουρνας')]: 'Kournas',
  [normKey('Δημοτικη Ενοτητα Νεας Χαλκηδονας')]: 'Nea Chalkidona',
  [normKey('Δημοτικη Ενοτητα Σπατων - Λουτσας')]: 'Spata',
  [normKey('Δημοτικη Ενοτητα Πυλαιας')]: 'Pylaia',
  [normKey('Δημοτικη Ενοτητα Ζαγορας')]: 'Zagora',
  [normKey('Δημοτικη Ενοτητα Ροδου')]: 'Rhodes',
  [normKey('Δημοτικη Ενοτητα Κυπαρισσιας')]: 'Kyparissia',
  [normKey('Παλαιοκαστριτσα')]: 'Paleokastritsa',
  [normKey('Πλατυ')]: 'Plati',
  [normKey('Δημοτικη Ενοτητα Ανατολικης Μανης')]: 'Mani',
  [normKey('Δημοτικη Ενοτητα Πυλαιας')]: 'Pylaia',
  [normKey('Δημοτικη Ενοτητα Βουλας')]: 'Voula',
  [normKey('Δημος Καλαματας')]: 'Kalamata',
  [normKey('Δημοτικη Ενοτητα Κορινθιων')]: 'Corinth',
  [normKey('Δημοτικη Ενοτητα Αργυρουπολης')]: 'Argyroupoli',
  [normKey('Δημοτικη Ενοτητα Νεου Ψυχικου')]: 'Neo Psychiko',
  [normKey('Δημοτικη Ενοτητα Νικαιας')]: 'Nikaia',
  [normKey('Νικαια')]: 'Nikaia',
  [normKey('Δημοτικη Ενοτητα Λαρισαιων')]: 'Larissa',
  [normKey('Ιωαννινα')]: 'Ioannina',
  [normKey('Δημοτικη Ενοτητα Ανθηδωνος')]: 'Anthidon',
  [normKey('Δημοτικη Ενοτητα Κρυονεριου')]: 'Kryoneri',
  [normKey('Βριλησσια')]: 'Vrilissia',
  [normKey('Δημος Καλαμαριας')]: 'Kalamaria',
  [normKey('Καισαριανη')]: 'Kaisariani',
  [normKey('Δημοτικη Ενοτητα Κραννωνος')]: 'Krannona',
  [normKey('Αγια Ελενη')]: 'Agia Eleni',
  [normKey('Νεα Σμυρνη')]: 'Nea Smyrni',
  [normKey('Κερκυρα')]: 'Corfu',
  [normKey('Αγιος Νεκταριος')]: 'Agios Nektarios',
  [normKey('Δημοτικη Ενοτητα Επιδαυρου')]: 'Epidavros',
  [normKey('Ηλιουπολη')]: 'Ilioupoli',
  [normKey('Αγιος Ιωαννης')]: 'Agios Ioannis',
  [normKey('Αλιμος')]: 'Alimos',
  [normKey('Μεσαρια')]: 'Mesaria',
  [normKey('Σκαλα')]: 'Skala',
  [normKey('Δημοτικη Ενοτητα Ζακυνθιων')]: 'Zakynthos',
  [normKey('Λιβαδι')]: 'Livadi',
  [normKey('Πλακιας')]: 'Plakias',
  [normKey('Δημος Κατερινης')]: 'Katerini',
  [normKey('Δημοτικη Ενοτητα Ναυπλιεων')]: 'Nafplio',
  [normKey('Δημοτικη Ενοτητα Λαμιεων')]: 'Lamia',
  [normKey('Δημοτικη Ενοτητα Λευκτρου')]: 'Leuktra',
  [normKey('Δημοτικη Ενοτητα Πευκης')]: 'Pefki',
  [normKey('Δημοτικη Ενοτητα Καρυας')]: 'Karia',
  [normKey('Αχαραβη')]: 'Acharavi',
  [normKey('Δημοτικη Ενοτητα Βουλιαγμενης')]: 'Vouliagmeni',
  [normKey('Δημοτικη Ενοτητα Καλυβιων Θορικου')]: 'Kalyvia Thorikou',
  [normKey('Δημος Βολου')]: 'Volos',
  [normKey('Κηφισια')]: 'Kifisia',

  // Bulgarian (Cyrillic)
  [normKey('София')]: 'Sofia',
  [normKey('Банкя')]: 'Bankya',
  [normKey('Плевен')]: 'Pleven',
  [normKey('Асеновград')]: 'Asenovgrad',
  [normKey('Лешница')]: 'Leshnitsa',
  [normKey('Враца')]: 'Vratsa',

  // North Macedonian (Cyrillic)
  [normKey('Поленица')]: 'Polenica',
  [normKey('Ресен')]: 'Resen',

  // Mongolian
  [normKey('Эрдэнэт')]: 'Erdenet',

  // Ukrainian
  [normKey('Киів')]: 'Kyiv',

  // Korean (additional)
  [normKey('서귀포시')]: 'Seogwipo',
  [normKey('대구광역시')]: 'Daegu',

  // Chinese (additional)
  [normKey('珠海市')]: 'Zhuhai',
  [normKey('嘉手納町')]: 'Kadena',

  // Traditional Chinese (Taiwan, additional)
  [normKey('臺東縣')]: 'Taitung',

  // Japanese address used as city name → map to city
  [normKey('大阪市中央区北久宝寺町４-２-２ 久宝ビル１F')]: 'Osaka',

  // Khmer (additional)
  [normKey('ក្រុងសៀមរាប')]: 'Siem Reap',
  [normKey('ខណ្ឌដូនពេញ')]: 'Phnom Penh',
  [normKey('ភូមិសុវណ្ណសាគរ')]: 'Phnom Penh',
  [normKey('សង្កាត់ស្វាយប៉ោ')]: 'Phnom Penh',

  // Burmese (additional)
  [normKey('လယ်ယား')]: 'Leiwe',
  [normKey('ကျောက်တံတား')]: 'Yangon',
  [normKey('ရွှေနီကုန်း')]: 'Mandalay',

  // Nepali (additional)
  [normKey('ड्रागनाग')]: 'Khumbu',

  // Bengali (additional)
  [normKey('ফটিকছড়ি')]: 'Fatikchhari',

  // Arabic (additional)
  [normKey('الروية')]: 'Al Ruwaiya',
  [normKey('هەولێر')]: 'Erbil',
  [normKey('جيزه')]: 'Giza',

  // Thai (additional)
  [normKey('คลองม่วง')]: 'Krabi',

  // Japanese (additional)
  [normKey('墨田区')]: 'Tokyo',

  // Vietnamese (additional)
  [normKey('Châu Đốc')]: 'Chau Doc',
  [normKey('Bắc Sơn')]: 'Bac Son',

  // Hawaiian (ʻokina character)
  [normKey('Haleʻiwa')]: 'Haleiwa',

  // Abkhazian (Cyrillic)
  [normKey('Гагра')]: 'Gagra',

  // Greek (Cyprus + additional)
  [normKey('Διμυλια')]: 'Dimylia',
  [normKey('Δημοτικη Ενοτητα Λεωνιδιου')]: 'Leonidio',
  [normKey('Βυρωνας')]: 'Vyronas',
  [normKey('Δημος Παφου')]: 'Paphos',
  [normKey('Πυλα')]: 'Pyla',
  [normKey('Λεμεσος')]: 'Limassol',

  // Bulgarian (additional)
  [normKey('Орешак')]: 'Oresak',
  [normKey('Анево')]: 'Anevo',
  [normKey('Хисаря')]: 'Hisarya',
  [normKey('Сливен')]: 'Sliven',

  // Vietnamese with heavy diacritics → ASCII transliterations
  [normKey('Thuận An')]: 'Thuan An',
  [normKey('Cần Thơ')]: 'Can Tho',
  [normKey('Phan Rang – Tháp Chàm')]: 'Phan Rang',
  [normKey('Tả Van')]: 'Ta Van',
  [normKey('Điện Biên Phủ')]: 'Dien Bien Phu',
  [normKey('Bến Tre')]: 'Ben Tre',
  [normKey('Thuận Nam')]: 'Thuan Nam',
  [normKey('Ba Bể Commune')]: 'Ba Be',
  [normKey('Đồng Văn Commune')]: 'Dong Van',
  [normKey('Phường Xuân Hương - Đà Lạt')]: 'Da Lat',
  [normKey('Phường La Gi')]: 'La Gi',
  [normKey('A Lưới 2 Commune')]: 'A Luoi',
};

// Exact-string overrides for mojibake/garbled encodings that normKey can't help with
const EXACT: Record<string, string> = {
  'WrocÅ‚aw': 'Wroclaw',
  'æ¡‚æž—': 'Guilin',
  'æ¡‚æž— ': 'Guilin',
  '香港 Hong Kong': 'Hong Kong',
  "乌鲁木齐市 ئۈرۈمچى": 'Urumqi',
  // Special chars / apostrophes — all Unicode apostrophe variants
  "Be'er-Sheva": 'Beersheba',     // U+0027 apostrophe
  "Be’er-Sheva": 'Beersheba', // U+2019 right single quotation mark
  "Beʼer-Sheva": 'Beersheba', // U+02BC modifier letter apostrophe
  "Be׳er-Sheva": 'Beersheba',     // U+05F3 Hebrew geresh
  "Be‘er-Sheva": 'Beersheba', // U+2018 left single quotation mark
  'Salzburg – Aigen': 'Salzburg',  // em-dash
  'Salzburg – Aigen': 'Salzburg',
  'Cкoпje': 'Skopje',
  'Kalba كلباء': 'Kalba',
};

function hasNonLatin(s: string): boolean {
  // Allow full Latin extended range (U+0000–U+024F), common punctuation, digits
  return /[^ -ɏ\s\-'.,()&/0-9]/.test(s);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Fetch all distinct city names
  const map = new Map<string, number>();
  let from = 0;
  while (true) {
    const { data } = await sb.from('places').select('city').is('archived_at', null)
      .not('city', 'is', null).range(from, from + 999);
    if (!data?.length) break;
    for (const r of data) map.set(r.city, (map.get(r.city) ?? 0) + 1);
    if (data.length < 1000) break;
    from += 1000;
    process.stdout.write(`\r  ${from}...`);
  }
  console.log(`\nLoaded ${map.size} distinct city names`);

  // Find non-Latin cities and match against translation table
  const toRename: Array<{ from: string; to: string; count: number }> = [];
  const unmatched: Array<{ city: string; count: number }> = [];

  for (const [city, count] of map) {
    // Check exact overrides first — also try normalizing fancy apostrophes/quotes
    const cityNormApos = city.replace(/[''׳ʻʼ]/g, "'");
    if (EXACT[city] || EXACT[cityNormApos]) {
      toRename.push({ from: city, to: EXACT[city] ?? EXACT[cityNormApos], count });
      continue;
    }
    if (!hasNonLatin(city)) continue;
    const key = normKey(city);
    const english = BY_NORM[key];
    if (english) {
      toRename.push({ from: city, to: english, count });
    } else {
      unmatched.push({ city, count });
    }
  }

  toRename.sort((a, b) => b.count - a.count);
  unmatched.sort((a, b) => b.count - a.count);

  console.log(`\nTo rename: ${toRename.length} city names (${toRename.reduce((s,r)=>s+r.count,0)} places)`);
  for (const r of toRename) {
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}"${r.from}" (${r.count}) → "${r.to}"`);
  }

  if (unmatched.length) {
    console.log(`\nNo translation found for ${unmatched.length} non-Latin names:`);
    for (const u of unmatched) console.log(`  ${u.count.toString().padStart(4)}  "${u.city}"`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Remove --dry-run to apply.');
    return;
  }

  let totalRenamed = 0;
  for (const r of toRename) {
    const { data, error } = await sb.from('places')
      .update({ city: r.to, updated_at: new Date().toISOString() })
      .eq('city', r.from).is('archived_at', null).select('id');
    if (error) { console.error(`  error: ${error.message}`); continue; }
    totalRenamed += data?.length ?? 0;
  }
  console.log(`\nDone. ${totalRenamed} places renamed.`);
}

main().catch(console.error);
