/**
 * Generate SEO-rich, data-driven descriptions for country and city pages.
 * Every description is unique because it's built from actual place data.
 */

// Cultural context that makes descriptions richer and more authentic
const COUNTRY_CONTEXT: Record<string, { veganCulture: string; localDishes: string }> = {
  'Germany': {
    veganCulture: 'Berlin is widely regarded as the vegan capital of the world, and the movement has spread to every major German city',
    localDishes: 'vegan currywurst, plant-based döner kebab, and reimagined Black Forest cake',
  },
  'United Kingdom': {
    veganCulture: 'the UK is where Veganuary started and now drives one of the fastest-growing vegan markets in Europe',
    localDishes: 'vegan fish and chips, plant-based full English breakfasts, and dairy-free afternoon teas',
  },
  'France': {
    veganCulture: 'France has surprised the world by embracing plant-based cuisine with the same artistry it brings to traditional cooking',
    localDishes: 'vegan croissants, plant-based crêpes, and cruelty-free patisserie',
  },
  'Spain': {
    veganCulture: 'the Mediterranean diet provides a natural foundation, and Spanish cities are rapidly embracing dedicated vegan dining',
    localDishes: 'vegan tapas, plant-based paella, and patatas bravas',
  },
  'Netherlands': {
    veganCulture: 'the Netherlands leads in plant-based food innovation, being home to major meat-alternative companies',
    localDishes: 'vegan bitterballen, plant-based stroopwafels, and Dutch-style vegan cheese',
  },
  'Austria': {
    veganCulture: 'Vienna\'s legendary café culture now serves plant-based Sachertorte and vegan Wiener Schnitzel alongside its traditional offerings',
    localDishes: 'vegan schnitzel, plant-based strudel, and dairy-free Viennese pastries',
  },
  'Italy': {
    veganCulture: 'Italian cuisine\'s emphasis on fresh vegetables, olive oil, and pasta means many traditional dishes are already vegan or easily adapted',
    localDishes: 'vegan pizza, plant-based gelato, and dairy-free risotto',
  },
  'Greece': {
    veganCulture: 'centuries of Orthodox fasting traditions have produced some of Europe\'s best naturally plant-based recipes',
    localDishes: 'fasolada, gigantes plaki, briam, and horta — all traditional and naturally vegan',
  },
  'Belgium': {
    veganCulture: 'Ghent was the first city in the world to declare an official weekly veggie day, setting the tone for the country',
    localDishes: 'vegan waffles, plant-based Belgian chocolate, and dairy-free frites with vegan mayo',
  },
  'Poland': {
    veganCulture: 'Poland has become an unexpected vegan hotspot with some of Europe\'s most affordable plant-based dining',
    localDishes: 'vegan pierogi, plant-based bigos, and dairy-free pączki',
  },
  'Sweden': {
    veganCulture: 'Sweden\'s sustainability-focused culture makes plant-based eating mainstream across the country',
    localDishes: 'vegan Swedish meatballs, plant-based kanelbullar, and foraged Nordic ingredients',
  },
  'Czech Republic': {
    veganCulture: 'Prague has become one of Central Europe\'s best-kept vegan secrets with remarkably affordable plant-based restaurants',
    localDishes: 'vegan svíčková, plant-based trdelník, and Czech-style vegan pub food',
  },
  'Switzerland': {
    veganCulture: 'home to the world\'s oldest vegetarian restaurant (Hiltl, since 1898), Switzerland has deep plant-based roots',
    localDishes: 'vegan fondue, plant-based rösti, and Swiss-quality dairy-free chocolate',
  },
  'Portugal': {
    veganCulture: 'Lisbon has rapidly become one of Southern Europe\'s most exciting vegan destinations with creative, affordable dining',
    localDishes: 'vegan pastéis de nata, plant-based bacalhau alternatives, and Algarve-style grilled vegetables',
  },
  'Finland': {
    veganCulture: 'Finnish school lunches routinely include vegan options, reflecting how mainstream plant-based eating has become',
    localDishes: 'vegan karjalanpiirakka, plant-based Finnish berry desserts, and Nordic-style mushroom dishes',
  },
  'Denmark': {
    veganCulture: 'Copenhagen\'s New Nordic cuisine movement has naturally embraced plant-based cooking with seasonal, local ingredients',
    localDishes: 'vegan smørrebrød, plant-based Danish pastries, and Nordic root vegetable dishes',
  },
  'Hungary': {
    veganCulture: 'Budapest offers excellent vegan dining at remarkably low prices, making it a top destination for budget-conscious plant-based travellers',
    localDishes: 'vegan lángos, plant-based gulyás, and Hungarian-style stuffed peppers',
  },
  'Norway': {
    veganCulture: 'Norway\'s strong environmental values are driving growing interest in plant-based dining across the country',
    localDishes: 'Nordic-style vegan dishes with local berries, root vegetables, and foraged ingredients',
  },
  'Ireland': {
    veganCulture: 'Ireland\'s farm-to-table tradition translates surprisingly well to plant-based dining',
    localDishes: 'vegan Irish soda bread, plant-based colcannon, and dairy-free Irish coffee',
  },
  'Croatia': {
    veganCulture: 'Mediterranean influences mean the Croatian coast offers plenty of naturally plant-based dishes',
    localDishes: 'grilled vegetables, olive oil-dressed salads, and Dalmatian-style vegan cooking',
  },
  'Romania': {
    veganCulture: 'Orthodox fasting traditions mean many traditional Romanian dishes are naturally plant-based',
    localDishes: 'zacuscă, fasole bătută, and sarmale de post',
  },
  'Slovakia': {
    veganCulture: 'Bratislava\'s food scene is evolving with affordable, creative plant-based restaurants',
    localDishes: 'vegan bryndzové halušky alternatives and traditional Slovak pastries',
  },
  'Slovenia': {
    veganCulture: 'Ljubljana, the green capital of Europe, has naturally embraced plant-based dining',
    localDishes: 'dishes that blend Mediterranean, Central European, and Balkan plant-based traditions',
  },
  'Bulgaria': {
    veganCulture: 'Sofia has a passionate vegan community with several dedicated restaurants',
    localDishes: 'traditional bean stews, grilled vegetables, and vegan banitsa',
  },
  'Estonia': {
    veganCulture: 'Tallinn offers a surprisingly good vegan scene for a small capital',
    localDishes: 'modern Nordic-Estonian plant-based cuisine with local seasonal ingredients',
  },
  'Latvia': {
    veganCulture: 'Riga\'s food scene is evolving with more plant-based options emerging',
    localDishes: 'Latvian-style vegan dishes with local grains, mushrooms, and root vegetables',
  },
  'Lithuania': {
    veganCulture: 'Vilnius has a growing vegan community adapting traditional Lithuanian recipes',
    localDishes: 'vegan cepelinai, plant-based šaltibarščiai, and Lithuanian mushroom dishes',
  },
  'Luxembourg': {
    veganCulture: 'Luxembourg City\'s multicultural character brings diverse plant-based influences',
    localDishes: 'vegan dishes reflecting French, German, and international culinary traditions',
  },
  'Ukraine': {
    veganCulture: 'despite challenges, Ukrainian cities maintain passionate vegan communities',
    localDishes: 'vegan borscht, plant-based varenyky, and Ukrainian-style pickled vegetables',
  },
}

const CITY_CONTEXT: Record<string, string> = {
  'Berlin, Germany': 'Kreuzberg, Friedrichshain, and Neukölln are the most concentrated areas for plant-based dining. The city\'s international and alternative culture has made it a global magnet for vegan innovation, from late-night döner shops to zero-waste restaurants.',
  'Paris, France': 'Le Marais, the 11th arrondissement, and Bastille are the best neighborhoods for vegan dining. Paris\'s plant-based patisseries and fromageries bring French culinary artistry to cruelty-free cooking.',
  'Wien, Austria': 'The city\'s legendary Kaffeehaus culture now serves plant-based Sachertorte and vegan Melange. Nearly every traditional café offers plant-milk options, and dedicated vegan restaurants span from the 1st district to the outer Bezirke.',
  'Hamburg, Germany': 'The Schanzenviertel and St. Pauli neighborhoods are the heart of Hamburg\'s vegan scene. The city\'s cosmopolitan port culture brings diverse plant-based influences from across the globe.',
  'Frankfurt am Main, Germany': 'The Nordend and Bornheim neighborhoods are hotspots for plant-based dining. Frankfurt\'s financial hub status means a diverse international vegan scene alongside reimagined Hessian specialties.',
  'Praha, Czech Republic': 'Old Town, Vinohrady, and Žižkov neighborhoods are packed with affordable vegan spots. Prague offers some of the best-value plant-based dining in all of Europe.',
  'Helsinki, Finland': 'Helsinki\'s vegan scene features unique Nordic ingredients — wild berries, forest mushrooms, and root vegetables. The city\'s design-forward culture extends to beautifully presented plant-based dishes.',
  'Gent, Belgium': 'The world\'s first city with an official weekly veggie day, Ghent\'s plant-based scene punches far above its size. The medieval city center is packed with creative vegan restaurants and cafés.',
  'Lyon, France': 'France\'s gastronomic capital has embraced plant-based cooking with characteristic Lyonnaise passion. The Presqu\'île and Croix-Rousse neighborhoods are the best areas for vegan exploration.',
  'København, Denmark': 'Copenhagen applies New Nordic cuisine principles to plant-based cooking — seasonal, local, and beautifully presented. The city that pioneered foraging in fine dining now applies those same techniques to vegan dishes.',
  'Bruxelles - Brussel, Belgium': 'The EU capital offers plant-based dining that reflects its multicultural character. From vegan waffles near Grand Place to innovative restaurants in Ixelles, Brussels has embraced plant-based eating.',
  'Graz, Austria': 'Austria\'s second city has a growing vegan scene, with the university district and Lend neighborhood leading the way. Strong organic farming traditions in Styria mean excellent local produce.',
  'Brno, Czech Republic': 'Brno\'s student population drives a vibrant, affordable vegan scene. The city centre and Veveří neighborhoods offer diverse plant-based options.',
  'Dresden, Germany': 'The Neustadt district is Dresden\'s vegan heartland, with creative plant-based restaurants alongside the city\'s famous Baroque architecture.',
  'Bremen, Germany': 'Bremen\'s Viertel (Das Viertel) neighborhood is the center of the city\'s plant-based scene, with cafés and restaurants reflecting the area\'s alternative culture.',
}

interface PlaceStats {
  total: number
  categories: Record<string, number>
  cuisines: string[]
  sampleNames: string[]
  fullyVegan: number
  petFriendly: number
  cityCount?: number
}

function formatCuisineList(cuisines: string[]): string {
  if (cuisines.length === 0) return ''
  const cleaned = cuisines
    .filter(c => c && c !== 'vegan' && c !== 'regional')
    .map(c => c.replace(/_/g, ' '))
    .slice(0, 4)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  return cleaned.slice(0, -1).join(', ') + ' and ' + cleaned[cleaned.length - 1]
}

function formatPlaceNames(names: string[], max: number = 3): string {
  const clean = names.filter(n => n.length > 2 && n.length < 40).slice(0, max)
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0]
  return clean.slice(0, -1).join(', ') + ' and ' + clean[clean.length - 1]
}

export function generateCountryDescription(
  countryName: string,
  stats: PlaceStats,
): string {
  const ctx = COUNTRY_CONTEXT[countryName]
  const parts: string[] = []

  // Opening with search-intent targeting
  if (stats.total > 50) {
    parts.push(`Looking for vegan restaurants in ${countryName}? Browse ${stats.total} verified plant-based places across ${stats.cityCount || 'multiple'} cities.`)
  } else if (stats.total > 10) {
    parts.push(`Discover ${stats.total} vegan restaurants, shops, and cafés across ${countryName}.`)
  } else {
    parts.push(`Find vegan-friendly places in ${countryName} — we currently list ${stats.total} verified spots.`)
  }

  // Category breakdown
  const catParts: string[] = []
  if (stats.categories.eat) catParts.push(`${stats.categories.eat} restaurants and cafés`)
  if (stats.categories.store) catParts.push(`${stats.categories.store} vegan shops`)
  if (stats.categories.hotel) catParts.push(`${stats.categories.hotel} vegan-friendly places to stay`)
  if (catParts.length > 1) {
    parts.push(`That includes ${catParts.join(', ')}.`)
  }

  // Fully vegan stat
  if (stats.fullyVegan > 5) {
    const pct = Math.round((stats.fullyVegan / stats.total) * 100)
    parts.push(`${pct}% are 100% vegan — not just vegan-friendly, but fully plant-based menus.`)
  }

  // Cuisine variety
  const cuisineStr = formatCuisineList(stats.cuisines)
  if (cuisineStr) {
    parts.push(`Popular cuisines include ${cuisineStr}.`)
  }

  // Cultural context
  if (ctx) {
    parts.push(`Why ${countryName}? Because ${ctx.veganCulture}. Look out for ${ctx.localDishes}.`)
  }

  // Sample places
  const placeStr = formatPlaceNames(stats.sampleNames)
  if (placeStr) {
    parts.push(`Popular spots include ${placeStr}.`)
  }

  // Pet-friendly callout
  if (stats.petFriendly > 0) {
    parts.push(`${stats.petFriendly} ${stats.petFriendly === 1 ? 'place is' : 'places are'} confirmed dog-friendly.`)
  }

  return parts.join(' ')
}

/**
 * Short (~155 chars) meta description for <head>. Always unique per route
 * because it bakes in the total/fv counts and one cuisine or sample.
 */
export function generateCountryMetaDescription(
  countryName: string,
  stats: PlaceStats,
): string {
  const { total, fullyVegan, cityCount, categories, cuisines } = stats
  const fvPart = fullyVegan > 0 ? ` — ${fullyVegan} fully vegan` : ''
  const cityPart = cityCount && cityCount > 1 ? ` across ${cityCount} cities` : ''
  const restaurants = categories.eat || 0
  const shops = categories.store || 0
  const stays = categories.hotel || 0
  const mix: string[] = []
  if (restaurants) mix.push(`${restaurants} restaurants`)
  if (shops) mix.push(`${shops} shops`)
  if (stays) mix.push(`${stays} stays`)
  const mixStr = mix.length ? mix.slice(0, 3).join(', ') : `${total} places`
  const topCuisine = cuisines && cuisines.length ? cuisines.slice(0, 2).join(' and ') : ''
  const cuisinePart = topCuisine ? `. Popular: ${topCuisine} cuisine.` : '.'
  const base = `${mixStr} in ${countryName}${cityPart}${fvPart}${cuisinePart}`
  // Cap at 160 chars
  return base.length > 160 ? base.slice(0, 157).replace(/[.,\s]+$/, '') + '…' : base
}

export function generateCityMetaDescription(
  cityName: string,
  countryName: string,
  stats: PlaceStats,
): string {
  const { total, fullyVegan, categories, cuisines, sampleNames } = stats
  const fvPart = fullyVegan > 0 ? `, ${fullyVegan} fully vegan` : ''
  const restaurants = categories.eat || 0
  const shops = categories.store || 0
  const stays = categories.hotel || 0
  const head = total > 1
    ? `${total} vegan and vegan-friendly places in ${cityName}, ${countryName}${fvPart}.`
    : `Vegan places in ${cityName}, ${countryName}.`
  const mix: string[] = []
  if (restaurants) mix.push(`${restaurants} ${restaurants === 1 ? 'restaurant' : 'restaurants'}`)
  if (shops) mix.push(`${shops} ${shops === 1 ? 'shop' : 'shops'}`)
  if (stays) mix.push(`${stays} ${stays === 1 ? 'stay' : 'stays'}`)
  const mixStr = mix.length > 1 ? ` Includes ${mix.slice(0, 3).join(', ')}.` : ''
  const topCuisine = cuisines && cuisines.length ? ` ${cuisines.slice(0, 2).join(', ')} cuisine.` : ''
  const sample = sampleNames && sampleNames.length
    ? ` Try ${sampleNames.slice(0, 2).join(' or ')}.`
    : ''
  const base = `${head}${mixStr}${topCuisine}${sample}`
  return base.length > 160 ? base.slice(0, 157).replace(/[.,\s]+$/, '') + '…' : base
}

export function generateCityDescription(
  cityName: string,
  countryName: string,
  stats: PlaceStats,
): string {
  const ctx = CITY_CONTEXT[`${cityName}, ${countryName}`]
  const parts: string[] = []

  // Search-intent opening
  if (stats.total > 30) {
    parts.push(`Looking for the best vegan food in ${cityName}? We've verified ${stats.total} plant-based restaurants, cafés, and shops across the city.`)
  } else if (stats.total > 10) {
    parts.push(`${cityName} has ${stats.total} vegan-friendly places worth visiting — from fully plant-based restaurants to shops stocking vegan products.`)
  } else {
    parts.push(`Find ${stats.total} vegan ${stats.total === 1 ? 'place' : 'places'} in ${cityName}, ${countryName}.`)
  }

  // Breakdown
  const catParts: string[] = []
  if (stats.categories.eat) catParts.push(`${stats.categories.eat} places to eat`)
  if (stats.categories.store) catParts.push(`${stats.categories.store} vegan ${stats.categories.store === 1 ? 'shop' : 'shops'}`)
  if (stats.categories.hotel) catParts.push(`${stats.categories.hotel} places to stay`)
  if (catParts.length > 1) {
    parts.push(`Browse ${catParts.join(', ')}.`)
  }

  // Cuisine variety
  const cuisineStr = formatCuisineList(stats.cuisines)
  if (cuisineStr) {
    parts.push(`You'll find ${cuisineStr} cuisine — all vegan.`)
  }

  // City-specific context
  if (ctx) {
    parts.push(ctx)
  }

  // Sample places
  const placeStr = formatPlaceNames(stats.sampleNames, 4)
  if (placeStr) {
    parts.push(`Highlights include ${placeStr}.`)
  }

  // Fully vegan stat
  if (stats.fullyVegan > 3) {
    parts.push(`${stats.fullyVegan} of these are 100% vegan.`)
  }

  // Pet-friendly
  if (stats.petFriendly > 0) {
    parts.push(`${stats.petFriendly} ${stats.petFriendly === 1 ? 'place welcomes' : 'places welcome'} dogs.`)
  }

  return parts.join(' ')
}
