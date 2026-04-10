/**
 * Translate all non-Latin city names to English
 * Usage: npx tsx scripts/translate-nonlatin-cities.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// Manual translations for all non-Latin city names
const TRANSLATIONS: Record<string, string> = {
  // Thailand
  'กรุงเทพมหานคร': 'Bangkok',
  'เทศบาลนครเชียงใหม่': 'Chiang Mai',
  'เทศบาลนครเชียงราย': 'Chiang Rai',
  'ตำบลราไวย์': 'Rawai',
  'ช้างเผือก': 'Chang Phueak',
  'ชุมพร': 'Chumphon',
  'เทศบาลนครพระนครศรีอยุธยา': 'Ayutthaya',
  'เทศบาลนครภูเก็ต': 'Phuket',
  'เทศบาลนครสุราษฎร์ธานี': 'Surat Thani',
  'บ้านโฉลกหลำ': 'Ban Chalok Lam',
  'บ้านใต้': 'Ban Tai',
  'บ้านบางรักษ์': 'Ban Bang Rak',
  'บ้านศรีธนู': 'Ban Si Thanu',
  'ยลดาวิลล์ 1': 'Koh Phangan',
  'สมุทรสาคร': 'Samut Sakhon',
  'คลองสาม คลองหลวง ปทุมธานี': 'Pathum Thani',
  'เชียงใหม่': 'Chiang Mai',
  'ต้นไทร': 'Ton Sai',
  'ตรัง': 'Trang',
  'ตำบลฉลอง': 'Chalong',
  'ตำบลเวียง': 'Wiang',
  'ตำบลสาคู': 'Saku',
  'ท้องศาลา': 'Thong Sala',
  'เทศบาลนครลำปาง': 'Lampang',
  'เทศบาลนครหัวหิน': 'Hua Hin',
  'ในเมือง': 'Nai Mueang',
  'บ้านทรายคำ': 'Ban Sai Kham',
  'บ้านไทรงาม': 'Ban Sai Ngam',
  'บ้านเนินหงษ์ทอง': 'Ban Noen Hong Thong',
  'บ้านละไม': 'Lamai',
  'บ้านวังจ๊อม': 'Ban Wang Chom',
  'บ้านเวียงเหนือ': 'Ban Wiang Nuea',
  'บ้านหนองบัว': 'Ban Nong Bua',
  'ปทุมวัน': 'Pathum Wan',
  'ปากช่อง': 'Pak Chong',
  'พระแอะ': 'Phra Ae',
  'เมืองพัทยา': 'Pattaya',
  'ลี้': 'Li',
  'หาดใหญ่': 'Hat Yai',

  // Japan
  '京都市': 'Kyoto',
  '渋谷区': 'Shibuya',
  '港区': 'Minato',
  '世田谷区': 'Setagaya',
  '台東区': 'Taito',
  '新宿区': 'Shinjuku',
  '札幌市': 'Sapporo',
  '神戸市': 'Kobe',
  '読谷村': 'Yomitan',
  '千代田区': 'Chiyoda',
  '那覇市': 'Naha',
  '名古屋市': 'Nagoya',
  '吹田市': 'Suita',
  '善通寺市': 'Zentsuji',
  '大田区': 'Ota',
  '姫路市': 'Himeji',
  '杉並区': 'Suginami',
  '福岡市': 'Fukuoka',
  '中央区': 'Chuo',
  '中野区': 'Nakano',
  '今治市': 'Imabari',
  '仙台市': 'Sendai',
  '北中城村': 'Kitanakagusuku',
  '大網白里市': 'Oamishirasato',
  '富士宮市': 'Fujinomiya',
  '小瀬田': 'Koseda',
  '岡山市': 'Okayama',
  '広島市': 'Hiroshima',
  '恩納村': 'Onna',
  '東大阪市': 'Higashiosaka',
  '松本市': 'Matsumoto',
  '枚方市': 'Hirakata',
  '横浜市': 'Yokohama',
  '江東区': 'Koto',
  '目黒区': 'Meguro',
  '箱根町': 'Hakone',
  '船橋市': 'Funabashi',
  '蒲郡市': 'Gamagori',
  '豊中市': 'Toyonaka',
  '豊島区': 'Toshima',
  '金沢市': 'Kanazawa',
  '鎌倉市': 'Kamakura',
  '大阪市': 'Osaka',

  // Taiwan
  '臺北市': 'Taipei',
  '台北市': 'Taipei',
  '新竹市': 'Hsinchu',
  '臺中市': 'Taichung',
  '高雄市': 'Kaohsiung',
  '彰化市': 'Changhua',
  '新北市': 'New Taipei City',
  '臺南市': 'Tainan',
  '彰化縣': 'Changhua County',
  '新竹縣': 'Hsinchu County',
  '吉安鄉': 'Ji-an',
  '嘉義縣': 'Chiayi County',
  '宜蘭縣': 'Yilan County',
  '桃園市': 'Taoyuan',

  // China
  '香港 Hong Kong': 'Hong Kong',
  '上海市': 'Shanghai',
  '朝阳区': 'Chaoyang',
  '东城区': 'Dongcheng',
  '北京市': 'Beijing',
  '海淀区': 'Haidian',
  '叠彩区': 'Diecai',
  '天河区': 'Tianhe',
  '昆明市': 'Kunming',
  '梅江区': 'Meijiang',
  '武侯区': 'Wuhou',
  '西城区': 'Xicheng',
  '长宁区': 'Changning',

  // Israel
  'תל אביב-יפו': 'Tel Aviv',
  'תל אביב–יפו': 'Tel Aviv',
  'תל אביב': 'Tel Aviv',
  'באר שבע': 'Beer Sheva',
  'בנימינה': 'Binyamina',
  'ירושלים | القدس': 'Jerusalem',
  'מועצה אזורית מרום הגליל': 'Upper Galilee',
  'עפולה': 'Afula',
  'ראשון לציון': 'Rishon LeZion',

  // Georgia
  'თბილისი': 'Tbilisi',

  // Nepal
  'काठमाडौँ महानगरपालिका': 'Kathmandu',

  // Egypt
  'القاهرة': 'Cairo',

  // UAE
  'الخليج التجاري': 'Business Bay',
  'دبي': 'Dubai',

  // Cambodia
  'ភូមិ​គ្រួស': 'Phnom Penh',

  // Cyrillic (incorrectly under China)
  'Алматы': 'Almaty',
  'Улан-Батор': 'Ulaanbaatar',
  'Иркутск': 'Irkutsk',
  'Улаанбаатар ᠤᠯᠠᠭᠠᠨ ᠪᠠᠭᠠᠲᠤᠷ': 'Ulaanbaatar',

  // Fix dash encoding
  'Phan Rang – Thap Cham': 'Phan Rang-Thap Cham',

  // Korean (already translated but double-check)
  '대전광역시': 'Daejeon',
  '서울특별시': 'Seoul',
  '부산광역시': 'Busan',

  // Japanese already handled
  'つくば市': 'Tsukuba',
  '市': 'Unknown City',
}

async function main() {
  let allPlaces: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('id, city, country').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allPlaces.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Find non-Latin cities
  const nonLatin = allPlaces.filter(p => p.city && /[^\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF]/.test(p.city));
  const uniqueCities = [...new Map(nonLatin.map(p => [p.city, p.country])).entries()];

  console.log(`Found ${uniqueCities.length} non-Latin city names to translate\n`);

  let updated = 0;
  let notFound = 0;

  for (const [city, country] of uniqueCities) {
    const translation = TRANSLATIONS[city];
    if (!translation) {
      console.log(`  MISSING: [${city}] (${country})`);
      notFound++;
      continue;
    }

    const { error, count } = await sb
      .from('places')
      .update({ city: translation })
      .eq('city', city);

    if (error) {
      console.log(`  ERR: [${city}] → [${translation}]: ${error.message}`);
    } else {
      console.log(`  ✅ [${city}] → [${translation}]`);
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} city groups, ${notFound} missing translations`);

  // Refresh views
  console.log('\nRefreshing directory views...');
  const { error } = await sb.rpc('refresh_directory_views');
  console.log(error ? `  ERR: ${error.message}` : '  ✅ Done');
}

main().catch(e => { console.error(e); process.exit(1) });
