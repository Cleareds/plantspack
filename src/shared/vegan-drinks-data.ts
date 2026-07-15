/**
 * Vegan drinks lookup dataset.
 *
 * Curated starter set of mainstream beer, wine, spirit, liqueur,
 * cider and mixer brands with publicly-confirmed vegan status.
 *
 * Each entry's status is based on:
 *  - Manufacturer public statements / FAQs
 *  - Vegan Society / V-Label certifications
 *  - Long-standing Barnivore.com confirmations (Barnivore's public
 *    JSON API is no longer accessible, but the historical dataset
 *    is well-known)
 *
 * Scope is deliberately narrow: we ship a small set of confident
 * entries rather than a huge auto-imported list that would inevitably
 * contain stale or unverifiable claims. Per Plants Pack data policy,
 * we'd rather have 100 reliable entries than 5,000 noisy ones.
 *
 * To suggest additions, the /tools/drinks UI links to an email and
 * the brand's manufacturer page.
 */

export type DrinkKind = 'beer' | 'wine' | 'spirit' | 'liqueur' | 'cider' | 'mixer'
export type DrinkStatus = 'vegan' | 'not_vegan' | 'varies'

export const DRINK_KINDS: { key: DrinkKind; label: string }[] = [
  { key: 'beer', label: 'Beer' },
  { key: 'wine', label: 'Wine' },
  { key: 'spirit', label: 'Spirits' },
  { key: 'liqueur', label: 'Liqueurs' },
  { key: 'cider', label: 'Cider' },
  { key: 'mixer', label: 'Mixers / soft drinks' },
]

export interface Drink {
  name: string
  brand?: string
  kind: DrinkKind
  status: DrinkStatus
  /** Short reason / context */
  note?: string
}

export const VEGAN_DRINKS: Drink[] = [
  // ---------- BEER (vegan, confirmed) ----------
  { name: 'Guinness Draught', brand: 'Guinness', kind: 'beer', status: 'vegan', note: 'Vegan since 2018 - Diageo removed isinglass fining.' },
  { name: 'Heineken', brand: 'Heineken', kind: 'beer', status: 'vegan' },
  { name: 'Corona Extra', brand: 'Grupo Modelo', kind: 'beer', status: 'vegan' },
  { name: 'Stella Artois', brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'Budweiser', brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'Bud Light', brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'Coors Light', brand: 'Molson Coors', kind: 'beer', status: 'vegan' },
  { name: 'Miller Lite', brand: 'Molson Coors', kind: 'beer', status: 'vegan' },
  { name: 'Modelo Especial', brand: 'Grupo Modelo', kind: 'beer', status: 'vegan' },
  { name: 'Pacifico Clara', brand: 'Grupo Modelo', kind: 'beer', status: 'vegan' },
  { name: 'Carlsberg', brand: 'Carlsberg', kind: 'beer', status: 'vegan' },
  { name: 'Tuborg', brand: 'Carlsberg', kind: 'beer', status: 'vegan' },
  { name: "Beck's", brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'Pilsner Urquell', brand: 'Asahi Group', kind: 'beer', status: 'vegan' },
  { name: 'Asahi Super Dry', brand: 'Asahi', kind: 'beer', status: 'vegan' },
  { name: 'Sapporo', brand: 'Sapporo', kind: 'beer', status: 'vegan' },
  { name: 'Birra Moretti', brand: 'Heineken', kind: 'beer', status: 'vegan' },
  { name: 'Peroni Nastro Azzurro', brand: 'Asahi Group', kind: 'beer', status: 'vegan' },
  { name: 'San Miguel', brand: 'Mahou San Miguel', kind: 'beer', status: 'vegan' },
  { name: 'Estrella Damm', brand: 'Damm', kind: 'beer', status: 'vegan' },
  { name: 'Mahou', brand: 'Mahou San Miguel', kind: 'beer', status: 'vegan' },
  { name: 'Tiger Beer', brand: 'Heineken', kind: 'beer', status: 'vegan' },
  { name: 'Hoegaarden', brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'Leffe Blonde', brand: 'AB InBev', kind: 'beer', status: 'vegan' },
  { name: 'BrewDog Punk IPA', brand: 'BrewDog', kind: 'beer', status: 'vegan', note: 'BrewDog is vegan across the core range.' },
  { name: 'BrewDog Hazy Jane', brand: 'BrewDog', kind: 'beer', status: 'vegan' },
  { name: 'BrewDog Lost Lager', brand: 'BrewDog', kind: 'beer', status: 'vegan' },
  { name: 'Beavertown Neck Oil', brand: 'Beavertown', kind: 'beer', status: 'vegan' },
  { name: 'Beavertown Gamma Ray', brand: 'Beavertown', kind: 'beer', status: 'vegan' },
  { name: 'Camden Hells Lager', brand: 'Camden Town', kind: 'beer', status: 'vegan' },
  { name: 'Camden Pale Ale', brand: 'Camden Town', kind: 'beer', status: 'vegan' },
  { name: 'Sierra Nevada Pale Ale', brand: 'Sierra Nevada', kind: 'beer', status: 'vegan' },
  { name: 'Sierra Nevada Torpedo', brand: 'Sierra Nevada', kind: 'beer', status: 'vegan' },
  { name: 'Lagunitas IPA', brand: 'Lagunitas', kind: 'beer', status: 'vegan' },
  { name: 'Goose Island IPA', brand: 'Goose Island', kind: 'beer', status: 'vegan' },
  { name: 'Brooklyn Lager', brand: 'Brooklyn Brewery', kind: 'beer', status: 'vegan' },
  { name: 'Singha', brand: 'Boon Rawd', kind: 'beer', status: 'vegan' },

  // ---------- BEER (varies / unclear) ----------
  { name: "Old Speckled Hen", brand: 'Greene King', kind: 'beer', status: 'varies', note: 'Canned/bottle versions vegan; cask versions traditionally use isinglass fining.' },
  { name: 'Boddingtons', brand: 'AB InBev', kind: 'beer', status: 'varies', note: 'Canned widget-version vegan; cask uses isinglass.' },
  { name: 'John Smith\'s Extra Smooth', brand: 'Heineken', kind: 'beer', status: 'varies', note: 'Canned vegan; cask traditionally not.' },
  { name: 'Real ale (UK cask)', kind: 'beer', status: 'varies', note: 'Most traditional UK cask ales use isinglass (fish bladder) to clarify. Some breweries have switched to plant-based finings - check brand-by-brand.' },

  // ---------- CIDER ----------
  { name: "Magners Original", brand: 'Magners', kind: 'cider', status: 'vegan' },
  { name: 'Bulmers Original', brand: 'Heineken Ireland', kind: 'cider', status: 'vegan' },
  { name: 'Strongbow Original', brand: 'Heineken', kind: 'cider', status: 'vegan' },
  { name: 'Kopparberg (fruit ciders)', brand: 'Kopparberg', kind: 'cider', status: 'vegan' },
  { name: 'Rekorderlig', brand: 'Rekorderlig', kind: 'cider', status: 'vegan' },
  { name: 'Aspall Premier Cru', brand: 'Aspall', kind: 'cider', status: 'varies', note: 'Some Aspall ciders use isinglass - check the bottle for vegan certification.' },

  // ---------- WINE ----------
  { name: 'Bonny Doon Vineyard (all wines)', brand: 'Bonny Doon', kind: 'wine', status: 'vegan', note: 'Producer-wide vegan policy.' },
  { name: 'Frey Vineyards (all wines)', brand: 'Frey', kind: 'wine', status: 'vegan', note: 'USA\'s first organic winery; producer-wide vegan.' },
  { name: 'Yellow Tail (most range)', brand: 'Casella Family Brands', kind: 'wine', status: 'vegan', note: 'Major lines carry vegan certification on label.' },
  { name: "Lindeman's (most range)", brand: 'Treasury Wine Estates', kind: 'wine', status: 'vegan' },
  { name: 'Charles Shaw ("Two-Buck Chuck")', brand: 'Bronco Wine', kind: 'wine', status: 'vegan' },
  { name: 'Cono Sur Bicicleta', brand: 'Cono Sur', kind: 'wine', status: 'vegan' },
  { name: 'Wine (mainstream, unlabelled)', kind: 'wine', status: 'varies', note: 'Most mass-market wine is now vegan, but fining agents (isinglass, egg white, casein, gelatine) are not required to be listed on EU/US labels. Look for a Vegan Society / V-Label mark, or check the producer\'s website.' },
  { name: 'Champagne (traditional houses)', kind: 'wine', status: 'varies', note: 'Many premium Champagnes (Moët, Bollinger, Veuve Clicquot) historically use egg-white or isinglass fining. Newer vegan-certified cuvées exist - check the specific bottle.' },

  // ---------- SPIRITS ----------
  { name: 'Smirnoff Red Label Vodka', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: 'Absolut Vodka', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: 'Grey Goose Vodka', brand: 'Bacardi', kind: 'spirit', status: 'vegan' },
  { name: 'Stolichnaya Vodka', brand: 'Stoli Group', kind: 'spirit', status: 'vegan' },
  { name: 'Ketel One Vodka', brand: 'Nolet', kind: 'spirit', status: 'vegan' },
  { name: "Tito's Handmade Vodka", brand: "Tito's", kind: 'spirit', status: 'vegan' },
  { name: 'Belvedere Vodka', brand: 'LVMH', kind: 'spirit', status: 'vegan' },
  { name: 'Bombay Sapphire Gin', brand: 'Bacardi', kind: 'spirit', status: 'vegan' },
  { name: 'Tanqueray London Dry Gin', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: "Hendrick's Gin", brand: 'William Grant & Sons', kind: 'spirit', status: 'vegan' },
  { name: 'Beefeater London Dry', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: "Gordon's London Dry Gin", brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: 'Plymouth Gin', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: 'Aviation American Gin', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: "Jack Daniel's Old No. 7", brand: "Jack Daniel's", kind: 'spirit', status: 'vegan' },
  { name: 'Jameson Irish Whiskey', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: 'Bulleit Bourbon', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: "Maker's Mark Bourbon", brand: 'Beam Suntory', kind: 'spirit', status: 'vegan' },
  { name: 'Wild Turkey 101', brand: 'Campari Group', kind: 'spirit', status: 'vegan' },
  { name: 'Knob Creek Bourbon', brand: 'Beam Suntory', kind: 'spirit', status: 'vegan' },
  { name: 'Buffalo Trace Bourbon', brand: 'Sazerac', kind: 'spirit', status: 'vegan' },
  { name: 'Woodford Reserve', brand: 'Brown-Forman', kind: 'spirit', status: 'vegan' },
  { name: 'Bacardi Carta Blanca', brand: 'Bacardi', kind: 'spirit', status: 'vegan' },
  { name: 'Captain Morgan Original Spiced', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: 'Havana Club 3 Year', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: 'Mount Gay Eclipse Rum', brand: 'Rémy Cointreau', kind: 'spirit', status: 'vegan' },
  { name: 'Sailor Jerry Spiced Rum', brand: 'William Grant & Sons', kind: 'spirit', status: 'vegan' },
  { name: 'Patrón Silver Tequila', brand: 'Bacardi', kind: 'spirit', status: 'vegan' },
  { name: 'Don Julio Blanco', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: 'Jose Cuervo Especial', brand: 'Becle', kind: 'spirit', status: 'vegan' },
  { name: 'Espolòn Blanco', brand: 'Campari Group', kind: 'spirit', status: 'vegan' },
  { name: 'Hennessy VS Cognac', brand: 'LVMH', kind: 'spirit', status: 'vegan' },
  { name: 'Rémy Martin VSOP', brand: 'Rémy Cointreau', kind: 'spirit', status: 'vegan' },
  { name: 'Glenfiddich 12', brand: 'William Grant & Sons', kind: 'spirit', status: 'vegan' },
  { name: 'The Glenlivet 12', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },
  { name: 'Johnnie Walker Black Label', brand: 'Diageo', kind: 'spirit', status: 'vegan' },
  { name: 'Chivas Regal 12', brand: 'Pernod Ricard', kind: 'spirit', status: 'vegan' },

  // ---------- LIQUEURS (NOT VEGAN — dairy/honey) ----------
  { name: "Bailey's Irish Cream", brand: 'Diageo', kind: 'liqueur', status: 'not_vegan', note: 'Contains dairy cream. Almande (almond-based) variant is vegan.' },
  { name: "Bailey's Almande", brand: 'Diageo', kind: 'liqueur', status: 'vegan', note: 'Almond-milk based - vegan variant of the cream original.' },
  { name: 'Carolans Irish Cream', brand: 'Heaven Hill', kind: 'liqueur', status: 'not_vegan', note: 'Contains dairy cream.' },
  { name: 'Amarula Cream', brand: 'Distell', kind: 'liqueur', status: 'not_vegan', note: 'Contains dairy cream.' },
  { name: 'RumChata', brand: 'Agave Loco', kind: 'liqueur', status: 'not_vegan', note: 'Contains dairy cream.' },
  { name: 'Drambuie', brand: 'William Grant & Sons', kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },
  { name: 'Bénédictine', brand: 'Bacardi', kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },
  { name: 'Glayva', brand: 'Whyte and Mackay', kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },
  { name: 'Yukon Jack', brand: 'Sazerac', kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },
  { name: "Jack Daniel's Tennessee Honey", brand: "Jack Daniel's", kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },
  { name: 'Wild Turkey American Honey', brand: 'Campari Group', kind: 'liqueur', status: 'not_vegan', note: 'Contains honey.' },

  // ---------- LIQUEURS (VEGAN) ----------
  { name: 'Cointreau', brand: 'Rémy Cointreau', kind: 'liqueur', status: 'vegan' },
  { name: 'Grand Marnier', brand: 'Campari Group', kind: 'liqueur', status: 'vegan' },
  { name: 'Aperol', brand: 'Campari Group', kind: 'liqueur', status: 'vegan' },
  { name: 'Campari', brand: 'Campari Group', kind: 'liqueur', status: 'vegan', note: 'Reformulated to remove carmine in 2006.' },
  { name: 'Martini Rosso / Bianco / Extra Dry', brand: 'Bacardi', kind: 'liqueur', status: 'vegan' },
  { name: 'Pimm\'s No. 1', brand: 'Diageo', kind: 'liqueur', status: 'vegan' },
  { name: 'Kahlúa', brand: 'Pernod Ricard', kind: 'liqueur', status: 'varies', note: 'Original Kahlúa is widely reported vegan but the manufacturer has been ambiguous; Kahlúa\'s alternative cream-liqueurs contain dairy.' },

  // ---------- MIXERS / SOFT DRINKS ----------
  { name: 'Coca-Cola Classic', brand: 'Coca-Cola', kind: 'mixer', status: 'vegan' },
  { name: 'Diet Coke', brand: 'Coca-Cola', kind: 'mixer', status: 'vegan' },
  { name: 'Coca-Cola Zero Sugar', brand: 'Coca-Cola', kind: 'mixer', status: 'vegan' },
  { name: 'Pepsi', brand: 'PepsiCo', kind: 'mixer', status: 'vegan' },
  { name: 'Sprite', brand: 'Coca-Cola', kind: 'mixer', status: 'vegan' },
  { name: 'Fanta Orange', brand: 'Coca-Cola', kind: 'mixer', status: 'vegan' },
  { name: 'Schweppes Tonic Water', brand: 'Coca-Cola / Schweppes', kind: 'mixer', status: 'vegan' },
  { name: 'Fever-Tree (entire range)', brand: 'Fever-Tree', kind: 'mixer', status: 'vegan' },
  { name: 'Red Bull', brand: 'Red Bull', kind: 'mixer', status: 'vegan', note: 'Taurine is synthetic.' },
  { name: 'Innocent smoothies (most)', brand: 'Innocent', kind: 'mixer', status: 'varies', note: 'Most smoothies vegan; some contain honey - check the label.' },
  { name: 'Lucozade Energy / Sport', brand: 'Suntory', kind: 'mixer', status: 'vegan' },
]

export function searchDrinks(query: string, kinds: DrinkKind[] = []): Drink[] {
  const q = query.trim().toLowerCase()
  return VEGAN_DRINKS.filter((d) => {
    if (kinds.length > 0 && !kinds.includes(d.kind)) return false
    if (!q) return true
    const hay = `${d.name} ${d.brand ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}
