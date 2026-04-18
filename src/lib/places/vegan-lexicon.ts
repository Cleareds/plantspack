/**
 * Multi-language lexicon for vegan / vegetarian / animal-product detection.
 *
 * Used by src/lib/places/vegan-signal.ts on website body text + LD-JSON.
 *
 * Grows organically — when admin review of the needs_review queue surfaces a
 * language or phrasing we missed, add it here.
 */

/** Markers that the business is *strictly* 100% vegan. High-confidence upgrade to fully_vegan. */
export const FULLY_VEGAN_PHRASES: RegExp[] = [
  // English
  /\b(100\s*%|fully|completely|entirely|strictly|purely|wholly|all-?vegan)\s*vegan\b/i,
  /\ball\s*(our\s*)?(food|dishes|menu)\s*is\s*vegan\b/i,
  /\bvegan-only\b/i,
  /\bexclusively\s+vegan\b/i,
  /\b100\s*%\s*plant[\s-]?based\b/i,
  // German
  /\b(rein|komplett|durchgehend|zu\s*100\s*%)\s*vegan\b/i,
  /\bnur\s*vegan\b/i,
  // Spanish / Portuguese
  /\b100\s*%\s*vegano\b/i,
  /\btotalmente\s*vegano\b/i,
  /\bexclusivamente\s*vegano\b/i,
  /\bsolo\s*vegano\b/i,
  /\b100\s*%\s*vegetal\b/i,
  // French
  /\b100\s*%\s*v[ée]g[ée]talien\b/i,
  /\bexclusivement\s*v[ée]g[ée]talien\b/i,
  /\bpurement\s*v[ée]g[ée]talien\b/i,
  // Italian
  /\b100\s*%\s*vegano\b/i,
  /\btotalmente\s*vegano\b/i,
  // Dutch / Scandi
  /\b100\s*%\s*veganistisch\b/i,
  /\bhelt\s*vegan/i,
  /\b100\s*%\s*vegansk/i,
  // Polish
  /\bw\s*100\s*%\s*wegański/i,
  /\bcałkowicie\s*wegański/i,
  // Japanese / Korean / Chinese
  /\b完全ヴィーガン\b/, /\b完全ビーガン\b/,
  /\b純素\b/, /\b纯素\b/,
  /\b100\s*%\s*비건\b/,
]

/** Softer: "we have vegan options" / "vegan-friendly" → vegan_friendly. */
export const VEGAN_FRIENDLY_PHRASES: RegExp[] = [
  /\bvegan\s*(options?|menu|choices|selection|dish(es)?)\b/i,
  /\bvegan-?friendly\b/i,
  /\boptions?\s*for\s*vegans?\b/i,
  /\bplant[\s-]?based\s*option/i,
  /\bveganen?\s*(optionen|auswahl|gerichte)\b/i,     // de
  /\bopci[oó]n(es)?\s*vegan[ao]s?\b/i,               // es/pt
  /\boptions?\s*v[ée]g[ée]taliennes?\b/i,            // fr
  /\bopzioni\s*vegane\b/i,                            // it
  /\bveganistische\s*(opties|keuzes)\b/i,            // nl
  /\bwegański(e|ą)\s*(opcje|menu|danie)\b/i,         // pl
  /\bヴィーガン対応\b/,                                // ja
  /\b비건\s*메뉴\b/,                                   // ko
]

/** Presence of these → rows that look like strict vegetarian restaurants with NO vegan signal → reject. */
export const VEGETARIAN_ONLY_PHRASES: RegExp[] = [
  /\bvegetarian\s*(restaurant|cafe|cuisine|kitchen)\b/i,
  /\blacto[-\s]?(ovo)?[\s-]?vegetarian\b/i,
  /\bvegetarischer?\s*(restaurant|café|küche)\b/i,
  /\brestaurant\s*v[ée]g[ée]tarien\b/i,
  /\bristorante\s*vegetariano\b/i,
  /\brestaurante\s*vegetariano\b/i,
  /\bベジタリアン\s*レストラン\b/,
  /\b베지테리언\s*레스토랑\b/,
  /\b素食餐廳\b/, /\b素食餐厅\b/,
]

/** "vegan" word in 12 languages — used as a weak positive signal when stronger phrases aren't found. */
export const VEGAN_WORD: RegExp = /\b(vegan|vegano|vegana|v[ée]g[ée]talien|wegański|veganisch|veganistisch|vegansk|纯素|純素|ヴィーガン|ビーガン|비건|веганский)\b/i

/** "vegetarian" word in same set — without a stronger vegan phrase, indicates the place may not be strict. */
export const VEGETARIAN_WORD: RegExp = /\b(vegetarian|vegetariana|vegetariano|v[ée]g[ée]tarien|wegetariański|vegetarisch|vegetarisk|vegetariska|素食|ベジタリアン|베지테리언|вегетарианский)\b/i

/**
 * Animal-product words for menu scanning. If a site's detected menu page
 * contains NONE of these (and the page is non-trivial in size), it's a strong
 * signal the menu is vegan.
 */
export const ANIMAL_PRODUCT_WORDS: RegExp = new RegExp(
  [
    // English
    'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'bacon', 'ham',
    'sausage', 'salami', 'prosciutto', 'pepperoni', 'steak', 'ribs', 'burger\\s*(?!vegan)',
    'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'lobster', 'oyster', 'crab', 'mussel',
    'cheese', 'mozzarella', 'parmesan', 'cheddar', 'feta', 'brie', 'ricotta', 'gouda',
    'milk', 'cream', 'butter', 'yogurt', 'yoghurt', 'whey', 'ghee',
    'egg(s)?\\b', 'omelette', 'omelet',
    'honey',
    // German
    'rindfleisch', 'schweinefleisch', 'hähnchen', 'hähnchenfleisch', 'speck', 'käse', 'milch', 'butter', 'sahne', 'joghurt', 'eier',
    // Spanish/Portuguese/Italian/French
    'carne(?!\\s*vegan)', 'pollo', 'cerdo', 'jam[oó]n', 'queso', 'leche', 'mantequilla', 'huevo', 'miel',
    'poulet', 'b[oe]uf', 'porc', 'fromage', 'lait', 'beurre', 'œuf', 'miel',
    'formaggio', 'latte', 'burro', 'uovo', 'miele',
    'frango', 'boi', 'porco', 'queijo', 'leite', 'manteiga', 'ovo',
    // Fish in a few langs
    'pesce', 'poisson', 'pescado',
  ].join('|'),
  'iu',
)
