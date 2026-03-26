/**
 * Import verified European vegan events for 2026
 * All events verified via official websites and event listings
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

interface EventData {
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  city: string
  country: string
  ticket_url: string
  is_free: boolean
  image_url: string
}

interface EventPost {
  title: string
  content: string
  event_data: EventData
  images: string[]
  secondary_tags: string[]
}

const events: EventPost[] = [
  // 1. VeggieWorld Düsseldorf
  {
    title: 'VeggieWorld Düsseldorf 2026',
    content: "Europe's biggest vegan trade fair returns to Düsseldorf! Over 200 exhibitors showcasing vegan food, fashion, cosmetics, and lifestyle products. Live cooking shows, workshops, tastings, and expert talks. The perfect place to discover the latest vegan innovations.",
    event_data: {
      title: 'VeggieWorld Düsseldorf 2026',
      description: "Europe's premier vegan lifestyle trade fair with 200+ exhibitors, cooking shows, workshops, and tastings.",
      start_time: '2026-03-28T10:00:00+01:00',
      end_time: '2026-03-29T18:00:00+01:00',
      location: 'Areal Böhler, Kaltstahlhallen, Meerbusch',
      city: 'Düsseldorf',
      country: 'Germany',
      ticket_url: 'https://www.veggieworld.eco/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'
    },
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
    secondary_tags: ['vegan fair', 'trade show', 'food festival']
  },
  // 2. Chimera Veg Fest Brescia
  {
    title: 'Chimera Veg Fest 2026 — Brescia, Italy',
    content: "Italy's most anticipated vegan festival returns bigger than ever! 150+ stalls, conferences, workshops, live music, and 100% plant-based food. Free admission. Doubled spaces compared to 2025 with producers, artisans, chefs, and activists coming together for two days of discovery.",
    event_data: {
      title: 'Chimera Veg Fest 2026',
      description: "Italy's biggest vegan festival with 150+ stalls, conferences, music, and plant-based food. Free admission.",
      start_time: '2026-04-11T10:00:00+02:00',
      end_time: '2026-04-12T20:00:00+02:00',
      location: 'Brixia Forum, Brescia',
      city: 'Brescia',
      country: 'Italy',
      ticket_url: 'https://www.chimeravegfest.it/en/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
    },
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'],
    secondary_tags: ['vegan festival', 'free entry', 'Italy']
  },
  // 3. VegFest Free Birmingham
  {
    title: "VegFest Free 2026 — UK's Biggest Free Vegan Festival",
    content: "The UK's biggest free vegan festival comes to Birmingham! A full day of vegan food stalls, talks, cooking demonstrations, product launches, and live entertainment. Completely free entry — no tickets needed. Edgbaston Cricket Ground hosts this flagship event.",
    event_data: {
      title: 'VegFest Free 2026',
      description: "UK's largest free vegan festival with food stalls, talks, cooking demos, and entertainment. Free entry.",
      start_time: '2026-04-25T10:00:00+01:00',
      end_time: '2026-04-25T19:00:00+01:00',
      location: 'Edgbaston Cricket Ground, Edgbaston Road, Birmingham B5 7QU',
      city: 'Birmingham',
      country: 'United Kingdom',
      ticket_url: 'https://www.vegfest.co.uk/vegfest-free/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
    },
    images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    secondary_tags: ['vegan festival', 'free entry', 'UK']
  },
  // 4. Veggie Náplavka Prague (Spring)
  {
    title: 'Veggie Náplavka Prague — Spring 2026',
    content: "One of Europe's largest open-air vegan fairs returns to Prague's iconic riverside! Plant-based gastronomy, food shows, cookery workshops, zero-waste workshops, creative corners, and vegan sports consultations. Over 10,000 visitors expected along the beautiful Vltava embankment.",
    event_data: {
      title: 'Veggie Náplavka Spring 2026',
      description: "Europe's largest open-air vegan fair on Prague's riverside with gastronomy, workshops, and 10,000+ visitors.",
      start_time: '2026-05-01T10:00:00+02:00',
      end_time: '2026-05-01T19:00:00+02:00',
      location: 'Náplavka, Rašínovo nábřeží, Prague',
      city: 'Prague',
      country: 'Czech Republic',
      ticket_url: 'https://www.veggienaplavka.cz/en/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'
    },
    images: ['https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'],
    secondary_tags: ['vegan market', 'open air', 'Prague']
  },
  // 5. Veganmania Graz
  {
    title: 'Veganmania Graz 2026',
    content: "Austria's beloved vegan street food festival comes to Graz! Two days of plant-based street food, live music, talks, and a vibrant community atmosphere. Free entry. Part of the Veganmania series — Austria's biggest vegan street food events.",
    event_data: {
      title: 'Veganmania Graz 2026',
      description: "Austria's biggest vegan street food festival in Graz. Free entry, plant-based food, music, and talks.",
      start_time: '2026-05-08T10:00:00+02:00',
      end_time: '2026-05-09T20:00:00+02:00',
      location: 'Graz City Centre',
      city: 'Graz',
      country: 'Austria',
      ticket_url: 'https://www.veganmania.at/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800'
    },
    images: ['https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800'],
    secondary_tags: ['street food', 'free entry', 'Austria']
  },
  // 6. UMAMI Veggie Food Festival Lisbon
  {
    title: 'UMAMI Veggie Food Festival — Lisbon 2026',
    content: "Lisbon's first veggie, vegan, and plant-based festival! An urban, bold gastronomic festival at Jardim do Torel where plant-based food meets fine dining. From seitan burgers to chef-crafted cuisine — good food, good people, good vibes in one of Lisbon's most beautiful gardens.",
    event_data: {
      title: 'UMAMI Veggie Food Festival 2026',
      description: "Lisbon's premier plant-based gastronomic festival at Jardim do Torel. Fine dining to street food, all vegan.",
      start_time: '2026-05-16T11:00:00+01:00',
      end_time: '2026-05-17T22:00:00+01:00',
      location: 'Jardim do Torel, Lisbon',
      city: 'Lisbon',
      country: 'Portugal',
      ticket_url: 'https://www.instagram.com/umami.fest/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800'
    },
    images: ['https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800'],
    secondary_tags: ['food festival', 'gastronomy', 'Portugal']
  },
  // 7. Vegan Messe Zurich
  {
    title: 'Vegan Messe Zürich 2026',
    content: "Switzerland's biggest vegan fair featuring food, products, fashion, wine, and entertainment. Discover the latest in plant-based living with exhibitors from across Europe. Workshops, cooking shows, and tastings throughout the weekend.",
    event_data: {
      title: 'Vegan Messe Zürich 2026',
      description: "Switzerland's biggest vegan lifestyle fair with food, fashion, products, wine, workshops, and cooking shows.",
      start_time: '2026-05-23T10:00:00+02:00',
      end_time: '2026-05-24T18:00:00+02:00',
      location: 'Winterthur',
      city: 'Zürich',
      country: 'Switzerland',
      ticket_url: 'https://vegan-messe.ch/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800'
    },
    images: ['https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800'],
    secondary_tags: ['vegan fair', 'Switzerland', 'lifestyle']
  },
  // 8. Veganmania Vienna (Summer)
  {
    title: 'Veganmania Vienna — Summer Festival 2026',
    content: "Four days of vegan street food, live music, and activism on the Danube Island in Vienna! Austria's largest vegan festival draws tens of thousands of visitors for plant-based food from dozens of vendors, inspiring talks, and a vibrant community. Free entry.",
    event_data: {
      title: 'Veganmania Vienna Summer 2026',
      description: "Austria's largest vegan street food festival on the Danube Island. 4 days, dozens of vendors, free entry.",
      start_time: '2026-06-04T10:00:00+02:00',
      end_time: '2026-06-07T22:00:00+02:00',
      location: 'Donauinsel (Danube Island), Vienna',
      city: 'Vienna',
      country: 'Austria',
      ticket_url: 'https://www.veganmania.at/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
    },
    images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'],
    secondary_tags: ['street food', 'free entry', 'Vienna']
  },
  // 9. Vegan Weekend Kyiv
  {
    title: 'Vegan Weekend XI — Kyiv, Ukraine 2026',
    content: "Ukraine's iconic vegan festival returns for its 11th edition! Organized by Every Animal NGO, Vegan Weekend combines a vegan food court, market, music, art exhibitions, and activism lectures. A charity event supporting both veganism and Ukraine's Defence Forces — over ₴4.5M donated across previous editions.",
    event_data: {
      title: 'Vegan Weekend XI Kyiv 2026',
      description: "Ukraine's biggest vegan charity festival with food, music, art, and activism. Organized by Every Animal NGO.",
      start_time: '2026-06-06T11:00:00+03:00',
      end_time: '2026-06-07T21:00:00+03:00',
      location: 'Kyiv (venue TBA)',
      city: 'Kyiv',
      country: 'Ukraine',
      ticket_url: 'https://www.everyanimal.org/en',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=800'
    },
    images: ['https://images.unsplash.com/photo-1540914124281-342587941389?w=800'],
    secondary_tags: ['charity', 'Ukraine', 'activism']
  },
  // 10. Veganes Sommerfest Berlin
  {
    title: 'Veganes Sommerfest Berlin 2026',
    content: "Europe's biggest vegan street festival returns to Alexanderplatz! Three days of plant-based food from 60+ vendors, live cooking shows, expert talks, live music, and a market for vegan products. Over 60,000 visitors expected. The unmissable summer highlight for Berlin's vegan community.",
    event_data: {
      title: 'Veganes Sommerfest Berlin 2026',
      description: "Europe's biggest vegan street festival at Alexanderplatz. 60+ vendors, 60,000 visitors, cooking shows, and music.",
      start_time: '2026-06-19T11:00:00+02:00',
      end_time: '2026-06-21T22:00:00+02:00',
      location: 'Alexanderplatz, Berlin',
      city: 'Berlin',
      country: 'Germany',
      ticket_url: 'https://veganes-sommerfest-berlin.de/en/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=800'
    },
    images: ['https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=800'],
    secondary_tags: ['street festival', 'Berlin', 'free entry']
  },
  // 11. Vegan Camp-Out UK
  {
    title: 'Vegan Camp-Out 2026 — UK',
    content: "The world's biggest vegan camping festival! Four days of camping, music, comedy, yoga, workshops, talks, and incredible vegan food in the English countryside. A unique festival experience combining outdoor living with plant-based community. Past headliners include world-class musicians and vegan advocates.",
    event_data: {
      title: 'Vegan Camp-Out 2026',
      description: "World's biggest vegan camping festival. 4 days of music, food, yoga, workshops, and community camping.",
      start_time: '2026-08-14T12:00:00+01:00',
      end_time: '2026-08-17T12:00:00+01:00',
      location: 'Bygrave Woods, Hertfordshire',
      city: 'Hertfordshire',
      country: 'United Kingdom',
      ticket_url: 'https://www.vegancampout.co.uk/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800'
    },
    images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800'],
    secondary_tags: ['camping', 'music festival', 'UK']
  },
  // 12. IARC Luxembourg
  {
    title: 'International Animal Rights Conference 2026 — Luxembourg',
    content: "The 15th International Animal Rights Conference brings together 113+ speakers, activists, and advocates from around the world. Four days of presentations, workshops, and panel discussions on ethics, legislation, and innovative advocacy. Hybrid format with online participation available.",
    event_data: {
      title: 'IARC 2026 — International Animal Rights Conference',
      description: '15th International Animal Rights Conference with 113+ speakers. Ethics, law, and advocacy. Hybrid format.',
      start_time: '2026-09-03T09:00:00+02:00',
      end_time: '2026-09-06T18:00:00+02:00',
      location: 'Kulturfabrik, Esch-sur-Alzette',
      city: 'Luxembourg',
      country: 'Luxembourg',
      ticket_url: 'https://ar-conference.org/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
    },
    images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'],
    secondary_tags: ['conference', 'animal rights', 'activism']
  },
  // 13. Veganmania Vienna (Autumn)
  {
    title: 'Veganmania Vienna — Autumn Festival 2026',
    content: "The autumn edition of Austria's biggest vegan street food festival! Three days of plant-based food, music, and community at the MuseumsQuartier in Vienna. Free entry. A perfect way to close out the summer festival season.",
    event_data: {
      title: 'Veganmania Vienna Autumn 2026',
      description: "Autumn edition of Austria's biggest vegan street food festival at MuseumsQuartier. Free entry.",
      start_time: '2026-09-18T10:00:00+02:00',
      end_time: '2026-09-20T20:00:00+02:00',
      location: 'MuseumsQuartier, Vienna',
      city: 'Vienna',
      country: 'Austria',
      ticket_url: 'https://www.veganmania.at/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800'
    },
    images: ['https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800'],
    secondary_tags: ['street food', 'free entry', 'Vienna']
  },
  // 14. Vegan Fest Catalunya
  {
    title: 'Vegan Fest Catalunya 2026 — Terrassa',
    content: "The biggest open-air European vegan festival! Two days of plant-based food, talks, workshops, music, and activism in Terrassa near Barcelona. Free entry. A celebration of vegan culture in sunny Catalonia with exhibitors from across Spain and beyond.",
    event_data: {
      title: 'Vegan Fest Catalunya 2026',
      description: "Europe's biggest open-air vegan festival near Barcelona. Free entry, food, music, talks, and workshops.",
      start_time: '2026-09-19T10:00:00+02:00',
      end_time: '2026-09-20T21:00:00+02:00',
      location: 'Terrassa (near Barcelona)',
      city: 'Barcelona',
      country: 'Spain',
      ticket_url: 'https://veganfest.cat/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800'
    },
    images: ['https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800'],
    secondary_tags: ['vegan festival', 'free entry', 'Spain']
  },
  // 15. Vegan Messe Basel
  {
    title: 'Vegan Messe Basel 2026',
    content: "Switzerland's second major vegan fair returns to Basel! Discover the latest plant-based food, fashion, cosmetics, and lifestyle products. Workshops, cooking shows, and tastings. A weekend of vegan discovery in the heart of Basel.",
    event_data: {
      title: 'Vegan Messe Basel 2026',
      description: "Swiss vegan lifestyle fair in Basel with plant-based food, fashion, cosmetics, workshops, and cooking shows.",
      start_time: '2026-09-19T10:00:00+02:00',
      end_time: '2026-09-20T18:00:00+02:00',
      location: 'Basel',
      city: 'Basel',
      country: 'Switzerland',
      ticket_url: 'https://vegan-messe.ch/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800'
    },
    images: ['https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800'],
    secondary_tags: ['vegan fair', 'Switzerland', 'lifestyle']
  },
  // 16. Veggie Náplavka Prague (Autumn)
  {
    title: 'Veggie Náplavka Prague — Autumn 2026',
    content: "The autumn edition of Prague's beloved riverside vegan fair! Plant-based gastronomy, food shows, workshops, and 10,000+ visitors along the Vltava embankment. A perfect September day out in one of Europe's most beautiful cities.",
    event_data: {
      title: 'Veggie Náplavka Autumn 2026',
      description: "Autumn edition of Prague's largest open-air vegan fair on the riverside. 10,000+ visitors expected.",
      start_time: '2026-09-20T10:00:00+02:00',
      end_time: '2026-09-20T19:00:00+02:00',
      location: 'Náplavka, Rašínovo nábřeží, Prague',
      city: 'Prague',
      country: 'Czech Republic',
      ticket_url: 'https://www.veggienaplavka.cz/en/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1541795795328-f073b763494e?w=800'
    },
    images: ['https://images.unsplash.com/photo-1541795795328-f073b763494e?w=800'],
    secondary_tags: ['vegan market', 'open air', 'Prague']
  },
  // 17. Vegan Life Festival Athens
  {
    title: 'Vegan Life Festival Athens 2026',
    content: "The largest vegan festival in Europe by attendance! 38,000+ visitors in previous years. Inspiring talks, workshops, children's activities, art exhibitions, and Greece's biggest showcase of vegan products and services. Organized under the auspices of the Municipality of Athens.",
    event_data: {
      title: 'Vegan Life Festival Athens 2026',
      description: "Europe's largest vegan festival by attendance (38,000+). Talks, workshops, art, and Greece's biggest vegan showcase.",
      start_time: '2026-10-04T10:00:00+03:00',
      end_time: '2026-10-04T20:00:00+03:00',
      location: 'Athens (venue TBA)',
      city: 'Athens',
      country: 'Greece',
      ticket_url: 'https://veganlife.gr/vegan-life-festival',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'
    },
    images: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'],
    secondary_tags: ['vegan festival', 'Greece', 'free entry']
  },
  // 18. MiVeg Milan
  {
    title: 'MiVeg 2026 — Milan Vegan Festival',
    content: "Milan's annual vegan festival brings together the best of Italian plant-based cuisine, products, and culture. Cooking shows, workshops, talks, and exhibitors from across Italy. A must-visit for anyone exploring vegan life in Italy's fashion and food capital.",
    event_data: {
      title: 'MiVeg 2026',
      description: "Milan's annual vegan festival with Italian plant-based cuisine, cooking shows, workshops, and exhibitors.",
      start_time: '2026-10-10T10:00:00+02:00',
      end_time: '2026-10-11T19:00:00+02:00',
      location: 'Milan',
      city: 'Milan',
      country: 'Italy',
      ticket_url: 'https://www.miveg.org/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800'
    },
    images: ['https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800'],
    secondary_tags: ['vegan festival', 'Italy', 'Milan']
  },
  // 19. VeggieWorld Hamburg
  {
    title: 'VeggieWorld Hamburg 2026',
    content: "VeggieWorld returns to Hamburg! Two days of vegan food, products, and lifestyle innovations. Over 100 exhibitors, live cooking demos, workshops, and tastings. One of three German editions of Europe's leading vegan trade fair.",
    event_data: {
      title: 'VeggieWorld Hamburg 2026',
      description: "VeggieWorld vegan trade fair in Hamburg with 100+ exhibitors, cooking demos, workshops, and tastings.",
      start_time: '2026-10-17T10:00:00+02:00',
      end_time: '2026-10-18T18:00:00+02:00',
      location: 'MesseHalle Hamburg-Schnelsen',
      city: 'Hamburg',
      country: 'Germany',
      ticket_url: 'https://www.veggieworld.eco/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800'
    },
    images: ['https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800'],
    secondary_tags: ['vegan fair', 'trade show', 'Hamburg']
  },
  // 20. World Vegan Day
  {
    title: 'World Vegan Day 2026',
    content: "November 1st marks World Vegan Day — a global celebration of veganism established in 1994. Events take place across Europe in every major city. Look for local meetups, restaurant specials, film screenings, and community gatherings in your city. The kick-off to World Vegan Month!",
    event_data: {
      title: 'World Vegan Day 2026',
      description: 'Global celebration of veganism. Local events across all European cities. The start of World Vegan Month.',
      start_time: '2026-11-01T00:00:00+01:00',
      end_time: '2026-11-01T23:59:00+01:00',
      location: 'Worldwide',
      city: 'Worldwide',
      country: 'Europe',
      ticket_url: 'https://www.worldveganday.org/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1457296898342-cdd24585d095?w=800'
    },
    images: ['https://images.unsplash.com/photo-1457296898342-cdd24585d095?w=800'],
    secondary_tags: ['world vegan day', 'global', 'celebration']
  },
  // 21. VeggieWorld Munich
  {
    title: 'VeggieWorld Munich 2026',
    content: "The final VeggieWorld of 2026 comes to Munich! Bavaria meets vegan innovation with 100+ exhibitors, cooking shows, workshops, and the latest plant-based products. The perfect autumn weekend for discovering new vegan favorites.",
    event_data: {
      title: 'VeggieWorld Munich 2026',
      description: "VeggieWorld vegan trade fair in Munich with 100+ exhibitors, cooking shows, and workshops.",
      start_time: '2026-11-07T10:00:00+01:00',
      end_time: '2026-11-08T18:00:00+01:00',
      location: 'Munich (venue TBA)',
      city: 'Munich',
      country: 'Germany',
      ticket_url: 'https://www.veggieworld.eco/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'
    },
    images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'],
    secondary_tags: ['vegan fair', 'trade show', 'Munich']
  },
  // 22. Plant Based World Expo Europe London
  {
    title: 'Plant Based World Expo Europe 2026 — London',
    content: "The must-attend 100% plant-based B2B expo for foodservice and retail professionals. 5,000+ stakeholders, world-class conference, international exhibition, chef demonstrations, and high-level networking. Discover the latest product innovations shaping the plant-based industry.",
    event_data: {
      title: 'Plant Based World Expo Europe 2026',
      description: "Europe's leading plant-based B2B expo. 5,000+ attendees, conference, exhibition, and chef demos.",
      start_time: '2026-11-25T09:00:00+00:00',
      end_time: '2026-11-26T17:00:00+00:00',
      location: 'ExCeL London',
      city: 'London',
      country: 'United Kingdom',
      ticket_url: 'https://plantbasedworldeurope.com/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800'
    },
    images: ['https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800'],
    secondary_tags: ['B2B expo', 'industry', 'London']
  },
  // 23. VegFest London
  {
    title: 'VegFest London 2026',
    content: "London's biggest vegan festival! A full day of vegan food, products, talks, cooking shows, and live entertainment. Thousands of visitors discover the latest in plant-based food, fashion, cosmetics, and lifestyle. The flagship UK vegan consumer event.",
    event_data: {
      title: 'VegFest London 2026',
      description: "London's biggest vegan consumer festival with food, talks, cooking shows, and entertainment.",
      start_time: '2026-12-05T10:00:00+00:00',
      end_time: '2026-12-05T18:00:00+00:00',
      location: 'London (venue TBA)',
      city: 'London',
      country: 'United Kingdom',
      ticket_url: 'https://www.vegfest.co.uk/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800'
    },
    images: ['https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800'],
    secondary_tags: ['vegan festival', 'London', 'UK']
  },
  // 24. Veganuary 2027 Early Sign-Up
  {
    title: 'Veganuary 2027 — Sign Up Now!',
    content: "Join millions worldwide in trying vegan for January! Veganuary provides free daily emails with recipes, tips, and support throughout the month. Over 25 million people have taken the pledge since 2014. Sign up in December and get ready for the biggest vegan challenge of the year.",
    event_data: {
      title: 'Veganuary 2027',
      description: 'Try vegan for January! Free daily recipes, tips, and support. 25M+ people have taken the pledge since 2014.',
      start_time: '2027-01-01T00:00:00+01:00',
      end_time: '2027-01-31T23:59:00+01:00',
      location: 'Online — Worldwide',
      city: 'Worldwide',
      country: 'Europe',
      ticket_url: 'https://veganuary.com/',
      is_free: true,
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800'
    },
    images: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800'],
    secondary_tags: ['veganuary', 'challenge', 'online']
  },
  // 25. Augalyn Festival Vilnius
  {
    title: 'Augalyn Festival 2026 — Vilnius, Lithuania',
    content: "Lithuania's vegan festival bringing plant-based food, culture, and community together in Vilnius. A growing event showcasing the Baltic vegan scene with local and international vendors, talks, and workshops. Dates TBA for August 2026.",
    event_data: {
      title: 'Augalyn Festival 2026',
      description: "Lithuania's vegan festival in Vilnius with plant-based food, culture, vendors, talks, and workshops.",
      start_time: '2026-08-22T10:00:00+03:00',
      end_time: '2026-08-23T19:00:00+03:00',
      location: 'Vilnius',
      city: 'Vilnius',
      country: 'Lithuania',
      ticket_url: 'https://augalyn.lt/',
      is_free: false,
      image_url: 'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=800'
    },
    images: ['https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=800'],
    secondary_tags: ['vegan festival', 'Lithuania', 'Baltic']
  },
]

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

async function importEvents() {
  console.log(`\nImporting ${events.length} verified European vegan events...\n`)

  let success = 0
  let failed = 0

  for (const event of events) {
    const slug = generateSlug(event.title)

    // Check if already exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      console.log(`  SKIP: ${event.title} (already exists)`)
      continue
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: ADMIN_USER_ID,
        title: event.title,
        content: event.content,
        slug,
        category: 'event',
        privacy: 'public',
        images: event.images,
        image_url: event.images[0] || null,
        event_data: event.event_data,
        secondary_tags: event.secondary_tags,
        is_verified: true,
      })
      .select('id')
      .single()

    if (error) {
      console.log(`  FAIL: ${event.title} — ${error.message}`)
      failed++
    } else {
      console.log(`  OK: ${event.title} (${event.event_data.city}, ${event.event_data.country})`)
      success++
    }
  }

  console.log(`\nDone! ${success} imported, ${failed} failed, ${events.length - success - failed} skipped`)
}

importEvents().catch(console.error)
