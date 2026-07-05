/**
 * Normalize a user-supplied country value to the canonical English name used
 * across the places table ("Italy", "United States", …). Mobile submissions
 * arrive in whatever language the submitter's phone is set to ("Italia",
 * "Deutschland", "België"), and 2-letter ISO codes leak in from some sources.
 * Unknown values pass through unchanged — this is a best-effort cleaner, not
 * a validator.
 */

const COUNTRY_ALIASES: Record<string, string> = {
  // Endonyms / common non-English spellings
  italia: 'Italy',
  espana: 'Spain',
  'españa': 'Spain',
  deutschland: 'Germany',
  belgie: 'Belgium',
  'belgië': 'Belgium',
  belgique: 'Belgium',
  belgien: 'Belgium',
  nederland: 'Netherlands',
  'the netherlands': 'Netherlands',
  holland: 'Netherlands',
  osterreich: 'Austria',
  'österreich': 'Austria',
  polska: 'Poland',
  brasil: 'Brazil',
  sverige: 'Sweden',
  danmark: 'Denmark',
  suomi: 'Finland',
  norge: 'Norway',
  schweiz: 'Switzerland',
  suisse: 'Switzerland',
  svizzera: 'Switzerland',
  cesko: 'Czech Republic',
  'česko': 'Czech Republic',
  czechia: 'Czech Republic',
  magyarorszag: 'Hungary',
  'magyarország': 'Hungary',
  hrvatska: 'Croatia',
  ellada: 'Greece',
  'ελλάδα': 'Greece',
  turkiye: 'Turkey',
  'türkiye': 'Turkey',
  'україна': 'Ukraine',
  ukraina: 'Ukraine',
  portugalia: 'Portugal',
  eire: 'Ireland',
  'éire': 'Ireland',
  slovensko: 'Slovakia',
  slovenija: 'Slovenia',
  lietuva: 'Lithuania',
  latvija: 'Latvia',
  eesti: 'Estonia',
  romania: 'Romania',
  'românia': 'Romania',
  bulgaria: 'Bulgaria',
  'българия': 'Bulgaria',
  // Anglophone variants
  usa: 'United States',
  'united states of america': 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  uae: 'United Arab Emirates',
  // ISO-3166-1 alpha-2 codes seen in dirty data
  it: 'Italy',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  nl: 'Netherlands',
  be: 'Belgium',
  at: 'Austria',
  pt: 'Portugal',
  pl: 'Poland',
  se: 'Sweden',
  dk: 'Denmark',
  fi: 'Finland',
  no: 'Norway',
  ch: 'Switzerland',
  cz: 'Czech Republic',
  gr: 'Greece',
  ie: 'Ireland',
  gb: 'United Kingdom',
  br: 'Brazil',
  ca: 'Canada',
  au: 'Australia',
  nz: 'New Zealand',
  jp: 'Japan',
  mx: 'Mexico',
}

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const hit = COUNTRY_ALIASES[trimmed.toLowerCase()]
  return hit || trimmed
}
