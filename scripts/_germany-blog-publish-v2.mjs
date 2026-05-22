import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const cityImages = JSON.parse(readFileSync('public/data/city-images.json','utf-8'))
const img = (city) => cityImages[`${city}|||Germany`]?.split('?')[0]
const COLLAGE = 'https://mfeelaqjbtnypoojhfjp.supabase.co/storage/v1/object/public/blog-images/beyond-berlin-germany-collage-mpe7p13v.webp'

const TITLE = "Beyond Berlin: 6 best vegan cities in Germany (2026 audit)"

// Body now omits the H1 + hero image (template renders both)
const content = `Berlin gets all the vegan press, and most of it is earned: [178 verified 100% vegan venues](/vegan-places/germany/berlin), plant-based restaurants on most corners, and Germany's first fully plant-based supermarket ([REWE voll pflanzlich](https://vegconomist.com/retail-e-commerce/rewe-inaugurates-first-fully-plant-based-supermarket-berlin/), opened 11 April 2024 on Warschauer Brücke). But Berlin is one city in a country of 80 million people, and if you're plant-based and not landing at BER, the question is: where else does Germany actually work?

We audited every German city on PlantsPack against a single strict metric — venues where the menu is verified 100% vegan, not just "has vegan options". Six non-Berlin cities consistently delivered.

## [Hamburg](/vegan-places/germany/hamburg)

![Hamburg, Germany — vegan scene cluster around HafenCity, Sternschanze and St. Pauli](${img('Hamburg')})

Northern port city, distinctive food culture, and the biggest vegan scene outside Berlin and Munich. **65 verified 100% vegan venues.** The HafenCity / Sternschanze / St. Pauli corridor stacks several solid options within walking distance, and the suburbs add more. For an outside read of the scene, see [Geheimtipp Hamburg's vegan guides](https://geheimtipphamburg.de/geheimtipp/happenpappen-veganverliebt-in-hamburg/) and [HappyCow's top-10](https://www.happycow.net/best-vegan-restaurants/hamburg-germany).

**Three to start with:**

[[place:the-vegan-eagle-hamburg]]
[[place:happenpappen-hamburg]]
[[place:ta-vegan-house-hamburg]]

## [Munich](/vegan-places/germany/munich)

![Munich, Germany — Bavarian plant-based capital, leaning upmarket](${img('Munich')})

Bavaria's plant-based capital with **47 verified venues**, leaning slightly more upmarket than the Northern cities. The Glockenbachviertel and Maxvorstadt area stacks several spots within easy walking distance. Bodhi's longevity is documented at [Deutschland ist Vegan](https://www.deutschlandistvegan.de/bodhi-bar-und-veganes-restaurant-in-muenchen/); [HappyCow's Munich list](https://www.happycow.net/best-vegan-restaurants/munich-germany) ranks the rest.

**Three to start with:**

[[place:bodhi-munich]]
[[place:doctor-drooly-munich]]
[[place:akimy-munchen]]

## [Nuremberg](/vegan-places/germany/nuremberg)

![Nuremberg, Germany — compact old town with a disproportionately high vegan-only share](${img('Nuremberg')})

The dark horse. **40 verified venues** in a compact old town, with a disproportionately high share of those venues 100% vegan rather than vegan-friendly. The pedestrian district makes walking between them realistic in a day. [Vegan-life-style.com's Nuremberg guide](https://vegan-life-style.com/vegan-food-nuremberg/) covers the scene; [Pure Food's own site](https://www.purefoodcafe.de/) is a useful menu reference.

**Three to start with:**

[[place:vegoner-johannis-nuremberg]]
[[place:pure-food-nuremberg]]
[[place:my-hao-nurnberg]]

For an even broader Bavarian sweep, [Veganoven in nearby Erlangen](/place/veganoven-erlangen) (a 20-minute train from Nuremberg Hbf) does Neapolitan-style vegan pizza and is worth the detour.

## [Leipzig](/vegan-places/germany/leipzig)

![Leipzig, Germany — Eastern Germany's most plant-friendly city](${img('Leipzig')})

Eastern Germany's most plant-friendly city. **36 verified venues**, with the heaviest concentration in Südvorstadt around Karl-Liebknecht-Straße (the "Karli"). Leipzig leans young, student, and counter-cultural — exactly the demographic that drives sustained vegan growth. [Vleischerei's own site](https://vleischerei.de/) documents the 2008 founding; [Leipzigartig](https://leipzigartig.de/) curates the local food scene.

**Three to start with:**

[[place:vleischerei-leipzig]]
[[place:zest-leipzig]]
[[place:pizza-lab-leipzig]]

(Symbiose on the Karli closed in August 2023 after a decade as the area's vegan anchor — we've archived our listing.)

## [Cologne](/vegan-places/germany/cologne)

![Cologne, Germany — Rhineland vegan scene clustered in Belgisches Viertel and Ehrenfeld](${img('Cologne')})

**34 verified 100% vegan venues** across a Rhineland city that under-sells its vegan scene. The Belgisches Viertel and Ehrenfeld neighbourhoods host the cluster. [Mit Vergnügen Köln](https://koeln.mitvergnuegen.com/tipps/veganes-fine-dining-die-maki-maki-crew-ist-mit-cotell-zurueck/) covered the MakiMaki / Cotell story; [HappyCow's Cologne top-10](https://www.happycow.net/best-vegan-restaurants/cologne-germany) is the easiest external reference.

**Three to start with:**

[[place:virtuous-pie-cologne]]
[[place:vevi-cologne]]
[[place:sattgrun-cologne]]

Cologne's [Cotell](/place/cotell-cologne) (fully vegan fine-dining from the MakiMaki team) and [MakiMaki Sushi Green Köln](/place/maki-maki-sushi-green-koln-cologne) are also worth checking — we're still sourcing hero photos for both.

## [Dresden](/vegan-places/germany/dresden)

![Dresden, Germany — Neustadt district north of the river holds the vegan cluster](${img('Dresden')})

**31 verified venues**, mostly clustered in the Neustadt district north of the river. [Falscher Hase's own site](https://falscher-hase.com/) and [Steffenhagen](https://www.steffenhagen-dd.de/) both publish menus; [Visit Dresden's gastro page](https://www.visit-dresden-elbland.de/en/gastro/steffenhagen) gives an outside view.

**Three to start with:**

[[place:falscher-hase-dresden]]
[[place:steffenhagen-dresden]]
[[place:vegan-house-dresden]]

## How we verified this

Every venue counted as "100% vegan" went through at least one of:

1. The venue's own website declares 100% vegan, rein vegan, or plant-based-only.
2. OSM \`diet:vegan=only\` tag plus a second source ([HappyCow](https://www.happycow.net/) curated top-10 lists, [Veganfreundlich.org](https://www.veganfreundlich.org/) listings, Fat Gay Vegan, or a regional community blog).
3. Manual admin verification for well-known venues that lack a website (food trucks, market stalls, small bakeries).

Anywhere we couldn't verify, we left the venue at \`mostly_vegan\` or \`vegan_friendly\` and excluded it from these counts. That's why our numbers are smaller than directories that auto-tag OSM data without verification. In May 2026 we audited the full Germany fully-vegan dataset and downgraded around 400 records that had been imported with the wrong tag — mostly regular ice cream parlours, kebab shops, and chain bakeries. The numbers above reflect the cleanup.

## Sources we cross-checked against

For this update we re-verified each named venue against the official website, HappyCow's current status, and at least one independent local guide (Mit Vergnügen, Geheimtipp Hamburg, Veganfreundlich.org, Deutschland ist Vegan, regional city-tourism pages). A few corrections from that pass:

- **Symbiose Leipzig** is permanently closed since August 2023 ([HappyCow listing](https://www.happycow.net/reviews/symbiose-leipzig-38724)) and has been archived from our directory.
- **Bodhi Munich** opened in December 2013, not 2010 (we had it wrong in the first draft).
- **sushi green Cologne** is the same venue as **MakiMaki Sushi Green Köln** (one duplicate record archived).
- **Vegan Junk Food Bar Cologne** has conflicting open-status signals (HappyCow shows closed; other German guides still list it) and is currently held in our admin re-verification queue.

## What we might have missed

We're thinner on coverage in:

- **[Düsseldorf](/vegan-places/germany/dusseldorf) and [Dortmund](/vegan-places/germany/dortmund)**: 23 and 15 verified respectively. Almost certainly undercovered. Worth a separate Rhine-Ruhr piece.
- **[Bremen](/vegan-places/germany/bremen) and [Hannover](/vegan-places/germany/hannover)**: 36 and 25 verified, both quietly strong.
- **Smaller university towns**: [Bamberg](/vegan-places/germany/bamberg), [Heidelberg](/vegan-places/germany/heidelberg), [Freiburg](/vegan-places/germany/freiburg-im-breisgau), [Kassel](/vegan-places/germany/kassel), [Münster](/vegan-places/germany/munster), [Kiel](/vegan-places/germany/kiel), [Mannheim](/vegan-places/germany/mannheim), [Halle (Saale)](/vegan-places/germany/halle-saale) each have 14-19 verified venues that punch above their weight. We'll cover these in a dedicated "small German vegan towns" piece.

If you spot something we got wrong, every place page has a "report update" button. Corrections land in our admin queue weekly.

## Frequently asked questions

### What's the most vegan-friendly city in Germany besides Berlin?

Hamburg, with 65 verified 100% vegan venues. The HafenCity, Sternschanze and St. Pauli districts cluster the densest options, and the city hosts the headquarters of two major vegan-fast-food chains (Vincent and Katzentempel). Munich is a close second at 47 venues, leaning more upmarket.

### Is Munich a good city for vegans?

Yes. 47 fully-vegan venues, including Bodhi (Bavarian-vegan since 2013), Doctor Drooly (vegan pizza), Secret Garden Vegan Sushi, Akimy (ramen/rice bowls), and Soy Vegan. The Glockenbachviertel and Maxvorstadt are the easiest neighbourhoods to walk between spots.

### Where is REWE's fully plant-based supermarket?

REWE voll pflanzlich is at Warschauer Brücke in Berlin's Friedrichshain district. It opened on 11 April 2024 with around 2,700 vegan products across 212 m² of floor space — Germany's first fully plant-based supermarket from a mainstream chain.

### Which smaller German cities are quietly strong for vegan dining?

Halle (Saale), Heidelberg, Freiburg im Breisgau, Münster, Kiel, Mannheim, Bamberg and Kassel each have 14–19 verified 100% vegan venues — disproportionately high for cities of their size. We're working on a dedicated guide.

### How do you verify a restaurant as "100% vegan" on PlantsPack?

We require at least one of: (a) the venue's own website explicitly says 100% vegan / rein vegan / plant-based only; (b) OSM's \`diet:vegan=only\` community tag combined with a second independent source; or (c) manual admin verification for well-known venues without a website. Anything ambiguous defaults to vegan_friendly and is excluded from the fully-vegan count.

---

**Want to support work like this?** PlantsPack is free and ad-free. We publish posts like this one because supporters fund the audit work behind them. [Support us for EUR 3/month](/support).`

const POST_ID = '030ebac1-b79b-43ff-b8f2-894cdb4b3f27'
const post = { id: POST_ID }

const { error } = await sb.from('posts').update({
  title: TITLE,
  content,
  image_url: COLLAGE,
  privacy: 'public',
  updated_at: new Date().toISOString(),
}).eq('id', post.id)
console.log(error ? `✗ ${error.message}` : `✓ Updated ${post.id}: ${content.length} chars`)
