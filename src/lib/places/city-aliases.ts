// Map common local-language or alternate-spelling city names to the
// canonical English name we store in `places.city`. The DB normalizes
// to English on insert (per CLAUDE.md data policy), but legitimate
// inputs from users — pinned cookies, mobile geo-decoded names, URL
// slugs from external links — still arrive in the local form.
//
// Without this map, a user who pins "Gent" gets a homepage card that
// reads "Gent, Belgium · 0 places" even though Ghent has 91. Add
// entries as we spot them in support / logs.
//
// Keys are lower-cased; lookup must lower-case the input. Values are
// the exact canonical English spelling stored in `places.city`.
const CITY_ALIASES: Record<string, string> = {
  // Belgium (Dutch / French ↔ English)
  gent: 'Ghent',
  antwerpen: 'Antwerp',
  anvers: 'Antwerp',
  bruxelles: 'Brussels',
  brussel: 'Brussels',
  brugge: 'Bruges',
  luik: 'Liège',
  liege: 'Liège',
  oostende: 'Ostend',
  louvain: 'Leuven',
  malines: 'Mechelen',
  bergen: 'Mons',
  doornik: 'Tournai',
  namen: 'Namur',

  // Germany
  muenchen: 'Munich',
  münchen: 'Munich',
  koeln: 'Cologne',
  köln: 'Cologne',
  nuernberg: 'Nuremberg',
  nürnberg: 'Nuremberg',

  // Austria
  wien: 'Vienna',

  // Italy
  roma: 'Rome',
  firenze: 'Florence',
  napoli: 'Naples',
  venezia: 'Venice',
  torino: 'Turin',
  milano: 'Milan',
  genova: 'Genoa',
  padova: 'Padua',

  // Portugal / Spain
  lisboa: 'Lisbon',
  sevilla: 'Seville',
  zaragoza: 'Saragossa',

  // Czech / Poland / Hungary
  praha: 'Prague',
  warszawa: 'Warsaw',
  kraków: 'Krakow',
  krakow: 'Krakow',
  poznań: 'Poznan',
  wrocław: 'Wroclaw',

  // Nordics / Greece
  københavn: 'Copenhagen',
  kobenhavn: 'Copenhagen',
  göteborg: 'Gothenburg',
  goteborg: 'Gothenburg',
  athina: 'Athens',
  athína: 'Athens',
  thessaloniki: 'Thessaloniki',

  // Netherlands (a few — most are already English-equivalent)
  'den haag': 'The Hague',
  'sgravenhage': 'The Hague',
  "'s-gravenhage": 'The Hague',

  // France
  marseille: 'Marseille',

  // Russia / Ukraine (Latin transliteration variants)
  moskva: 'Moscow',
  kyiv: 'Kyiv',
  kiev: 'Kyiv',
}

export function canonicalCityName(input: string | null | undefined): string {
  if (!input) return ''
  const trimmed = input.trim()
  const hit = CITY_ALIASES[trimmed.toLowerCase()]
  return hit || trimmed
}
