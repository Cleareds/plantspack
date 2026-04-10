/**
 * Fetches city population data from the GeoNames cities15000 dataset
 * and matches it against our database cities.
 *
 * Usage: npx tsx scripts/fetch-city-populations.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as https from 'https';
import * as http from 'http';

const GEONAMES_ZIP_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const TMP_DIR = '/tmp/geonames-plantspack';
const ZIP_PATH = path.join(TMP_DIR, 'cities15000.zip');
const TXT_PATH = path.join(TMP_DIR, 'cities15000.txt');
const OUTPUT_PATH = path.join(__dirname, 'city-populations.json');

// Country name to ISO 2-letter code mapping
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Argentina': 'AR',
  'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT', 'Azerbaijan': 'AZ',
  'Bahrain': 'BH', 'Bangladesh': 'BD', 'Belarus': 'BY', 'Belgium': 'BE',
  'Bolivia': 'BO', 'Bosnia and Herzegovina': 'BA', 'Brazil': 'BR',
  'Bulgaria': 'BG', 'Cambodia': 'KH', 'Canada': 'CA', 'Chile': 'CL',
  'China': 'CN', 'Colombia': 'CO', 'Costa Rica': 'CR', 'Croatia': 'HR',
  'Cuba': 'CU', 'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
  'Denmark': 'DK', 'Dominican Republic': 'DO', 'Ecuador': 'EC', 'Egypt': 'EG',
  'El Salvador': 'SV', 'Estonia': 'EE', 'Ethiopia': 'ET', 'Finland': 'FI',
  'France': 'FR', 'Georgia': 'GE', 'Germany': 'DE', 'Deutschland': 'DE',
  'Greece': 'GR', 'Guatemala': 'GT', 'Honduras': 'HN', 'Hong Kong': 'HK',
  'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN', 'Indonesia': 'ID',
  'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT',
  'Jamaica': 'JM', 'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ',
  'Kenya': 'KE', 'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Laos': 'LA',
  'Latvia': 'LV', 'Lebanon': 'LB', 'Libya': 'LY', 'Lithuania': 'LT',
  'Luxembourg': 'LU', 'Macau': 'MO', 'Malaysia': 'MY', 'Maldives': 'MV',
  'Malta': 'MT', 'Mexico': 'MX', 'Moldova': 'MD', 'Mongolia': 'MN',
  'Montenegro': 'ME', 'Morocco': 'MA', 'Myanmar': 'MM', 'Nepal': 'NP',
  'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Nigeria': 'NG',
  'North Macedonia': 'MK', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK',
  'Palestine': 'PS', 'Panama': 'PA', 'Paraguay': 'PY', 'Peru': 'PE',
  'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT', 'Puerto Rico': 'PR',
  'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU', 'Saudi Arabia': 'SA',
  'Serbia': 'RS', 'Singapore': 'SG', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'South Africa': 'ZA', 'South Korea': 'KR', 'Spain': 'ES', 'Sri Lanka': 'LK',
  'Sweden': 'SE', 'Switzerland': 'CH', 'Taiwan': 'TW', 'Tanzania': 'TZ',
  'Thailand': 'TH', 'Tunisia': 'TN', 'Turkey': 'TR', 'Türkiye': 'TR',
  'Ukraine': 'UA', 'United Arab Emirates': 'AE', 'UAE': 'AE',
  'United Kingdom': 'GB', 'UK': 'GB', 'United States': 'US', 'USA': 'US',
  'Uruguay': 'UY', 'Uzbekistan': 'UZ', 'Venezuela': 'VE', 'Vietnam': 'VN',
  'Réunion': 'RE', 'Reunion': 'RE', 'Martinique': 'MQ', 'Guadeloupe': 'GP',
  'French Guiana': 'GF', 'Curaçao': 'CW', 'Curacao': 'CW',
  'Trinidad and Tobago': 'TT', 'Bermuda': 'BM',
  'Republic of North Macedonia': 'MK', 'Macedonia': 'MK',
  'Ivory Coast': 'CI', 'Côte d\'Ivoire': 'CI',
  'Democratic Republic of the Congo': 'CD', 'Congo': 'CG',
  'Senegal': 'SN', 'Ghana': 'GH', 'Uganda': 'UG', 'Cameroon': 'CM',
  'Guam': 'GU', 'U.S. Virgin Islands': 'VI',
};

interface GeoNamesCity {
  name: string;
  asciiname: string;
  alternatenames: string[];
  countryCode: string;
  population: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  // Step 1: Get cities from database
  console.log('Fetching cities from database...');
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let allPlaces: { city: string; country: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('city, country').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allPlaces.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  const uniqueCities = [
    ...new Map(
      allPlaces
        .filter((p) => p.city)
        .map((p) => [p.city + '|||' + p.country, { city: p.city, country: p.country }])
    ).values(),
  ];
  console.log(`Found ${uniqueCities.length} unique city+country pairs`);

  // Step 2: Download and extract GeoNames data
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  if (!fs.existsSync(TXT_PATH)) {
    console.log('Downloading GeoNames cities15000.zip...');
    await downloadFile(GEONAMES_ZIP_URL, ZIP_PATH);
    console.log('Extracting...');
    execSync(`unzip -o "${ZIP_PATH}" -d "${TMP_DIR}"`, { stdio: 'pipe' });
  } else {
    console.log('Using cached GeoNames data');
  }

  // Step 3: Parse GeoNames TSV
  console.log('Parsing GeoNames data...');
  const raw = fs.readFileSync(TXT_PATH, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  // Build lookup maps: countryCode -> { normalizedName -> GeoNamesCity[] }
  const byCountry = new Map<string, Map<string, GeoNamesCity[]>>();
  // Also build alternate names index
  const altNamesByCountry = new Map<string, Map<string, GeoNamesCity[]>>();

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 15) continue;

    const city: GeoNamesCity = {
      name: cols[1],
      asciiname: cols[2],
      alternatenames: cols[3] ? cols[3].split(',') : [],
      countryCode: cols[8],
      population: parseInt(cols[14], 10) || 0,
    };

    const cc = city.countryCode;

    // Index by normalized name
    if (!byCountry.has(cc)) byCountry.set(cc, new Map());
    const countryMap = byCountry.get(cc)!;
    const normName = normalize(city.name);
    if (!countryMap.has(normName)) countryMap.set(normName, []);
    countryMap.get(normName)!.push(city);

    // Also index ascii name
    const normAscii = normalize(city.asciiname);
    if (normAscii !== normName) {
      if (!countryMap.has(normAscii)) countryMap.set(normAscii, []);
      countryMap.get(normAscii)!.push(city);
    }

    // Index alternate names
    if (!altNamesByCountry.has(cc)) altNamesByCountry.set(cc, new Map());
    const altMap = altNamesByCountry.get(cc)!;
    for (const alt of city.alternatenames) {
      const normAlt = normalize(alt);
      if (normAlt && normAlt.length > 2) {
        if (!altMap.has(normAlt)) altMap.set(normAlt, []);
        altMap.get(normAlt)!.push(city);
      }
    }
  }

  // Build global (cross-country) name index for fallback
  const globalByName = new Map<string, GeoNamesCity[]>();
  const globalByAlt = new Map<string, GeoNamesCity[]>();
  for (const [, countryMap] of byCountry) {
    for (const [name, cities] of countryMap) {
      if (!globalByName.has(name)) globalByName.set(name, []);
      globalByName.get(name)!.push(...cities);
    }
  }
  for (const [, altMap] of altNamesByCountry) {
    for (const [name, cities] of altMap) {
      if (!globalByAlt.has(name)) globalByAlt.set(name, []);
      globalByAlt.get(name)!.push(...cities);
    }
  }

  console.log(`Parsed ${lines.length} GeoNames entries`);

  // Step 4: Match cities
  const results: Record<string, number> = {};
  const unmatched: { city: string; country: string }[] = [];
  let matched = 0;

  for (const { city, country } of uniqueCities) {
    const key = `${city}|||${country}`;
    const cc = COUNTRY_NAME_TO_CODE[country];

    if (!cc) {
      // Try global search when country code is unknown
      const normCity = normalize(city);
      const globalCandidates = globalByName.get(normCity) || globalByAlt.get(normCity);
      if (globalCandidates && globalCandidates.length > 0) {
        const best = globalCandidates.reduce((a, b) => (a.population > b.population ? a : b));
        results[key] = best.population;
        matched++;
      } else {
        unmatched.push({ city, country });
      }
      continue;
    }

    const normCity = normalize(city);
    const countryMap = byCountry.get(cc);
    const altMap = altNamesByCountry.get(cc);

    let found: GeoNamesCity | null = null;

    // Strategy 1: Exact match on name/asciiname
    if (countryMap?.has(normCity)) {
      const candidates = countryMap.get(normCity)!;
      found = candidates.reduce((a, b) => (a.population > b.population ? a : b));
    }

    // Strategy 2: Match on alternate names
    if (!found && altMap?.has(normCity)) {
      const candidates = altMap.get(normCity)!;
      found = candidates.reduce((a, b) => (a.population > b.population ? a : b));
    }

    // Strategy 3: Try common transformations
    if (!found && countryMap) {
      // Try removing common prefixes/suffixes
      const variants = [
        normCity.replace(/^st /, 'saint '),
        normCity.replace(/^saint /, 'st '),
        normCity.replace(/ am .*$/, ''),
        normCity.replace(/ an der .*$/, ''),
        normCity.replace(/ im .*$/, ''),
        normCity.replace(/ upon .*$/, ''),
        normCity.replace(/ on .*$/, ''),
        normCity.replace(/ bei .*$/, ''),
        normCity.replace(/-/g, ' '),
        // Try just the first word for compound names
        normCity.split(' ')[0],
        normCity.split('-')[0],
      ];

      for (const variant of variants) {
        if (variant === normCity || variant.length < 3) continue;
        if (countryMap.has(variant)) {
          const candidates = countryMap.get(variant)!;
          found = candidates.reduce((a, b) => (a.population > b.population ? a : b));
          break;
        }
        if (altMap?.has(variant)) {
          const candidates = altMap.get(variant)!;
          found = candidates.reduce((a, b) => (a.population > b.population ? a : b));
          break;
        }
      }
    }

    // Strategy 4: Substring match - check if our city name contains or is contained in a GeoNames entry
    if (!found && countryMap) {
      for (const [geoName, candidates] of countryMap) {
        if (geoName.length >= 4 && (normCity.includes(geoName) || geoName.includes(normCity))) {
          if (normCity.length >= 4) {
            found = candidates.reduce((a, b) => (a.population > b.population ? a : b));
            break;
          }
        }
      }
    }

    // Strategy 5: Cross-country fallback (city might have wrong country in DB)
    if (!found) {
      const globalCandidates = globalByName.get(normCity) || globalByAlt.get(normCity);
      if (globalCandidates && globalCandidates.length > 0) {
        found = globalCandidates.reduce((a, b) => (a.population > b.population ? a : b));
      }
    }

    if (found) {
      results[key] = found.population;
      matched++;
    } else {
      unmatched.push({ city, country });
    }
  }

  // Save results
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n=== Results ===`);
  console.log(`Total unique cities: ${uniqueCities.length}`);
  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Output saved to: ${OUTPUT_PATH}`);

  if (unmatched.length > 0) {
    console.log(`\n=== Unmatched cities (first 50) ===`);
    for (const { city, country } of unmatched.slice(0, 50)) {
      console.log(`  ${city} (${country})`);
    }
    if (unmatched.length > 50) {
      console.log(`  ... and ${unmatched.length - 50} more`);
    }

    // Save unmatched for reference
    fs.writeFileSync(
      path.join(__dirname, 'city-populations-unmatched.json'),
      JSON.stringify(unmatched, null, 2)
    );
    console.log(`\nUnmatched cities saved to: scripts/city-populations-unmatched.json`);
  }
}

main().catch(console.error);
