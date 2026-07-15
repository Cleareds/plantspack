import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const cityImages = JSON.parse(readFileSync('public/data/city-images.json','utf-8'))
const img = (city) => cityImages[`${city}|||Germany`]?.split('?')[0]
const COLLAGE = 'https://mfeelaqjbtnypoojhfjp.supabase.co/storage/v1/object/public/blog-images/beyond-berlin-germany-collage-mpe7p13v.webp'
const TITLE = 'Beyond Berlin: 6 best vegan cities in Germany (2026 audit)'

const content = `Berlin has Germany's biggest vegan scene by a wide margin - 178 venues we currently classify as 100% vegan. But six other German cities also deliver enough verified plant-based dining to anchor a weekend, a city break, or a longer plant-based trip. This guide is based on Plants Pack's May 2026 audit. Counts will shift as venues open, close, or get reclassified after we verify them.

A note on terminology: "100% vegan" on Plants Pack means every food and drink item the venue serves is vegan. Places with a strong vegan menu but mixed items elsewhere sit at \`mostly vegan\`, \`vegan friendly\`, or \`vegan options\` and are excluded from the counts below.

## At a glance: how the six cities compare

| Rank | City | 100% vegan venues | Best neighbourhoods | Best for |
| --- | --- | --- | --- | --- |
| 1 | [Hamburg](/vegan-places/germany/hamburg) | 65 | HafenCity, Sternschanze, St. Pauli, Karoviertel | Widest range; easiest weekend trip beyond Berlin |
| 2 | [Munich](/vegan-places/germany/munich) | 47 | Glockenbachviertel, Maxvorstadt | Bavarian crossover, slightly more upmarket dining |
| 3 | [Nuremberg](/vegan-places/germany/nuremberg) | 40 | Altstadt pedestrian core | Compact city break, high vegan-only density |
| 4 | [Leipzig](/vegan-places/germany/leipzig) | 36 | Südvorstadt (Karl-Liebknecht-Straße / "Karli") | Student scene, creative vegan culture, lower prices |
| 5 | [Cologne](/vegan-places/germany/cologne) | 34 | Belgisches Viertel, Ehrenfeld | Rhineland base for multi-cuisine vegan dining |
| 6 | [Dresden](/vegan-places/germany/dresden) | 31 | Neustadt (Hechtviertel, Alaunstraße) | Walkable Eastern Germany weekend |

The full ranking sits on top of the bigger [Germany country page](/vegan-places/germany), which lists every verified venue including smaller cities we don't cover here.

## [Hamburg](/vegan-places/germany/hamburg) - Best for: widest range, weekend trips

![Hamburg, Germany - vegan scene cluster around HafenCity, Sternschanze and St. Pauli](${img('Hamburg')})

Northern port city, distinctive food culture, and the biggest vegan scene outside Berlin and Munich. **65 verified 100% vegan venues.** The HafenCity / Sternschanze / St. Pauli corridor stacks several solid options within walking distance, and the suburbs add more. Hamburg also hosts two of Germany's biggest vegan-fast-food chains (Vincent and Katzentempel), which both push a Northern-German vegan template that has since spread nationally.

External cross-references: [HappyCow's Hamburg top-10](https://www.happycow.net/best-vegan-restaurants/hamburg-germany), [Geheimtipp Hamburg](https://geheimtipphamburg.de/geheimtipp/happenpappen-veganverliebt-in-hamburg/).

**Three to start with:**

[[place:the-vegan-eagle-hamburg]]
[[place:happenpappen-hamburg]]
[[place:ta-vegan-house-hamburg]]

## [Munich](/vegan-places/germany/munich) - Best for: Bavarian crossover and upmarket dining

![Munich, Germany - Bavarian plant-based capital, leaning upmarket](${img('Munich')})

Bavaria's plant-based capital with **47 verified venues**, leaning slightly more upmarket than the Northern cities. The Glockenbachviertel and Maxvorstadt area stacks several spots within easy walking distance. Bodhi at Ligsalzstraße 23 has been the city's reference Bavarian-vegan kitchen since December 2013 - vegan schnitzel, kaiserschmarrn, mushroom ragout - and remains a strong first-night choice.

External cross-references: [Deutschland ist Vegan on Bodhi](https://www.deutschlandistvegan.de/bodhi-bar-und-veganes-restaurant-in-muenchen/), [HappyCow's Munich list](https://www.happycow.net/best-vegan-restaurants/munich-germany).

**Three to start with:**

[[place:bodhi-munich]]
[[place:doctor-drooly-munich]]
[[place:akimy-munchen]]

## [Nuremberg](/vegan-places/germany/nuremberg) - Best for: compact city breaks, high vegan-only density

![Nuremberg, Germany - compact old town with a high vegan-only share](${img('Nuremberg')})

The dark horse. **40 verified venues** in a compact old town, with a disproportionately high share of those venues 100% vegan rather than vegan friendly. The Altstadt's pedestrian district makes walking between Vegöner, Pure Food, My Hao and Katzentempel realistic in a single day. For an even broader Bavarian sweep, [Veganoven in nearby Erlangen](/place/veganoven-erlangen) is a 20-minute train from Nuremberg Hbf and does Neapolitan-style vegan pizza worth the detour.

External cross-references: [Vegan-life-style.com Nuremberg guide](https://vegan-life-style.com/vegan-food-nuremberg/), [Pure Food's own menu](https://www.purefoodcafe.de/).

**Three to start with:**

[[place:vegoner-johannis-nuremberg]]
[[place:pure-food-nuremberg]]
[[place:my-hao-nurnberg]]

## [Leipzig](/vegan-places/germany/leipzig) - Best for: student scene, creative vegan culture

![Leipzig, Germany - Eastern Germany's most plant-friendly city](${img('Leipzig')})

Eastern Germany's most plant-friendly city. **36 verified venues**, with the heaviest concentration in Südvorstadt around Karl-Liebknecht-Straße (the "Karli"). Leipzig leans young, student, and counter-cultural - exactly the demographic that drives sustained vegan growth. Vleischerei, the city's vegan butcher concept, has been operating since 2008 and remains a national reference. Symbiose on the Karli, a long-standing local favourite, closed in August 2023 and is no longer in our directory.

External cross-references: [Vleischerei's own site](https://vleischerei.de/), [Leipzigartig food guide](https://leipzigartig.de/).

**Three to start with:**

[[place:vleischerei-leipzig]]
[[place:zest-leipzig]]
[[place:pizza-lab-leipzig]]

## [Cologne](/vegan-places/germany/cologne) - Best for: Rhineland base, multi-cuisine spread

![Cologne, Germany - Rhineland vegan scene clustered in Belgisches Viertel and Ehrenfeld](${img('Cologne')})

**34 verified 100% vegan venues** across a Rhineland city that under-sells its vegan scene. The Belgisches Viertel and Ehrenfeld neighbourhoods host the cluster, with cuisines spanning Vancouver-import pizza, dedicated vegan sushi, Mediterranean buffet and modern fine dining. Cologne is geographically central and easy to combine with a Düsseldorf or Bonn day trip.

External cross-references: [Mit Vergnügen Köln on the MakiMaki / Cotell team](https://koeln.mitvergnuegen.com/tipps/veganes-fine-dining-die-maki-maki-crew-ist-mit-cotell-zurueck/), [HappyCow's Cologne top-10](https://www.happycow.net/best-vegan-restaurants/cologne-germany).

**Three to start with:**

[[place:virtuous-pie-cologne]]
[[place:vevi-cologne]]
[[place:sattgrun-cologne]]

Cologne's [Cotell](/place/cotell-cologne) (fully vegan fine dining from the MakiMaki team) and [MakiMaki Sushi Green Köln](/place/maki-maki-sushi-green-koln-cologne) are also worth visiting - we're still sourcing hero photos for both, so they're not in the card list above.

## [Dresden](/vegan-places/germany/dresden) - Best for: walkable Eastern Germany weekend

![Dresden, Germany - Neustadt district north of the river holds the vegan cluster](${img('Dresden')})

**31 verified venues**, mostly clustered in the Neustadt district north of the river. Falscher Hase has anchored the Hechtviertel since 2011; Steffenhagen on Schönfelder Straße does homemade vegan Hausmannskost in a relaxed Neustadt setting. Dresden pairs well with a Leipzig leg for a longer Eastern Germany vegan trip.

External cross-references: [Falscher Hase's own site](https://falscher-hase.com/), [Steffenhagen](https://www.steffenhagen-dd.de/), [Visit Dresden gastro page](https://www.visit-dresden-elbland.de/en/gastro/steffenhagen).

**Three to start with:**

[[place:falscher-hase-dresden]]
[[place:steffenhagen-dresden]]
[[place:vegan-house-dresden]]

## How we verified this - May 2026 audit

For a venue to count towards the "100% vegan venues" numbers above, we required at least one of:

1. **Official site / menu** explicitly states 100% vegan, rein vegan, voll vegan, plant-based only, or pflanzlich. This is the strongest single signal.
2. **OSM \`diet:vegan=only\` community tag**, supported by a second independent source (a HappyCow curated top-10 listing, a regional vegan blog, Veganfreundlich.org, or a tourist board page).
3. **Manual admin verification** for well-known venues that have no website (food trucks, market stalls, small bakeries) but appear consistently in trusted German vegan media.

Anywhere we couldn't satisfy at least one of these, we left the venue at \`mostly vegan\`, \`vegan friendly\`, or \`vegan options\` and excluded it from these counts. In May 2026 we audited the full Germany 100% vegan dataset and downgraded around 400 records that had been imported with the wrong tag - mostly regular ice cream parlours, kebab shops, and chain bakeries. The numbers above reflect that cleanup.

A few corrections worth flagging:

- **Symbiose Leipzig** is permanently closed since August 2023 ([HappyCow listing](https://www.happycow.net/reviews/symbiose-leipzig-38724)) and has been archived from our directory.
- **Bodhi Munich** opened in December 2013, not 2010 as our first draft stated.
- **sushi green Cologne** is the same venue as MakiMaki Sushi Green Köln. We archived the duplicate record.
- **Vegan Junk Food Bar Cologne** has conflicting open-status signals; we're holding it in our admin re-verification queue.

This audit is a snapshot. Venues open and close every month. We'll re-publish updated counts each season.

## What we might have missed

We're thinner on coverage in:

- **[Düsseldorf](/vegan-places/germany/dusseldorf) and [Dortmund](/vegan-places/germany/dortmund)** (23 and 15 verified). Almost certainly undercovered. A Rhine-Ruhr piece is on the editorial queue.
- **[Bremen](/vegan-places/germany/bremen) and [Hannover](/vegan-places/germany/hannover)** (36 and 25 verified) - quietly strong.
- **Smaller university towns**: [Bamberg](/vegan-places/germany/bamberg), [Heidelberg](/vegan-places/germany/heidelberg), [Freiburg](/vegan-places/germany/freiburg-im-breisgau), [Kassel](/vegan-places/germany/kassel), [Münster](/vegan-places/germany/munster), [Kiel](/vegan-places/germany/kiel), [Mannheim](/vegan-places/germany/mannheim), [Halle (Saale)](/vegan-places/germany/halle-saale) each have 14-19 verified venues that punch above their weight per capita. We'll cover these in a dedicated "small German vegan towns" piece.

## Help us keep this accurate

Three ways the data improves over time:

**Signed-in readers** can hit the "Suggest correction" button on any place page if opening hours, address, vegan status or anything else is off. Corrections land in our admin queue and we review them weekly. Not signed in yet? It's free - [create an account](/auth/signup) or [sign in](/auth/login) to start contributing.

**Venue owners** can claim their listing from the place page using the "Claim ownership" button. Once an ownership claim is approved, you get direct edit access to your own place page - update photos, hours, menu links, and verify your 100% vegan status without going through moderation. Owner-confirmed listings are flagged as such on the public page.

**Supporters** ([EUR 3/month](/support)) get direct edit access to every place on Plants Pack, the supporter badge, roadmap voting, and a public wall listing. Supporter edits land instantly. The supporter tier is also what funds audits like this one - Plants Pack is free, ad-free, and entirely reader-supported.

## Frequently asked questions

### What is the best vegan city in Germany besides Berlin?

Hamburg, by venue count: 65 verified 100% vegan places. The HafenCity, Sternschanze and St. Pauli corridor clusters most of them within walking distance, and the city hosts the headquarters of two major vegan-fast-food chains (Vincent and Katzentempel). Munich is a close second at 47 verified venues with a more upmarket lean.

### Is Hamburg good for vegans?

Yes - Hamburg has the widest range of verified 100% vegan venues outside Berlin and the city is compact enough that you can hit several on foot or with one metro change. Strong picks include The Vegan Eagle in Langenhorn, HappenPappen in the Karoviertel, and TA Vegan House for fully vegan Asian.

### Is Munich good for vegan food?

Yes. 47 verified fully vegan venues, including Bodhi (Bavarian vegan since December 2013), Doctor Drooly (vegan pizza), Secret Garden Vegan Sushi, Akimy (ramen and rice bowls), and Soy Vegan. The Glockenbachviertel and Maxvorstadt are the densest walking neighbourhoods.

### Which smaller German cities are good for vegans?

Halle (Saale), Heidelberg, Freiburg im Breisgau, Münster, Kiel, Mannheim, Bamberg and Kassel each have 14-19 verified 100% vegan venues - high counts relative to their populations. A dedicated guide is on the way.

### What does "verified 100% vegan" mean on Plants Pack?

It means at least one of: (a) the venue's own website explicitly states 100% vegan / rein vegan / plant-based only; (b) OpenStreetMap's \`diet:vegan=only\` community tag is supported by a second independent source; or (c) the venue is manually verified by a Plants Pack admin. Anything ambiguous defaults to \`vegan friendly\` and is excluded from the 100% vegan count.

---

*Last audited: May 2026.*`

const POST_ID = '030ebac1-b79b-43ff-b8f2-894cdb4b3f27'
const { error } = await sb.from('posts').update({
  title: TITLE,
  content,
  image_url: COLLAGE,
  privacy: 'public',
  tags: ['country-audit', 'germany'],
  updated_at: new Date().toISOString(),
}).eq('id', POST_ID)
console.log(error ? `✗ ${error.message}` : `✓ Updated ${POST_ID}: ${content.length} chars, tags=[country-audit, germany]`)
