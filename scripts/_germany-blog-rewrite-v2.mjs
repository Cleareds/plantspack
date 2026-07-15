import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const COLLAGE = 'https://mfeelaqjbtnypoojhfjp.supabase.co/storage/v1/object/public/blog-images/beyond-berlin-germany-collage-mpe7p13v.webp'

const content = `# Beyond Berlin: Germany's strongest vegan cities

![Hamburg, Munich, Nuremberg, Leipzig, Cologne, Dresden — Germany's six strongest non-Berlin vegan cities](${COLLAGE})

Berlin gets all the vegan press, and most of it is earned: [178 verified 100% vegan venues](/vegan-places/germany/berlin), plant-based restaurants on most corners, and Germany's first 100% plant-based supermarket (REWE voll pflanzlich on Warschauer Brücke, opened 11 April 2024). But Berlin is one city in a country of 80 million people, and if you're plant-based and not landing at BER, the question is: where else does Germany actually work?

We audited every German city on Plants Pack against a single strict metric — venues where the menu is verified 100% vegan, not just "has vegan options". Six non-Berlin cities consistently delivered.

## [Hamburg](/vegan-places/germany/hamburg)

Northern port city, distinctive food culture, and the biggest vegan scene outside Berlin and Munich. **65 verified 100% vegan venues.** The HafenCity / Sternschanze / St. Pauli corridor stacks several solid options within walking distance, and the suburbs add more.

**Don't miss:**

- [The Vegan Eagle](/place/the-vegan-eagle-hamburg) — Wischhöfen 4, Langenhorn (close to Hamburg Airport). Cosy plant-based fine-casual.
- [Bodhi Vegan Living St. Georg](/place/bodhi-vegan-living-hamburg) — long-standing Bavarian-vegan kitchen with central-Hamburg setting.
- [Vincent at Steintorwall](/place/vincent-vegan-hamburg-2) — vegan fast food at Hauptbahnhof.
- [TA Vegan House](/place/ta-vegan-house-hamburg) — fully vegan Asian.
- [HappenPappen](/place/happenpappen-hamburg) — all-vegan brunch, burgers and cake in the Karoviertel.

## [Munich](/vegan-places/germany/munich)

Bavaria's plant-based capital with **47 verified venues**, leaning slightly more upmarket than the Northern cities. The Glockenbachviertel and Maxvorstadt area stacks several spots within easy walking distance.

**Don't miss:**

- [Bodhi](/place/bodhi-munich) — Ligsalzstraße 23, fully vegan since December 2013, the city's reference Bavarian-vegan kitchen.
- [Doctor Drooly](/place/doctor-drooly-munich) — serious vegan pizza.
- [Secret Garden Vegan Sushi](/place/secret-garden-vegan-sushi-munich) — fully plant-based sushi near the Viktualienmarkt.
- [Soy Vegan](/place/soy-vegan-munchen-munich) — fully vegan Asian fast-casual.
- [Akimy](/place/akimy-munchen) — fully vegan ramen and rice bowls.

## [Nuremberg](/vegan-places/germany/nuremberg)

The dark horse. **40 verified venues** in a compact old town, with a disproportionately high share of those venues 100% vegan rather than vegan-friendly. The pedestrian district makes walking between them realistic in a day.

**Don't miss:**

- [Vegöner Johannis](/place/vegoner-johannis-nuremberg) — vegan döner; the local benchmark.
- [Pure Food — The Vegan Café & Bar](/place/pure-food-nuremberg) — Reichstraße 10, 100% vegan bowls, burgers and homemade gnocchi.
- [My Hao](/place/my-hao-nurnberg) — fully vegan Vietnamese.

For an even broader Bavarian sweep, [Veganoven in nearby Erlangen](/place/veganoven-erlangen) (a 20-minute train from Nuremberg Hbf) does Neapolitan-style vegan pizza and is worth the detour.

## [Leipzig](/vegan-places/germany/leipzig)

Eastern Germany's most plant-friendly city. **36 verified venues**, with the heaviest concentration in Südvorstadt around Karl-Liebknecht-Straße (the "Karli"). Leipzig leans young, student, and counter-cultural — exactly the demographic that drives sustained vegan growth.

**Don't miss:**

- [Vleischerei](/place/vleischerei-leipzig) — vegan butcher concept (founded 2008), a national reference point. Now on Eisenbahnstraße.
- [Zest](/place/zest-leipzig) — fully vegan fine-casual dinner.
- [BABA Handmade Cafe](/place/baba-hand-made-cafe-leipzig) — Polish-vegan, organic, fair-trade.
- [Pizza LAB](/place/pizza-lab-leipzig) — fully vegan pizzeria.
- [GAO Vegan](/place/gao-vegan-leipzig) — Asian-vegan.
- [Katzentempel Leipzig](/place/katzentempel-leipzig) — national vegan cat-cafe chain.

(Symbiose on the Karli closed in August 2023 after a decade as the area's vegan anchor — we've archived our listing.)

## [Cologne](/vegan-places/germany/cologne)

**34 verified 100% vegan venues** across a Rhineland city that under-sells its vegan scene. The Belgisches Viertel and Ehrenfeld neighbourhoods host the cluster.

**Don't miss:**

- [Cotell](/place/cotell-cologne) — fully vegan fine-dining at Mauritiussteinweg 2 from the MakiMaki team; small/medium 3-5 course menus.
- [MakiMaki Sushi Green Köln](/place/maki-maki-sushi-green-koln-cologne) — 50+ vegan rolls in an intimate, plastic-free interior.
- [Virtuous Pie](/place/virtuous-pie-cologne) — fully vegan pizza, brought to Cologne in 2018 by a Canadian-German couple after years running the original in Vancouver.
- [Hempies](/place/hempies-cologne) — hemp + vegan fast-casual.
- [Vevi](/place/vevi-cologne) — fully vegan vintage café in the Belgisches Viertel.
- [Sattgrün Köln](/place/sattgrun-cologne) — vegan organic buffet, the city's lunch staple.

## [Dresden](/vegan-places/germany/dresden)

**31 verified venues**, mostly clustered in the Neustadt district north of the river.

**Don't miss:**

- [Steffenhagen](/place/steffenhagen-dresden) — Schönfelder Straße 2, homemade vegan dishes in a relaxed Neustadt setting.
- [Falscher Hase](/place/falscher-hase-dresden) — 100% vegan Hechtviertel restaurant since 2011; Soljanka, Nussbraten, burgers and a beer garden.
- [Vegan House Dresden](/place/vegan-house-dresden) — fully vegan Vietnamese on Alaunstraße.
- [V-Cake Café](/place/v-cake-dresden) — fully vegan dessert + cake spot.
- [Alua](/place/alua-vegan-catering-and-cafe-dresden) — vegan catering + café.

## How we verified this

Every venue counted as "100% vegan" went through at least one of:

1. The venue's own website declares 100% vegan, rein vegan, or plant-based-only.
2. OSM \`diet:vegan=only\` tag plus a second source (Fat Gay Vegan, community blog, HappyCow's curated top-10 lists).
3. Manual admin verification for well-known venues that lack a website (food trucks, market stalls, small bakeries).

Anywhere we couldn't verify, we left the venue at \`mostly_vegan\` or \`vegan_friendly\` and excluded it from these counts. That's why our numbers are smaller than directories that auto-tag OSM data without verification. In May 2026 we audited the full Germany fully-vegan dataset and downgraded around 400 records that had been imported with the wrong tag — mostly regular ice cream parlours, kebab shops, and chain bakeries. The numbers above reflect the cleanup.

## Sources we cross-checked against

For this update we re-verified each named venue against the official website, HappyCow's current status, and at least one independent local guide (Mit Vergnügen, Geheimtipp Hamburg, Veganfreundlich.org, Deutschland ist Vegan, regional Mit Vergnügen / city-tourism pages). A few corrections from that pass:

- **Symbiose Leipzig** is permanently closed since August 2023 and has been archived from our directory.
- **Bodhi Munich** opened in December 2013, not 2010 (we had it wrong in the first draft).
- **sushi green Cologne** is the same venue as **MakiMaki Sushi Green Köln** (one duplicate record archived).
- **Vegan Junk Food Bar Cologne** has conflicting open-status signals (HappyCow shows closed; other German guides still list it) and is currently held in our admin re-verification queue.

## What we might have missed

We're thinner on coverage in:

- **[Düsseldorf](/vegan-places/germany/dusseldorf) and [Dortmund](/vegan-places/germany/dortmund)**: 23 and 15 verified respectively. Almost certainly undercovered. Worth a separate Rhine-Ruhr piece.
- **[Bremen](/vegan-places/germany/bremen) and [Hannover](/vegan-places/germany/hannover)**: 36 and 25 verified, both quietly strong. Possible follow-up.
- **Smaller university towns**: [Bamberg](/vegan-places/germany/bamberg), [Heidelberg](/vegan-places/germany/heidelberg), [Freiburg](/vegan-places/germany/freiburg-im-breisgau), [Kassel](/vegan-places/germany/kassel), [Münster](/vegan-places/germany/munster), [Kiel](/vegan-places/germany/kiel), [Mannheim](/vegan-places/germany/mannheim), [Halle (Saale)](/vegan-places/germany/halle-saale) each have 14-19 verified venues that punch above their weight. We'll cover these in a dedicated "small German vegan towns" piece.

If you spot something we got wrong, every place page has a "report update" button. Corrections land in our admin queue weekly.

---

**Want to support work like this?** Plants Pack is free and ad-free. We publish posts like this one because supporters fund the audit work behind them. [Support us for EUR 3/month](/support).`

const { data: post } = await sb.from('posts').select('id').eq('slug','beyond-berlin-germany-s-strongest-vegan-cities-2026').maybeSingle()
if (!post) { console.log('not found'); process.exit(1) }
const { error } = await sb.from('posts').update({
  content,
  image_url: COLLAGE,
  updated_at: new Date().toISOString(),
}).eq('id', post.id)
console.log(error ? `✗ ${error.message}` : `✓ Updated post ${post.id}: ${content.length} chars`)
