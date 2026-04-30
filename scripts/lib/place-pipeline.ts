/**
 * Shared place-pipeline library.
 * Used by import-osm-countries.ts, add-place.ts, and import-places skill.
 */
import { config } from 'dotenv'; config({ path: '.env.local' });

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OsmPlace {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

export interface PlaceRecord {
  name: string;
  category: 'eat' | 'hotel' | 'store' | 'organisation' | 'event';
  latitude: number;
  longitude: number;
  vegan_level: 'fully_vegan' | 'vegan_friendly';
  address: string;
  city: string | null;
  country: string;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  cuisine_types: string[] | null;
  images: string[];
  main_image_url?: string | null;
  description?: string | null;
  source: string;
  source_id: string;
  slug: string;
  tags: string[];
  created_by?: string;
}

export interface GeoResult {
  lat: number;
  lng: number;
  display_name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
export const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Chains excluded per Platonic-form-is-vegan policy
// A chain belongs on PlantsPack if the Platonic form of what it sells is plant-based.
// Excluded: animal-centric Platonic form (burger, pizza, fried chicken, steak, seafood).
export const EXCLUDED_CHAINS = new Set([
  "mcdonald's", 'mcdonalds', 'burger king', 'kfc',
  'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'little caesars', 'taco bell', 'wendy', "wendy's", 'popeyes',
  'hardees', "hardee's", "arby's", 'arbys', 'dairy queen',
  'pressbyrån', 'pressbyran', '7-eleven', '7eleven',
  'ikea restaurang', 'ikea bistro', 'biltema cafe', 'biltema café',
  'pinchos', 'texas longhorn', 'steak house', 'blackstone steakhouse',
  'hesburger', 'kotipizza',
  "t.g.i. friday's", 'fridays', 'harvester', 'hungry horse',
  "nando's", 'nandos', 'max hamburgare', 'max',
  'pizzabakeren', 'papa murphys', "papa murphy's",
]);

// Bilingual / administrative city name overrides
export const CITY_OVERRIDES: Record<string, string> = {
  // Belgium
  'bruxelles - brussel': 'Brussels', 'bruxelles': 'Brussels', 'brussel': 'Brussels',
  'liege': 'Liège', 'luik': 'Liège',
  'gent': 'Ghent', 'antwerpen': 'Antwerp', 'brugge': 'Bruges',
  'ixelles - elsene': 'Ixelles', 'saint-gilles - sint-gillis': 'Saint-Gilles',
  'schaerbeek - schaarbeek': 'Schaerbeek',
  'molenbeek-saint-jean - sint-jans-molenbeek': 'Molenbeek',
  // Germany / Austria
  'köln': 'Cologne', 'münchen': 'Munich', 'nürnberg': 'Nuremberg', 'wien': 'Vienna',
  // Denmark - English exonym for capital + strip "Kommune" suffix from municipality names
  'københavn': 'Copenhagen', 'kobenhavn': 'Copenhagen', 'koebenhavn': 'Copenhagen',
  'tonder kommune': 'Tønder', 'tønder kommune': 'Tønder',
  // Netherlands
  'den haag': "The Hague", "'s-gravenhage": "The Hague",
  // South Korea
  '서울특별시': 'Seoul', '서울': 'Seoul',
  '부산광역시': 'Busan', '부산': 'Busan',
  '대구광역시': 'Daegu', '대구': 'Daegu',
  '인천광역시': 'Incheon', '인천': 'Incheon',
  '광주광역시': 'Gwangju', '광주': 'Gwangju',
  '대전광역시': 'Daejeon', '대전': 'Daejeon',
  '울산광역시': 'Ulsan', '울산': 'Ulsan',
  '세종특별자치시': 'Sejong', '세종': 'Sejong',
  '수원시': 'Suwon', '고양시': 'Goyang', '용인시': 'Yongin',
  '창원시': 'Changwon', '성남시': 'Seongnam', '시흥시': 'Siheung',
  '전주시': 'Jeonju', '제주시': 'Jeju', '제주특별자치도': 'Jeju',
  '중앙리': 'Jeju',
  // Vietnam
  'thanh pho ho chi minh': 'Ho Chi Minh City', 'ho chi minh city': 'Ho Chi Minh City',
  'thành phố hồ chí minh': 'Ho Chi Minh City',
  'thu đuc': 'Ho Chi Minh City', 'thu duc': 'Ho Chi Minh City',
  'thuan an': 'Ho Chi Minh City',
  'thanh pho ha noi': 'Hanoi', 'ha noi': 'Hanoi', 'hà nội': 'Hanoi',
  'thanh pho đa nang': 'Da Nang', 'đa nang': 'Da Nang', 'da nang': 'Da Nang',
  'phuong sa pa': 'Sapa', 'sa pa': 'Sapa',
  'phuong ngu hanh son': 'Da Nang',
  'hoi an': 'Hoi An', 'hội an': 'Hoi An',
  'can tho': 'Can Tho', 'cần thơ': 'Can Tho',
  'nha trang': 'Nha Trang', 'vung tau': 'Vung Tau',
  'da lat': 'Da Lat', 'đà lạt': 'Da Lat',
  'hue': 'Hue', 'huế': 'Hue',
  // Egypt
  'القاهرة': 'Cairo', 'الإسكندرية': 'Alexandria', 'إسكندرية': 'Alexandria',
  'الجيزة': 'Giza', 'الأقصر': 'Luxor', 'أسوان': 'Aswan',
  'شرم الشيخ': 'Sharm El Sheikh', 'الغردقة': 'Hurghada',
  // Morocco
  'الرباط': 'Rabat', 'الدار البيضاء': 'Casablanca', 'مراكش': 'Marrakesh',
  'فاس': 'Fes', 'طنجة': 'Tangier', 'أكادير': 'Agadir',
  'fes medina': 'Fes',
  // Kenya / Africa
  'nairobi city': 'Nairobi',
  'dar es salaaam': 'Dar es Salaam', 'dar es salaam': 'Dar es Salaam',
  // Hong Kong
  '尖沙咀 tsim sha tsui': 'Tsim Sha Tsui', 'tsim sha tsui': 'Tsim Sha Tsui',
  // Latin America common district → city
  'miraflores': 'Lima', 'barranco': 'Lima', 'yanahuara': 'Arequipa',
  'nunoa': 'Santiago', 'nuñoa': 'Santiago', 'providencia': 'Santiago',
  'las condes': 'Santiago',
  'ciudad satelite': 'Santa Cruz de la Sierra',
  // Indonesia — Nominatim sometimes appends ", Bali" or returns districts
  'denpasar, bali': 'Denpasar', 'denpasar selatan': 'Denpasar',
  'kecamatan kuta': 'Kuta', 'kuta, bali': 'Kuta', 'kuta selatan': 'Kuta',
  'seminyak': 'Seminyak', 'seminyak, bali': 'Seminyak',
  'ubud, bali': 'Ubud', 'gianyar': 'Ubud',
  'canggu, bali': 'Canggu',
  'kota jakarta pusat': 'Jakarta', 'kota jakarta selatan': 'Jakarta',
  'kota jakarta utara': 'Jakarta', 'kota jakarta barat': 'Jakarta',
  'kota jakarta timur': 'Jakarta', 'jakarta pusat': 'Jakarta',
  'daerah khusus ibukota jakarta': 'Jakarta',
  'kota yogyakarta': 'Yogyakarta', 'yogyakarta city': 'Yogyakarta',
  'kota surabaya': 'Surabaya', 'kota bandung': 'Bandung',
  'kota medan': 'Medan', 'kota makassar': 'Makassar',
  // Philippines — Nominatim returns "City of X" or "X City"
  'city of manila': 'Manila', 'city of cebu': 'Cebu', 'cebu city': 'Cebu',
  'city of davao': 'Davao', 'davao city': 'Davao',
  'quezon city': 'Quezon City', 'makati': 'Manila', 'taguig': 'Manila',
  'pasig': 'Manila', 'marikina': 'Manila', 'san juan': 'Manila',
  'muntinlupa': 'Manila', 'balabag boracay': 'Boracay', 'boracay': 'Boracay',
  'buho': 'El Nido',
  // Malaysia
  'george town': 'Penang', 'georgetown': 'Penang',
  'johor bahru': 'Johor Bahru', 'johor bahru city': 'Johor Bahru',
  'kota kinabalu': 'Kota Kinabalu', 'kuching': 'Kuching',
  'shah alam': 'Shah Alam', 'petaling jaya': 'Petaling Jaya',
  // UAE — Arabic + district names
  'emirate of dubai': 'Dubai', 'dubai city': 'Dubai',
  'emirate of abu dhabi': 'Abu Dhabi', 'abu dhabi city': 'Abu Dhabi',
  'دبي': 'Dubai', 'وادي الصفا 4': 'Dubai', 'وادي الصفا': 'Dubai',
  'أبوظبي': 'Abu Dhabi', 'أبو ظبي': 'Abu Dhabi',
  'الشارقة': 'Sharjah', 'عجمان': 'Ajman', 'رأس الخيمة': 'Ras Al Khaimah',
  // Turkey — Istanbul districts + province names
  'i̇stanbul': 'Istanbul', 'istanbul (europe)': 'Istanbul',
  'beyoglu': 'Istanbul', 'beyoğlu': 'Istanbul',
  'kadikoy': 'Istanbul', 'kadıköy': 'Istanbul',
  'sisli': 'Istanbul', 'şişli': 'Istanbul',
  'uskudar': 'Istanbul', 'üsküdar': 'Istanbul',
  'besiktas': 'Istanbul', 'beşiktaş': 'Istanbul',
  'fatih': 'Istanbul', 'bayrampasa': 'Istanbul',
  'silivri': 'Istanbul',
  'i̇zmir': 'Izmir', 'i̇zmir province': 'Izmir', 'izmir province': 'Izmir',
  'antalya province': 'Antalya', 'ankara province': 'Ankara',
  'muğla': 'Mugla', 'fethiye': 'Fethiye',
  // Israel — Nominatim returns Hebrew city names
  'תל אביב-יפו': 'Tel Aviv', 'תל אביב': 'Tel Aviv',
  'ירושלים | القدس': 'Jerusalem', 'ירושלים': 'Jerusalem',
  'חיפה': 'Haifa', 'רחובות': 'Rehovot', 'נתניה': 'Netanya',
  'יוקנעם עילית': 'Yokneam', 'ערד': 'Arad', 'באר שבע': 'Beer Sheva',
  'אילת': 'Eilat', 'רמת גן': 'Ramat Gan', 'פתח תקווה': 'Petah Tikva',
  // Jordan — Arabic city names
  'البتراء': 'Petra', 'عمان': 'Amman', 'اربد': 'Irbid', 'إربد': 'Irbid',
  'منطقة وادي السير': 'Amman', 'قرية وادي رم': 'Wadi Rum',
  'العقبة': 'Aqaba', 'الزرقاء': 'Zarqa',
  // Morocco — Nominatim returns trilingual names (French + Tifinagh + Arabic)
  'marrakech ⵎⵕⵕⴰⴽⵯⵛ مراكش': 'Marrakech', 'essaouira الصويرة': 'Essaouira',
  'rabat ⵔⴱⴰⵟ الرباط': 'Rabat', 'casablanca الدار البيضاء ⴰⵏⴼⴰ': 'Casablanca',
  'fès فاس': 'Fez', 'meknès مكناس': 'Meknes', 'agadir ⴰⴳⴰⴷⵉⵔ': 'Agadir',
  'tanger ⵜⴰⵏⵊⴰ طنجة': 'Tangier',
  // Egypt — Nominatim returns Arabic for Alexandria and some districts
  'الإسكندرية': 'Alexandria', 'سلام': 'Cairo', 'الجونة': 'El Gouna',
  'خليج نبق': 'Nabq', 'الغردقة': 'Hurghada', 'القاهرة': 'Cairo',
  // China — Nominatim returns district names (区) and city suffixes (市)
  '上海市': 'Shanghai', '北京市': 'Beijing', '昆明市': 'Kunming',
  '龙岩市': 'Longyan', '大理市': 'Dali', '姑苏区': 'Suzhou',
  '昌平区': 'Beijing', '东城区': 'Beijing', '朝阳区': 'Beijing',
  '龙华区': 'Shenzhen', '福田区': 'Shenzhen', '南山区': 'Shenzhen',
  '浦东新区': 'Shanghai', '静安区': 'Shanghai', '徐汇区': 'Shanghai',
  '海淀区': 'Beijing', '西城区': 'Beijing', '丰台区': 'Beijing',
  // Lebanon
  'بيروت': 'Beirut', 'صيدا': 'Sidon', 'طرابلس': 'Tripoli',
  // India — city name normalization
  'bangalore': 'Bengaluru',
  'ernakulam': 'Kochi',
  // Japan — Nominatim returns ward names (区) for Tokyo and city suffixes (市)
  '京都市': 'Kyoto', '大阪市': 'Osaka', '札幌市': 'Sapporo', '名古屋市': 'Nagoya',
  '福岡市': 'Fukuoka', '仙台市': 'Sendai', '横浜市': 'Yokohama', '神戸市': 'Kobe',
  '広島市': 'Hiroshima', '浦安市': 'Urayasu',
  // Tokyo wards → Tokyo
  '千代田区': 'Tokyo', '中央区': 'Tokyo', '港区': 'Tokyo', '新宿区': 'Tokyo',
  '文京区': 'Tokyo', '台東区': 'Tokyo', '墨田区': 'Tokyo', '江東区': 'Tokyo',
  '品川区': 'Tokyo', '目黒区': 'Tokyo', '大田区': 'Tokyo', '世田谷区': 'Tokyo',
  '渋谷区': 'Tokyo', '中野区': 'Tokyo', '杉並区': 'Tokyo', '豊島区': 'Tokyo',
  '荒川区': 'Tokyo', '板橋区': 'Tokyo', '練馬区': 'Tokyo',
  '足立区': 'Tokyo', '葛飾区': 'Tokyo', '江戸川区': 'Tokyo',
  // Taiwan — Nominatim returns Traditional Chinese city/county names
  '臺北市': 'Taipei', '台北市': 'Taipei',
  '新北市': 'New Taipei', '新北市': 'New Taipei',
  '臺中市': 'Taichung', '台中市': 'Taichung',
  '臺南市': 'Tainan', '台南市': 'Tainan',
  '高雄市': 'Kaohsiung',
  '桃園市': 'Taoyuan',
  '新竹市': 'Hsinchu', '新竹縣': 'Hsinchu',
  '基隆市': 'Keelung',
  '嘉義市': 'Chiayi', '嘉義縣': 'Chiayi',
  '彰化縣': 'Changhua',
  '宜蘭縣': 'Yilan',
  '花蓮縣': 'Hualien',
  '屏東縣': 'Pingtung',
  '苗栗縣': 'Miaoli',
  '南投縣': 'Nantou',
  '雲林縣': 'Yunlin',
  '澎湖縣': 'Penghu',
  '金門縣': 'Kinmen',
  '連江縣': 'Matsu',
  '臺東縣': 'Taitung', '台東縣': 'Taitung',
  // Hong Kong — Nominatim returns Chinese district names
  '中西區': 'Hong Kong', '灣仔區': 'Hong Kong', '東區': 'Hong Kong',
  '南區': 'Hong Kong', '油尖旺區': 'Kowloon', '深水埗區': 'Kowloon',
  '九龍城區': 'Kowloon', '黃大仙區': 'Kowloon', '觀塘區': 'Kowloon',
  '荃灣區': 'Tsuen Wan', '屯門區': 'Tuen Mun', '元朗區': 'Yuen Long',
  '北區': 'Sheung Shui', '大埔區': 'Tai Po', '沙田區': 'Sha Tin',
  '西貢區': 'Sai Kung', '葵青區': 'Kwai Chung', '離島區': 'Lantau Island',
  '香港島': 'Hong Kong', '九龍': 'Kowloon', '新界': 'New Territories',
  // Armenia — Nominatim returns Armenian script
  'երևան': 'Yerevan', 'gyumri': 'Gyumri', 'vanadzor': 'Vanadzor',
  // Georgia — Nominatim returns Georgian script
  'თბილისი': 'Tbilisi', 'ბათუმი': 'Batumi', 'ქუთაისი': 'Kutaisi',
  // Azerbaijan — Nominatim uses Latin with diacritics
  'bakı': 'Baku', 'gəncə': 'Ganja', 'sumqayıt': 'Sumqayit',
  // Oman — Arabic
  'مسقط': 'Muscat', 'صلالة': 'Salalah', 'مطرح': 'Matrah',
  // Saudi Arabia — Arabic city names
  'خميس مشيط': 'Khamis Mushait', 'kamis mushaitq': 'Khamis Mushait',
  'ينبع': 'Yanbu', 'مكة': 'Mecca', 'مكة المكرمة': 'Mecca',
  'المدينة المنورة': 'Medina', 'الرياض': 'Riyadh', 'الدمام': 'Dammam',
  'جدة': 'Jeddah', 'الطائف': 'Taif', 'أبها': 'Abha',
  // Ukraine — Nominatim returns Ukrainian Cyrillic names
  'київ': 'Kyiv', 'місто київ': 'Kyiv', 'київська міська рада': 'Kyiv',
  'харків': 'Kharkiv', 'харківська міська рада': 'Kharkiv',
  'одеса': 'Odesa', 'дніпро': 'Dnipro', 'львів': 'Lviv',
  'запоріжжя': 'Zaporizhzhia', 'кривий ріг': 'Kryvyi Rih',
  'миколаїв': 'Mykolaiv', 'вінниця': 'Vinnytsia', 'херсон': 'Kherson',
  'полтава': 'Poltava', 'чернігів': 'Chernihiv', 'черкаси': 'Cherkasy',
  'суми': 'Sumy', 'хмельницький': 'Khmelnytskyi', 'житомир': 'Zhytomyr',
  'рівне': 'Rivne', 'луцьк': 'Lutsk', 'ужгород': 'Uzhhorod',
  'івано-франківськ': 'Ivano-Frankivsk', 'тернопіль': 'Ternopil',
  'чернівці': 'Chernivtsi', 'одеська міська рада': 'Odesa',
  // Serbia — Nominatim returns Cyrillic and administrative district names
  'београд': 'Belgrade', 'градска општина стари град': 'Belgrade',
  'градска општина врачар': 'Belgrade', 'градска општина палилула': 'Belgrade',
  'градска општина нови београд': 'Belgrade', 'градска општина савски венац': 'Belgrade',
  'нови сад': 'Novi Sad', 'ниш': 'Nis', 'крагујевац': 'Kragujevac',
  'суботица': 'Subotica', 'зрењанин': 'Zrenjanin', 'пирот': 'Pirot',
  'ваљево': 'Valjevo', 'шабац': 'Sabac', 'смедерево': 'Smederevo',
  'кикинда': 'Kikinda', 'лесковац': 'Leskovac', 'врање': 'Vranje',
  'општини куршумлија': 'Kursumlija', 'општини сокобања': 'Sokobanja',
  'београд (врачар)': 'Belgrade',
};

// Hard-blocked ISO codes: never import. Russia per project policy
// (see CLAUDE.md), Belarus added defensively (auth regime / sanctions).
// Both also absent from COUNTRY_NAMES below as a second layer of defense.
export const BLOCKED_COUNTRIES = new Set(['RU', 'BY'])

export const COUNTRY_NAMES: Record<string, string> = {
  // Europe
  BE: 'Belgium', NL: 'Netherlands', DE: 'Germany', GB: 'United Kingdom',
  SE: 'Sweden', FR: 'France', IT: 'Italy', ES: 'Spain', PL: 'Poland',
  AT: 'Austria', CH: 'Switzerland', DK: 'Denmark', NO: 'Norway',
  FI: 'Finland', PT: 'Portugal', CZ: 'Czech Republic', HU: 'Hungary',
  RO: 'Romania', GR: 'Greece', HR: 'Croatia', SK: 'Slovakia',
  SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia',
  BG: 'Bulgaria', LU: 'Luxembourg', UA: 'Ukraine', IE: 'Ireland',
  RS: 'Serbia', BA: 'Bosnia and Herzegovina', ME: 'Montenegro',
  MK: 'North Macedonia', AL: 'Albania', MT: 'Malta', CY: 'Cyprus',
  IS: 'Iceland',
  // Americas
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Peru',
  UY: 'Uruguay', BO: 'Bolivia', EC: 'Ecuador', CR: 'Costa Rica',
  PA: 'Panama', GT: 'Guatemala', DO: 'Dominican Republic', CU: 'Cuba',
  HN: 'Honduras', NI: 'Nicaragua', SV: 'El Salvador', BZ: 'Belize',
  JM: 'Jamaica', TT: 'Trinidad and Tobago', BB: 'Barbados', HT: 'Haiti',
  BS: 'Bahamas', GY: 'Guyana', SR: 'Suriname', PY: 'Paraguay', VE: 'Venezuela',
  // Oceania
  AU: 'Australia', NZ: 'New Zealand',
  FJ: 'Fiji', PG: 'Papua New Guinea', SB: 'Solomon Islands', VU: 'Vanuatu',
  WS: 'Samoa', TO: 'Tonga', PW: 'Palau', FM: 'Micronesia',
  // East Asia
  JP: 'Japan', TW: 'Taiwan', KR: 'South Korea', HK: 'Hong Kong', CN: 'China',
  MN: 'Mongolia',
  // SE Asia
  TH: 'Thailand', VN: 'Vietnam', ID: 'Indonesia', PH: 'Philippines',
  MY: 'Malaysia', SG: 'Singapore', KH: 'Cambodia', MM: 'Myanmar',
  LA: 'Laos', BN: 'Brunei', TL: 'Timor-Leste',
  // South Asia
  IN: 'India', LK: 'Sri Lanka', NP: 'Nepal', BD: 'Bangladesh', PK: 'Pakistan',
  MV: 'Maldives', BT: 'Bhutan',
  // Caucasus
  AM: 'Armenia', GE: 'Georgia', AZ: 'Azerbaijan',
  // Middle East
  IL: 'Israel', AE: 'United Arab Emirates', TR: 'Turkey', LB: 'Lebanon',
  JO: 'Jordan', KW: 'Kuwait', QA: 'Qatar', SA: 'Saudi Arabia', OM: 'Oman',
  BH: 'Bahrain', PS: 'Palestine', IQ: 'Iraq', IR: 'Iran',
  // Central Asia
  KZ: 'Kazakhstan', UZ: 'Uzbekistan', KG: 'Kyrgyzstan', TJ: 'Tajikistan',
  // Africa
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana',
  TZ: 'Tanzania', RW: 'Rwanda', ET: 'Ethiopia', MA: 'Morocco',
  EG: 'Egypt', UG: 'Uganda', ZW: 'Zimbabwe', SN: 'Senegal',
  CI: 'Ivory Coast', CM: 'Cameroon', MU: 'Mauritius',
  MZ: 'Mozambique', ZM: 'Zambia', MW: 'Malawi', NA: 'Namibia',
  BW: 'Botswana', MG: 'Madagascar', AO: 'Angola', CD: 'DR Congo',
  TN: 'Tunisia', DZ: 'Algeria', LY: 'Libya',
  SD: 'Sudan', SS: 'South Sudan', SO: 'Somalia', DJ: 'Djibouti',
  ER: 'Eritrea', MR: 'Mauritania', ML: 'Mali', NE: 'Niger',
  BF: 'Burkina Faso', TD: 'Chad', CF: 'Central African Republic',
  GN: 'Guinea', GW: 'Guinea-Bissau', SL: 'Sierra Leone', LR: 'Liberia',
  TG: 'Togo', BJ: 'Benin', GM: 'Gambia', CV: 'Cape Verde',
  ST: 'São Tomé and Príncipe', GQ: 'Equatorial Guinea', GA: 'Gabon',
  CG: 'Republic of the Congo', BI: 'Burundi', KM: 'Comoros',
  LS: 'Lesotho', SZ: 'Eswatini',
};

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function transliterate(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/ø/g, 'o').replace(/ł/g, 'l')
    .replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe').replace(/þ/g, 'th');
}

export function toSlug(s: string): string {
  return transliterate(s)
    .replace(/&/g, 'and').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 100);
}

/** Strip administrative suffixes and apply bilingual overrides. */
export function normalizeCity(city: string): string {
  const cleaned = city
    .replace(/\s+(distrikt|domkyrkodistrikt|kommun|stad|district|municipality|gemeinde|arrondissement|borough|county|parish)$/i, '')
    .trim();
  return CITY_OVERRIDES[cleaned.toLowerCase()] || cleaned;
}

export function isExcludedChain(name: string): boolean {
  return EXCLUDED_CHAINS.has(name.toLowerCase());
}

/** OSM tags → place category. */
export function mapOsmCategory(tags: Record<string, string>): 'eat' | 'hotel' | 'store' {
  if (tags.shop) return 'store';
  if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || tags.tourism === 'guest_house' || tags.tourism === 'apartment') return 'hotel';
  return 'eat';
}

/** Extract vegan_level from OSM diet:vegan tag. */
export function mapVeganLevel(tags: Record<string, string>): 'fully_vegan' | 'vegan_friendly' {
  if (tags['diet:vegan'] === 'only') return 'fully_vegan';
  // Pure vegetarian-only restaurants without explicit vegan=only get vegan_friendly
  return 'vegan_friendly';
}

/** Extract default tags for import-time categorisation. */
export function buildOsmTags(category: string): string[] {
  if (category === 'store') return ['vegan shop'];
  if (category === 'hotel') return ['vegan stay'];
  return [];
}

export function extractOsmImages(tags: Record<string, string>): string[] {
  const imgs: string[] = [];
  if (tags.image?.startsWith('http')) imgs.push(tags.image);
  if (tags['contact:photo']?.startsWith('http')) imgs.push(tags['contact:photo']);
  return imgs;
}

// ─── Slug generation ─────────────────────────────────────────────────────────

/** Generate a unique slug that isn't already in usedSlugs. Mutates usedSlugs. */
export function uniqueSlug(name: string, city: string | null, countryName: string, usedSlugs: Set<string>): string {
  const base = toSlug(name);
  const withCity = toSlug(`${name}-${city || countryName}`);
  let slug = !usedSlugs.has(base) ? base
    : !usedSlugs.has(withCity) ? withCity
    : `${withCity}-${Math.random().toString(36).slice(2, 6)}`;
  usedSlugs.add(slug);
  return slug;
}

// ─── Overpass / OSM ──────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

/** Widened OSM query: vegan diet tag OR vegetarian-only OR explicit vegan cuisine. */
export function buildOsmQuery(area: string): string {
  return `[out:json][timeout:180];${area};(`
    + `node["diet:vegan"~"yes|only"](area.s);way["diet:vegan"~"yes|only"](area.s);`
    + `node["diet:vegetarian"="only"](area.s);way["diet:vegetarian"="only"](area.s);`
    + `node["cuisine"="vegan"](area.s);way["cuisine"="vegan"](area.s);`
    + `);out body center;`;
}

export function buildOsmBboxQuery(s: number, w: number, n: number, e: number): string {
  const bb = `${s},${w},${n},${e}`;
  return `[out:json][timeout:180];(`
    + `node["diet:vegan"~"yes|only"](${bb});way["diet:vegan"~"yes|only"](${bb});`
    + `node["diet:vegetarian"="only"](${bb});way["diet:vegetarian"="only"](${bb});`
    + `node["cuisine"="vegan"](${bb});way["cuisine"="vegan"](${bb});`
    + `);out body center;`;
}

export async function runOverpassQuery(query: string, label: string): Promise<OsmPlace[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) { console.log(`  Retry ${attempt}/2 for ${label}...`); await sleep(60000); }
    try {
      const resp = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)',
        },
      });
      if (resp.status === 429 || resp.status === 406) {
        console.warn(`  ⚠️  Overpass rate-limited (${resp.status}), waiting 90s...`);
        await sleep(90000);
        continue;
      }
      if (!resp.ok) { console.error(`  ❌ HTTP ${resp.status} for ${label}`); return []; }
      const data = await resp.json();
      return (data.elements || []) as OsmPlace[];
    } catch (e) {
      console.error(`  ❌ Error for ${label}:`, (e as Error).message);
    }
  }
  return [];
}

/**
 * Look up an OSM node/way near a given coordinate.
 * Returns the best-matching OSM element (within 50m) or null.
 * Used by add-place to cross-reference and merge OSM data.
 */
export async function osmLookupByCoords(lat: number, lon: number, name: string): Promise<OsmPlace | null> {
  // 0.0005° ≈ 55m at mid-latitudes
  const delta = 0.0005;
  const bb = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
  const query = `[out:json][timeout:30];(node["name"](${bb});way["name"](${bb}););out body center;`;
  try {
    const elements = await runOverpassQuery(query, `OSM lookup near ${lat.toFixed(4)},${lon.toFixed(4)}`);
    if (!elements.length) return null;
    const nameLower = transliterate(name).toLowerCase();
    // Exact name match first, then fuzzy
    return elements.find(el => transliterate(el.tags?.name || '').toLowerCase() === nameLower)
      || elements.find(el => transliterate(el.tags?.name || '').toLowerCase().includes(nameLower.slice(0, 6)))
      || null;
  } catch { return null; }
}

/**
 * Merge OSM tags into an existing place payload — fills missing phone,
 * opening_hours, website, cuisine_types without overwriting existing values.
 */
export function mergeOsmData(
  payload: Partial<PlaceRecord>,
  osmTags: Record<string, string>,
  osmId: string,
): Partial<PlaceRecord> {
  return {
    ...payload,
    phone: payload.phone || osmTags.phone || osmTags['contact:phone'] || null,
    website: payload.website || osmTags.website || osmTags['contact:website'] || null,
    opening_hours: payload.opening_hours || osmTags.opening_hours || null,
    cuisine_types: payload.cuisine_types?.length
      ? payload.cuisine_types
      : osmTags.cuisine ? osmTags.cuisine.split(';').map(c => c.trim()) : null,
    source_id: osmId,
  };
}

// ─── Nominatim geocoding ──────────────────────────────────────────────────────

// Cache reverse-geocode by ~1km grid cell (lat*100, lon*100). Stores the
// full result object so callers can pick city, address, or both.
const nominatimCache = new Map<string, { city: string; address: string }>();

export interface ReverseGeocodeResult {
  city: string;       // normalized + transliterated, ready for places.city
  address: string;    // "house# road, postcode city", ready for places.address
}

/**
 * Reverse-geocode lat/lon to both a city (canonicalized) and a full
 * street-level address. Both come from the same Nominatim call, so this
 * is no more expensive than the previous city-only version.
 *
 * Always use this when OSM tags don't provide addr:street + addr:housenumber
 * (typical for diet:vegan-tagged restaurant nodes - they're usually only
 * tagged with diet info, not full street address).
 */
export async function reverseGeocode(lat: number, lon: number, delayMs = 1200): Promise<ReverseGeocodeResult> {
  const key = `${(lat * 100 | 0)},${(lon * 100 | 0)}`;
  if (nominatimCache.has(key)) return nominatimCache.get(key)!;
  await sleep(delayMs);
  try {
    // zoom=18 gets street-level detail; addressdetails=1 returns the
    // structured address object we use to build both city + full address.
    const url = `${NOMINATIM_API}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)' },
    });
    if (!resp.ok) { const empty = { city: '', address: '' }; nominatimCache.set(key, empty); return empty; }
    const data = await resp.json();
    const a = data.address || {};
    const cityRaw = a.city || a.town || a.village || a.suburb || a.municipality || '';
    const city = normalizeCity(transliterate(cityRaw));
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const postCity = [a.postcode, cityRaw].filter(Boolean).join(' ');
    const address = [street, postCity].filter((s: string) => s && s.length > 1).join(', ');
    const result = { city, address };
    nominatimCache.set(key, result);
    return result;
  } catch { const empty = { city: '', address: '' }; nominatimCache.set(key, empty); return empty; }
}

/**
 * Backwards-compatible city-only wrapper for callers that only need the
 * city (kept so existing scripts using the old shape don't break).
 */
export async function reverseGeocodeCity(lat: number, lon: number, delayMs = 1200): Promise<string> {
  const r = await reverseGeocode(lat, lon, delayMs);
  return r.city;
}

/**
 * Deterministic 1-sentence description fallback for places that didn't
 * get one from og:meta scraping. Honest by construction - we only
 * mention what we know (category, cuisine, vegan-level, city).
 *
 * Standardised so every OSM-imported place has SOME description even
 * when the website didn't supply one. Operators can Claude-improve
 * specific entries later via _fetch-places-needing-desc.ts +
 * _apply-descriptions.ts.
 */
export function buildFallbackDescription(p: {
  name: string;
  city?: string | null;
  category: string;
  vegan_level?: string | null;
  cuisine_types?: string[] | null;
  tags?: string[] | null;
}): string {
  const city = p.city ? ` in ${p.city}` : '';
  const cuisines = (p.cuisine_types || []).filter(c => c && c !== 'vegan' && c !== 'regional' && c !== 'yes')
  const cuisine = cuisines[0]?.replace(/_/g, ' ');

  // Stores
  if (p.category === 'store') {
    if (p.tags?.includes('vegan shop')) return `Shop${city} stocking vegan products and plant-based goods.`;
    return `Shop${city} with vegan items in stock.`;
  }
  // Hotels / stays
  if (p.category === 'hotel') {
    return `Stay${city} that caters to vegan guests with plant-based food options.`;
  }
  // Sanctuaries / orgs
  if (p.category === 'organisation') {
    return `Vegan organisation${city}.`;
  }

  // Eat - tier by vegan_level
  if (p.vegan_level === 'fully_vegan') {
    if (cuisine) return `100% vegan ${cuisine} spot${city} - no animal products on the menu.`;
    return `100% vegan eatery${city} - everything on the menu is plant-based.`;
  }
  if (p.vegan_level === 'mostly_vegan') {
    if (cuisine) return `Mostly vegan ${cuisine} spot${city} - the menu is plant-based with a few non-vegan items.`;
    return `Mostly vegan eatery${city} - the menu is plant-based with a few non-vegan items.`;
  }
  // vegan_friendly - default safe baseline
  if (cuisine) return `${cuisine.charAt(0).toUpperCase()}${cuisine.slice(1)} restaurant${city} with vegan options on the menu.`;
  return `Eatery${city} with vegan options on the menu.`;
}

export async function forwardGeocode(query: string, countryCode = 'gb'): Promise<GeoResult | null> {
  try {
    const url = `${NOMINATIM_API}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=${countryCode}&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any[];
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
  } catch { return null; }
}

// ─── Website enrichment ──────────────────────────────────────────────────────

const IMG_SKIP = /logo|favicon|sprite|icon|avatar|emoji|placeholder|\.svg(\?|$)/i;

/** Fetch up to maxBytes of a URL's HTML, streaming. */
async function fetchHtml(url: string, maxBytes = 60000): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!resp.ok || !resp.headers.get('content-type')?.includes('html')) return '';
  const reader = resp.body?.getReader();
  if (!reader) return resp.text();
  let html = '', bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
    bytes += value.length;
    if (html.includes('</head>') && bytes > 10000) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

/**
 * Scrape a hero image from a website — multi-path, multi-UA, size-ranked.
 * Returns the best raster image URL or null.
 */
export async function scrapeHeroImage(url: string): Promise<string | null> {
  const PATHS = ['', '/menu', '/menus', '/gallery', '/about', '/about-us', '/food'];
  const candidates = new Set<string>();

  for (const p of PATHS) {
    let pageUrl: string;
    try { pageUrl = new URL(p, url).toString(); } catch { continue; }
    try {
      const html = await fetchHtml(pageUrl);
      if (!html) continue;

      // og:image
      for (const re of [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      ]) {
        const m = html.match(re);
        if (m?.[1]?.trim()) { try { candidates.add(new URL(m[1], pageUrl).toString()); } catch {} }
      }
      // <img> tags
      const imgRe = /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = imgRe.exec(html)) !== null) {
        try {
          const abs = new URL(m[1], pageUrl).toString();
          if (!IMG_SKIP.test(abs)) candidates.add(abs);
        } catch {}
      }
      break;
    } catch {}
  }

  if (candidates.size === 0) return null;

  const list = Array.from(candidates).slice(0, 20);
  const measured: { u: string; area: number }[] = [];
  for (const u of list) {
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 PlantsPack/1.0', Accept: 'image/*' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 5000) continue;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp');
        const meta = await sharp(buf).metadata();
        if (!meta.width || !meta.height) continue;
        if (meta.width < 600 || meta.height < 300) continue;
        if (meta.width / meta.height > 6 || meta.height / meta.width > 3) continue;
        measured.push({ u, area: meta.width * meta.height });
      } catch {
        measured.push({ u, area: buf.length });
      }
    } catch {}
  }
  if (!measured.length) return null;
  measured.sort((a, b) => b.area - a.area);
  return measured[0].u;
}

/**
 * Scrape a short description from a website's og:description or meta description.
 * Returns cleaned text (max 400 chars) or null.
 */
export async function scrapeDescription(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url, 30000);
    if (!html) return null;
    // og:description
    const ogM = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,}?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{20,}?)["'][^>]+property=["']og:description["']/i);
    if (ogM?.[1]) return cleanDescription(ogM[1]);
    // meta description
    const metaM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,}?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{20,}?)["'][^>]+name=["']description["']/i);
    if (metaM?.[1]) return cleanDescription(metaM[1]);
    return null;
  } catch { return null; }
}

function cleanDescription(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 400) || null as any;
}
