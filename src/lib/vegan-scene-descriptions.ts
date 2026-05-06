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
  'Berlin, Germany': 'Kreuzberg, Friedrichshain and Neukölln are the densest neighborhoods for plant-based dining. Berlin has one of the highest absolute counts of vegan and vegan-friendly places in Europe, including dedicated all-vegan supermarkets, vegan döner spots and a long-running plant-based fine-dining scene.',
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
  'London, United Kingdom': 'Shoreditch, Hackney, Camden and Brixton anchor the London vegan scene, with the highest concentration of fully-vegan spots in the East End. Plant-based fish and chips, vegan Sunday roasts and dairy-free afternoon tea are all easy finds.',
  'Amsterdam, Netherlands': 'De Pijp, Jordaan and Oost are the densest neighborhoods for plant-based dining in Amsterdam. The city\'s long head start on plant-based innovation shows in everything from vegan bitterballen to dedicated vegan supermarkets.',
  'New York, United States': 'Manhattan\'s East Village, Lower East Side and Williamsburg in Brooklyn are the heart of NYC\'s vegan scene. Long-standing all-vegan institutions sit alongside newer chef-driven spots, with a stronger fully-vegan share than most US cities.',
  'Brooklyn, United States': 'Williamsburg, Greenpoint and Bushwick host most of Brooklyn\'s independent vegan spots. The borough leans more fully-vegan and chef-driven than Manhattan, with strong representation of plant-based pizza, donuts and ice cream.',
  'Los Angeles, United States': 'Silver Lake, Echo Park, Venice and Highland Park are the densest LA neighborhoods for plant-based dining. LA has one of the highest fully-vegan ratios of any large US city, including dedicated vegan butchers and creameries.',
  'Barcelona, Spain': 'Gràcia, El Born and Eixample are where most plant-based dining clusters in Barcelona. The city has shifted faster than the Spanish average, with vegan tapas, plant-based paella and dedicated vegan bakeries in steady supply.',
  'Madrid, Spain': 'Malasaña, Chueca and Lavapiés are the central Madrid neighborhoods with the most vegan options. The scene leans toward casual all-day cafés and quick-bite spots more than fine dining.',
  'Lisbon, Portugal': 'Cais do Sodré, Chiado and Príncipe Real are the densest Lisbon neighborhoods for plant-based dining. The vegan scene grew quickly from a low base and includes a notable share of fully-vegan restaurants.',
  'Rome, Italy': 'Trastevere, Monti and the Centro Storico are where most of Rome\'s plant-based dining sits. Naturally-vegan Roman pasta dishes, vegan pizza al taglio, and dairy-free gelato are easy finds.',
  'Milan, Italy': 'Navigli, Isola and Porta Venezia carry most of Milan\'s vegan scene. The city has a stronger ratio of dedicated vegan restaurants than Italy\'s average, plus a growing plant-based aperitivo culture.',
  'Florence, Italy': 'Oltrarno and Santa Croce are where Florence\'s small but solid plant-based scene clusters. Naturally-vegan Tuscan dishes - ribollita, panzanella, fagioli all\'uccelletto - cover most menus.',
  'Athens, Greece': 'Exarchia, Koukaki and Pangrati are where Athens\' plant-based dining clusters. Greek Orthodox fasting traditions mean naturally-vegan classics (gigantes, fasolada, briam, dolmades) are on most taverna menus.',
  'Istanbul, Turkey': 'Cihangir, Karaköy and Kadıköy host most of Istanbul\'s plant-based dining. Turkish meze, vegan döner and dairy-free baklava have all become easier to find in central neighborhoods.',
  'Stockholm, Sweden': 'Södermalm and Vasastan are the most vegan-dense neighborhoods in Stockholm. Sweden\'s sustainability-focused food culture means plant-milk and vegan options are on most café menus by default.',
  'Oslo, Norway': 'Grünerløkka and Sentrum carry most of Oslo\'s plant-based scene. Plant-based Nordic ingredients - root vegetables, foraged greens, mushrooms - feature heavily.',
  'Reykjavik, Iceland': 'Most of Reykjavik\'s plant-based dining sits in 101 Reykjavik (the central postcode). The scene is small but punches above its weight given the city\'s size, and plant-based Icelandic dishes are increasingly on menus.',
  'Edinburgh, United Kingdom': 'Bruntsfield, Newington and Leith carry most of Edinburgh\'s plant-based scene. Scottish staples including vegan haggis and plant-based full Scottish breakfasts are widely available.',
  'Manchester, United Kingdom': 'The Northern Quarter, Ancoats and Chorlton are the densest neighborhoods for vegan dining in Manchester. The city has one of the strongest fully-vegan shares in the UK outside London.',
  'Brighton, United Kingdom': 'North Laine, Kemptown and Hove host most of Brighton\'s plant-based dining. Brighton has long been the highest-vegan-density city in the UK by population.',
  'Toronto, Canada': 'Kensington Market, Queen West and Leslieville are where Toronto\'s vegan scene clusters. The city has one of North America\'s most diverse plant-based ranges, especially for vegan Asian food.',
  'Montreal, Canada': 'Plateau Mont-Royal, Mile End and Le Plateau are the densest Montreal neighborhoods for plant-based dining. The city has notable vegan poutine, plant-based bagels and dairy-free patisserie.',
  'Vancouver, Canada': 'Mount Pleasant, Commercial Drive and Gastown are the most vegan-dense Vancouver neighborhoods. The city has one of the highest fully-vegan ratios in Canada.',
  'San Francisco, United States': 'The Mission, Hayes Valley and Berkeley (across the bay) host most of the Bay Area\'s plant-based dining. The Bay Area pioneered plant-based fine dining and still has one of the highest fully-vegan shares in the US.',
  'Portland, United States': 'Mississippi Avenue, Division Street and Alberta Street are the most vegan-dense Portland neighborhoods. Portland has the highest fully-vegan share of any major US city, with dedicated vegan strip malls and bakeries.',
  'Seattle, United States': 'Capitol Hill, Ballard and Fremont host most of Seattle\'s plant-based dining. The city has steady all-vegan presence, especially for plant-based fast-casual.',
  'Tel Aviv, Israel': 'Florentin, Rothschild and the Carmel Market area are the densest neighborhoods for vegan dining in Tel Aviv. Tel Aviv has long claimed the highest per-capita vegan share globally, with vegan options standard on most menus.',
  'Tokyo, Japan': 'Shibuya, Shimokitazawa and Kichijōji are the most vegan-dense Tokyo neighborhoods. Vegan ramen, plant-based sushi and shojin-ryori (Buddhist temple cuisine) are easier finds than visitors expect.',
  'Kyoto, Japan': 'Shojin-ryori (Buddhist temple cuisine) is naturally vegan and Kyoto has the strongest tradition of it in Japan. The Higashiyama district holds most of the city\'s dedicated vegan and shojin-ryori restaurants.',
  'Bangkok, Thailand': 'Sukhumvit, Silom and Ari are the densest Bangkok neighborhoods for plant-based dining. Thai cuisine adapts well to vegan, and dedicated vegan and Buddhist-tradition jay restaurants are widely available.',
  'Chiang Mai, Thailand': 'The Old City, Nimmanhaemin and Santitham host most of Chiang Mai\'s plant-based scene. Chiang Mai has more dedicated vegan restaurants per capita than Bangkok, helped by the Buddhist jay food tradition.',
  'Bali, Indonesia': 'Ubud, Canggu and Seminyak are where most of Bali\'s plant-based dining sits. Bali has one of Southeast Asia\'s densest concentrations of vegan and raw-vegan restaurants, especially around Ubud.',
  'Ubud, Indonesia': 'Ubud is the vegan and yoga heart of Bali. Plant-based, raw-vegan and macrobiotic restaurants are on virtually every street in the central area, alongside traditionally-vegan Balinese dishes.',
  'Mexico City, Mexico': 'Roma Norte, Condesa and Coyoacán carry most of Mexico City\'s plant-based scene. Naturally-vegan Mexican dishes (frijoles, nopales, salsas) plus dedicated vegan taquerias make it easier to eat plant-based here than visitors expect.',

  // Renamed German + European cities (the keys above used native spellings;
  // our DB now uses canonical English/standard names after the merge pass).
  'Munich, Germany': 'Schwabing, Glockenbachviertel and Maxvorstadt are the most plant-based-dense Munich neighborhoods. Vegan beer-garden classics and dedicated all-vegan restaurants now sit alongside Bavaria\'s traditional fare.',
  'Vienna, Austria': 'The 1st, 7th, and 8th districts plus Neubau host most of Vienna\'s plant-based dining. The legendary Kaffeehaus culture now serves plant-based Sachertorte and vegan Wiener Schnitzel.',
  'Cologne, Germany': 'Belgisches Viertel, Ehrenfeld and the Südstadt are where Cologne\'s vegan scene clusters. The city has one of the strongest fully-vegan ratios in western Germany.',
  'Nuremberg, Germany': 'Gostenhof and the Altstadt host most of Nuremberg\'s plant-based dining. The Franconian focus on vegetables and grains adapts well to vegan menus.',
  'Hannover, Germany': 'Linden-Mitte and Nordstadt are the centers of Hannover\'s plant-based scene. The city has a steady all-vegan presence alongside vegan-friendly cafes.',
  'Copenhagen, Denmark': 'Copenhagen applies New Nordic cuisine principles to plant-based cooking - seasonal, local, beautifully presented. Nørrebro, Vesterbro and Indre By carry most of the dedicated vegan spots.',
  'Prague, Czech Republic': 'Old Town, Vinohrady and Žižkov neighborhoods are packed with affordable vegan spots. Prague offers some of the best-value plant-based dining in Europe.',
  'Brussels, Belgium': 'The EU capital\'s plant-based dining reflects its multicultural character. From vegan waffles near Grand Place to innovative restaurants in Ixelles, plant-based options are widely available.',
  'Ghent, Belgium': 'The world\'s first city with an official weekly veggie day, Ghent\'s plant-based scene punches far above its size. The medieval city center is packed with creative vegan restaurants and cafés.',
  'Halle (Saale), Germany': 'Halle\'s student population drives a small but solid vegan scene, concentrated in the Altstadt and Paulusviertel.',
  'Karlsruhe, Germany': 'The Innenstadt and Oststadt host most of Karlsruhe\'s plant-based dining. The university and tech-research presence keeps the vegan scene growing.',
  'Freiburg im Breisgau, Germany': 'Freiburg\'s eco-conscious culture means plant-based options are everywhere. The Altstadt and Stühlinger neighborhoods have the densest vegan offerings.',
  'Stuttgart, Germany': 'The West and Süd districts carry most of Stuttgart\'s plant-based scene. The city has a steady vegan presence despite a more conservative Swabian food culture overall.',
  'Bonn, Germany': 'Bonn\'s former-capital character and university population give it a vegan scene larger than its size suggests, mostly clustered in the Altstadt and Poppelsdorf.',
  'Darmstadt, Germany': 'Darmstadt\'s university scene drives a respectable plant-based offering, especially around Martinsviertel.',
  'Kiel, Germany': 'Kiel\'s plant-based dining clusters around the central university area and Innenstadt.',
  'Kassel, Germany': 'Vorderer Westen is Kassel\'s most vegan-dense neighborhood, with cafés and small restaurants reflecting the city\'s student culture.',
  'Aachen, Germany': 'Aachen\'s university and cross-border location (with the Netherlands and Belgium) bring varied plant-based options, mostly in the city center.',
  'Heidelberg, Germany': 'Altstadt, Bergheim and Neuenheim host most of Heidelberg\'s plant-based dining. The university town has a stronger vegan scene than its size suggests.',
  'Mainz, Germany': 'The Altstadt and Neustadt are the densest neighborhoods for plant-based dining in Mainz. The city has a steady vegan presence alongside its wine-region food culture.',
  'Essen, Germany': 'Rüttenscheid is Essen\'s most plant-based-dense neighborhood. The city\'s post-industrial transformation has brought a growing vegan scene.',
  'Mannheim, Germany': 'Quadrate and the Jungbusch district carry most of Mannheim\'s plant-based dining. The city\'s diversity drives varied vegan options.',
  'Dortmund, Germany': 'Kreuzviertel and the Innenstadt-West are where most of Dortmund\'s vegan scene sits. The city has steady plant-based growth in the wider Ruhr area.',
  'Münster, Germany': 'Münster\'s university and cycling culture support a respectable plant-based scene, mostly concentrated in the Hansaviertel and around the Aasee.',
  'Düsseldorf, Germany': 'Flingern, Pempelfort and Bilk are the densest Düsseldorf neighborhoods for plant-based dining. The city\'s Japanese community also brings dedicated vegan ramen and sushi spots.',
  'Potsdam, Germany': 'Potsdam\'s plant-based scene is concentrated in the Holländisches Viertel and around the Sanssouci area.',
  'Erfurt, Germany': 'Erfurt\'s well-preserved Altstadt holds most of the city\'s vegan options.',
  'Braunschweig, Germany': 'Braunschweig\'s plant-based dining clusters in the Magniviertel and around the university.',
  'Augsburg, Germany': 'Augsburg\'s Lechviertel and Innenstadt host most of the city\'s vegan options, blending Bavarian and Swabian influences.',
  'Würzburg, Germany': 'Würzburg\'s student population supports a respectable plant-based scene in the Innenstadt and around the Sanderstraße area.',
  'Saarbrücken, Germany': 'Saarbrücken\'s St. Johann district carries most of the city\'s plant-based dining.',

  // UK
  'Leeds, United Kingdom': 'The Northern Quarter, Hyde Park and Headingley host most of Leeds\' plant-based dining. The student population drives a strong fully-vegan share.',
  'Bristol, United Kingdom': 'Stokes Croft, Gloucester Road and Clifton are Bristol\'s most vegan-dense neighborhoods. Bristol has one of the highest vegan-per-capita ratios in the UK after Brighton.',
  'Oxford, United Kingdom': 'Oxford\'s plant-based scene clusters in Jericho, Cowley Road and the city centre. The student and academic population keeps the vegan offering growing.',
  'Glasgow, United Kingdom': 'The West End, Finnieston and the Southside are where most of Glasgow\'s plant-based dining sits. Vegan haggis and plant-based Scottish breakfasts are easy finds.',
  'York, United Kingdom': 'York\'s plant-based dining clusters in the city centre and Bishopthorpe Road. The historic city has a stronger vegan scene than its size suggests.',

  // France
  'Strasbourg, France': 'The city centre and Krutenau are where most of Strasbourg\'s vegan scene sits. The Alsatian-French culinary mix produces unique plant-based interpretations.',
  'Nantes, France': 'Bouffay, Saint-Félix and the Île de Nantes carry most of Nantes\' plant-based dining. The city has one of France\'s most progressive vegan scenes outside Paris.',
  'Grenoble, France': 'Hyper-Centre and Saint-Bruno host most of Grenoble\'s plant-based dining. The student and outdoor-sports culture supports a steady vegan presence.',
  'Toulouse, France': 'Saint-Cyprien, Carmes and Saint-Aubin are the densest Toulouse neighborhoods for plant-based dining. The city has a growing vegan scene alongside its traditional southwestern French cuisine.',

  // Iberia + Mediterranean
  'Valencia, Spain': 'Ruzafa and El Carmen are the densest Valencia neighborhoods for plant-based dining. Vegan paella (yes, really) and dedicated vegan horchaterías are part of the scene.',

  // Eastern Europe
  'Warsaw, Poland': 'Praga, Śródmieście and Powiśle are the most vegan-dense Warsaw neighborhoods. Warsaw has one of Europe\'s most affordable and creative plant-based scenes.',
  'Krakow, Poland': 'Kazimierz, Stare Miasto and Podgórze carry most of Krakow\'s plant-based dining. The city\'s low prices and strong vegan scene make it a favorite for budget plant-based travel.',
  'Budapest, Hungary': 'District VII (Erzsébetváros), District V (Belváros) and District IX have the densest plant-based options in Budapest. Vegan goulash and plant-based lángos are now standard finds.',
  'Sofia, Bulgaria': 'The city centre and Lozenets carry most of Sofia\'s plant-based dining. Bulgarian cuisine has many naturally-vegan dishes (lyutenitsa, ajvar, beans) plus a growing dedicated vegan scene.',
  'Bratislava, Slovakia': 'The Old Town and Ružinov host most of Bratislava\'s plant-based dining. The scene is small but solid, with both traditional Slovak vegan adaptations and international options.',
  'Tallinn, Estonia': 'Kalamaja, the Old Town and Kadriorg are the densest Tallinn neighborhoods for plant-based dining. Estonia\'s strong tech and design culture extends to a thoughtful vegan scene.',
  'Tbilisi, Georgia': 'Vera and Vake are where most of Tbilisi\'s plant-based dining clusters. Georgian cuisine has many naturally-vegan dishes (lobio, badrijani, pkhali) plus dedicated vegan restaurants.',

  // Switzerland + Ireland
  'Zurich, Switzerland': 'District 4 (Aussersihl) and District 5 (Zurich West) carry most of the city\'s plant-based dining. Zurich has one of the highest fully-vegan ratios per capita in central Europe.',
  'Dublin, Ireland': 'Temple Bar, Stoneybatter and Ranelagh host most of Dublin\'s plant-based dining. Vegan full Irish breakfasts and plant-based pub menus are now standard finds.',

  // Scandinavia
  'Gothenburg, Sweden': 'Linnéstaden, Haga and Majorna are the most vegan-dense Gothenburg neighborhoods. Sweden\'s sustainability culture means most cafés have plant-based defaults.',
  'Malmo, Sweden': 'Möllevången and the city centre carry most of Malmö\'s plant-based dining. Malmö has one of the most progressive vegan scenes in Scandinavia.',
  'Tampere, Finland': 'Tampere\'s plant-based dining clusters around the city centre and Pyynikki. The city has a stronger vegan offering than its size would suggest.',

  // North America
  'Philadelphia, United States': 'South Street, Fishtown and West Philly host most of Philadelphia\'s plant-based dining. Philadelphia has one of the strongest fully-vegan presences on the US East Coast.',
  'Chicago, United States': 'Logan Square, Wicker Park and Andersonville are the densest Chicago neighborhoods for plant-based dining. Plant-based deep-dish pizza and vegan Chicago hot dogs are part of the scene.',
  'San Diego, United States': 'North Park, Hillcrest and Encinitas (north of the city) carry most of San Diego\'s plant-based dining. The Southern California vegan share is one of the highest in the US.',
  'Austin, United States': 'East Austin, South Congress and the University area host most of Austin\'s plant-based dining. The city has a strong fully-vegan share with vegan BBQ, tacos and food trucks.',
  'Phoenix, United States': 'The Roosevelt Row arts district and Tempe (university area) carry most of Phoenix metro\'s plant-based dining.',
  'Washington, United States': 'Logan Circle, U Street and Adams Morgan are the densest DC neighborhoods for plant-based dining.',
  'Denver, United States': 'RiNo, Highland and Capitol Hill host most of Denver\'s plant-based dining. The city has steady fully-vegan growth alongside Colorado\'s wider plant-based scene.',
  'Salt Lake City, United States': 'Sugar House, the 9th & 9th area and Downtown carry most of Salt Lake City\'s plant-based dining. The city has a stronger vegan scene than visitors expect.',
  'Atlanta, United States': 'East Atlanta, Old Fourth Ward and Decatur are the most vegan-dense neighborhoods. Atlanta has one of the strongest Black-vegan scenes in the US, with dedicated soul-food vegan restaurants.',

  // Australia + NZ
  'Brisbane, Australia': 'West End, Fortitude Valley and South Brisbane host most of Brisbane\'s plant-based dining. The city\'s cafe culture means vegan brunch options are standard.',
  'Melbourne, Australia': 'Fitzroy, Brunswick and St Kilda are the densest Melbourne neighborhoods for plant-based dining. Melbourne has one of the world\'s strongest fully-vegan shares, especially for plant-based brunch.',
  'Sydney, Australia': 'Newtown, Surry Hills and Bondi carry most of Sydney\'s plant-based dining. The city has a steady fully-vegan presence and strong plant-based fusion scene.',
  'Christchurch, New Zealand': 'The Christchurch CBD and Riccarton host most of the city\'s plant-based dining. New Zealand\'s strong dairy industry makes the vegan scene punch above weight.',

  // Asia
  'Singapore, Singapore': 'Tiong Bahru, Joo Chiat and Bugis carry most of Singapore\'s plant-based dining. The city\'s Buddhist and Hindu vegetarian traditions plus a growing modern vegan scene make plant-based eating easy.',
  'Bengaluru, India': 'Indiranagar, Koramangala and Jayanagar host most of Bengaluru\'s plant-based dining. Indian vegetarian-by-default culture means most South Indian dishes (idli, dosa, sambar) are naturally vegan; dedicated vegan spots are growing.',
  'New Delhi, India': 'Hauz Khas Village, Khan Market and Connaught Place carry most of New Delhi\'s plant-based dining. North Indian vegetarian dishes (chana masala, dal, aloo gobi) are naturally vegan with light adjustments.',
  'Varanasi, India': 'Most plant-based dining in Varanasi is concentrated near the Assi Ghat and the Old City. Sattvic and Hindu temple cuisine traditions mean naturally-vegan options are everywhere.',
  'Kochi, India': 'Fort Kochi and Mattancherry host most of Kochi\'s plant-based dining. Kerala\'s coconut-based cooking and Hindu vegetarian tradition make naturally-vegan options easy to find.',
  'Leh, India': 'Leh\'s small plant-based scene is centered in the main bazaar area. Tibetan-Buddhist food traditions plus a growing yoga-traveler crowd support steady vegan options.',
  'Hanoi, Vietnam': 'The Old Quarter, Tay Ho and Ba Dinh host most of Hanoi\'s plant-based dining. Vietnamese Buddhist (chay) cuisine plus a growing modern vegan scene make plant-based eating straightforward.',
  'Ho Chi Minh City, Vietnam': 'District 1, District 3 and Thao Dien (District 2) carry most of HCMC\'s plant-based dining. Vietnamese chay (Buddhist vegan) traditions plus a strong international vegan scene make the city excellent for plant-based travel.',
  'Seoul, South Korea': 'Itaewon, Hongdae and Gangnam are the densest Seoul neighborhoods for plant-based dining. Korean Buddhist temple cuisine plus a growing modern vegan scene make plant-based eating viable, especially for those willing to specify "no meat or fish".',
  'Osaka, Japan': 'Osaka\'s plant-based scene is mostly in Namba, Shinsaibashi and Umeda. Vegan ramen, plant-based okonomiyaki and shojin-ryori options are growing alongside Osaka\'s famous food culture.',
  'Beijing, China': 'Sanlitun, Wudaokou and the hutongs near Houhai carry most of Beijing\'s plant-based dining. Buddhist sushi (zhai) restaurants plus a small modern vegan scene make plant-based eating possible with planning.',
  'Kuala Lumpur, Malaysia': 'Bangsar, Bukit Bintang and Petaling Jaya host most of KL\'s plant-based dining. Malaysian Indian and Chinese-Buddhist vegetarian traditions plus a growing modern vegan scene make plant-based eating easier than expected.',

  // South America
  'Bogota, Colombia': 'Chapinero, La Candelaria and Usaquén carry most of Bogotá\'s plant-based dining. The city has Latin America\'s most progressive vegan scene alongside Mexico City and São Paulo.',
  'Sao Paulo, Brazil': 'Vila Madalena, Pinheiros and Jardins are the densest São Paulo neighborhoods for plant-based dining. Brazil\'s biggest city has the strongest vegan scene in South America.',
  'Porto Alegre, Brazil': 'Cidade Baixa and Bom Fim host most of Porto Alegre\'s plant-based dining. Southern Brazil\'s vegan scene is smaller than São Paulo\'s but growing fast.',

  // Middle East
  'Dubai, United Arab Emirates': 'Jumeirah, Al Quoz and Downtown Dubai carry most of Dubai\'s plant-based dining. The city has a fast-growing vegan scene driven by international expat demand and luxury-focused plant-based restaurants.',

  // Austrian + others
  'Salzburg, Austria': 'The Altstadt and Neustadt host most of Salzburg\'s plant-based dining. The city has a steady vegan presence alongside its traditional Austrian fare.',
}

interface PlaceStats {
  total: number
  categories: Record<string, number>
  cuisines: string[]
  sampleNames: string[]
  fullyVegan: number
  petFriendly: number
  cityCount?: number
  // Extended signals (optional). Used when present to lengthen and
  // diversify per-city descriptions for SEO depth.
  mostlyVegan?: number
  verified?: number  // verification_level >= 3
  withWebsite?: number
  withHours?: number
  topPicks?: string[] // names of best-known/verified places (3-5)
}

// Tags that come through cuisine_types but describe the venue type or a
// dish category, not a cuisine. Filtering these out leaves an honest
// list of actual cuisines (Italian, Vietnamese, Indian, etc.) for the
// description and FAQ.
const VENUE_TYPE_TAGS = new Set([
  'vegan', 'regional', 'yes', 'no',
  'coffee_shop', 'coffee', 'cafe', 'tea',
  'fast_food', 'restaurant', 'bar', 'pub', 'snack', 'snack_bar',
  'sandwich', 'bagel', 'donut', 'doughnut', 'salad', 'soup',
  'breakfast', 'brunch', 'lunch', 'dinner',
  'dessert', 'cake', 'pancake', 'crepe', 'pastry', 'pastries',
  'ice_cream', 'gelato', 'frozen_yoghurt', 'frozen_yogurt',
  'juice', 'smoothie', 'bakery', 'bread',
  'hot_dog', 'kebab', 'shawarma', 'doner', 'wrap', 'pita', 'pita_bread',
  'burger', 'burgers',
  'pizza', // arguably Italian, but venue-type more often than cuisine
  'sushi', // similar - venue type more than cuisine descriptor
  'wok', 'noodle', 'porridge', 'empanada', 'dumpling',
  'organic', 'healthy', 'health_food', 'health',
  'vegetarian', 'plant_based', 'plant-based',
  'international', 'fusion', 'european', 'asian',
  'tapas', 'mezze', 'street_food', 'food_court',
])

export function filterCuisinesForDisplay(cuisineTypes: string[]): string[] {
  return cuisineTypes
    .filter(c => c && !VENUE_TYPE_TAGS.has(c.toLowerCase()))
    .map(c => c.replace(/_/g, ' '))
}

function formatCuisineList(cuisines: string[]): string {
  const cleaned = filterCuisinesForDisplay(cuisines).slice(0, 4)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  return cleaned.slice(0, -1).join(', ') + ' and ' + cleaned[cleaned.length - 1]
}

// Round to nearest "nice" number for human-readable counts.
// 1695 -> 1700, 38 -> 38 (small numbers stay precise).
function roundFriendly(n: number): string {
  if (n < 50) return n.toString()
  if (n < 200) return (Math.round(n / 10) * 10).toString()
  if (n < 1000) return (Math.round(n / 50) * 50).toString()
  return (Math.round(n / 100) * 100).toLocaleString()
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

  // Category breakdown. Reads every category present in stats.categories
  // so sanctuaries (organisation) and any future category (event, other)
  // surface honestly instead of being silently dropped.
  const catParts: string[] = []
  if (stats.categories.eat) catParts.push(`${stats.categories.eat} restaurants and cafés`)
  if (stats.categories.store) catParts.push(`${stats.categories.store} vegan shops`)
  if (stats.categories.hotel) catParts.push(`${stats.categories.hotel} vegan-friendly places to stay`)
  if (stats.categories.organisation) catParts.push(`${stats.categories.organisation} ${stats.categories.organisation === 1 ? 'animal sanctuary' : 'animal sanctuaries'}`)
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
  const sanctuaries = categories.organisation || 0
  const mix: string[] = []
  if (restaurants) mix.push(`${restaurants} restaurants`)
  if (shops) mix.push(`${shops} shops`)
  if (stays) mix.push(`${stays} stays`)
  if (sanctuaries) mix.push(`${sanctuaries} ${sanctuaries === 1 ? 'sanctuary' : 'sanctuaries'}`)
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

  // Lead with the count, no rhetorical opener.
  // Different shapes by size so all 10K cities don't read identically.
  const fvFragment = stats.fullyVegan > 0
    ? `, ${stats.fullyVegan} of them fully vegan`
    : ''
  if (stats.total >= 100) {
    parts.push(`${cityName} has ${stats.total} vegan and vegan-friendly places listed${fvFragment}.`)
  } else if (stats.total >= 20) {
    parts.push(`${stats.total} vegan and vegan-friendly places in ${cityName}${fvFragment}.`)
  } else if (stats.total >= 5) {
    parts.push(`${stats.total} places with vegan options across ${cityName}${fvFragment}.`)
  } else {
    parts.push(`${stats.total} vegan ${stats.total === 1 ? 'place' : 'places'} in ${cityName} so far - help us grow the list.`)
  }

  // Category breakdown - only when meaningful spread, with rounded numbers
  // so big city counts read as approximate ("around 1,700") rather than
  // false-precise ("1695"). Stores/stays stay precise since they're small.
  const catBits: string[] = []
  if (stats.categories.eat) {
    const eat = stats.categories.eat
    catBits.push(eat >= 100 ? `around ${roundFriendly(eat)} restaurants and cafes` : `${eat} restaurants and cafes`)
  }
  if (stats.categories.store) catBits.push(`${stats.categories.store} ${stats.categories.store === 1 ? 'shop' : 'shops'}`)
  if (stats.categories.hotel) catBits.push(`${stats.categories.hotel} ${stats.categories.hotel === 1 ? 'stay' : 'stays'}`)
  if (catBits.length >= 2 && stats.total >= 10) {
    parts.push(`Mostly ${catBits.join(', ')}.`)
  }

  // City-specific cultural context (manually curated for top cities).
  if (ctx) {
    parts.push(ctx)
  }

  // Cuisine variety - phrased as actual coverage, not marketing.
  const cuisineStr = formatCuisineList(stats.cuisines)
  if (cuisineStr && stats.total >= 10) {
    parts.push(`Cuisines covered: ${cuisineStr}.`)
  }

  // Pet-friendly - useful tactical info, not filler.
  if (stats.petFriendly >= 3) {
    parts.push(`${stats.petFriendly} of them welcome dogs.`)
  }

  // Verified split - signals data quality and gives an honest
  // "most of these are imports" framing where applicable.
  if (typeof stats.verified === 'number' && stats.total >= 8) {
    const v = stats.verified
    if (v >= 1 && v < stats.total) {
      const rest = stats.total - v
      parts.push(
        v >= stats.total / 2
          ? `${v} are admin-reviewed; ${rest} are community-tracked listings we are still verifying.`
          : `${v} ${v === 1 ? 'is' : 'are'} admin-reviewed so far; the remaining ${rest} come from community and OSM imports.`
      )
    }
  }

  // Mostly-vegan signal — sits between fully_vegan and vegan_friendly,
  // worth surfacing distinctly when present.
  if (typeof stats.mostlyVegan === 'number' && stats.mostlyVegan >= 2) {
    parts.push(`${stats.mostlyVegan} are mostly-vegan venues with a small non-vegan menu.`)
  }

  // Top picks — drives unique content per city and densifies internal links
  // (the names are also rendered as anchors elsewhere on the page).
  const picks = formatPlaceNames(stats.topPicks ?? [], 3)
  if (picks && stats.total >= 6) {
    parts.push(`Notable spots include ${picks}.`)
  }

  // Practical info — open hours / web presence — useful trip-planning signal.
  if (typeof stats.withHours === 'number' && stats.total >= 10) {
    const pct = Math.round((stats.withHours / stats.total) * 100)
    if (pct >= 30 && pct <= 95) {
      parts.push(`Roughly ${pct}% have published opening hours.`)
    }
  }

  return parts.join(' ')
}
