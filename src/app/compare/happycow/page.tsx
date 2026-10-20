/**
 * /compare/happycow - honest comparison of PlantsPack and HappyCow.
 *
 * SEO + AI-citation purpose: when users ask "X vs Y" queries, AI assistants
 * preferentially cite pages that lay out both sides fairly rather than
 * marketing pages. Page is written to be defensible if HappyCow themselves
 * read it - acknowledges their real strengths, points out our differences
 * without snark.
 *
 * Every PlantsPack number below is a live query re-checked on LAST_CHECKED
 * (places, countries, cities, reviews, recipes, articles). HappyCow figures are
 * their own published numbers; sources are linked in the footer. Keep it that
 * way: no rounding up, no "verified" where the data says "labelled".
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, X, Minus, Sparkles } from 'lucide-react'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

const LAST_CHECKED = '20 October 2026'

export const metadata: Metadata = {
  title: 'PlantsPack vs HappyCow - honest comparison for vegan travellers | PlantsPack',
  description: 'Side-by-side comparison of PlantsPack and HappyCow in 2026: coverage, mobile apps, vegan labelling, scanners and tools, pricing, paid listings, data sources. Honest assessment, including where HappyCow wins.',
  alternates: { canonical: 'https://www.plantspack.com/compare/happycow' },
  openGraph: {
    title: 'PlantsPack vs HappyCow - honest comparison (2026)',
    description: 'Coverage, apps, vegan labels, tools, pricing, paid listings. We tell you where HappyCow wins too.',
    type: 'article',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/compare/happycow',
    images: OG_DEFAULT_IMAGES,
  },
}

type Status = 'yes' | 'partial' | 'no'
interface Row {
  feature: string
  plantspack: { status: Status; note: string }
  happycow: { status: Status; note: string }
}

const ROWS: Row[] = [
  {
    feature: 'Places listed',
    plantspack: { status: 'partial', note: '52,000+ vegan and vegan-friendly places, 24,000+ with a photo' },
    happycow: { status: 'yes', note: '240,000+ listings by their own count. Their core strength' },
  },
  {
    feature: 'Coverage',
    plantspack: { status: 'partial', note: '167 countries; 1,400+ cities and towns with five or more places. Deepest in Europe, strong in North America, Mexico and Brazil' },
    happycow: { status: 'yes', note: '185 countries by their own count, with more small-town coverage' },
  },
  {
    feature: 'Community reviews',
    plantspack: { status: 'no', note: 'About 150 reviews so far. We launched the apps in 2026 and we do not pad this with imported or synthetic reviews' },
    happycow: { status: 'yes', note: 'Reviews collected since 1999. The deepest review base in vegan dining' },
  },
  {
    feature: 'Vegan labelling',
    plantspack: { status: 'yes', note: 'Four tiers on every place: fully vegan, mostly vegan, vegan friendly, vegan options. Fully vegan is the strict tier, flagged on the map and filterable with one tap. Vegetarian-only venues are not listed' },
    happycow: { status: 'partial', note: 'Vegan, vegetarian and veg-options categories; vegetarian venues sit in the same directory' },
  },
  {
    feature: 'Mobile app',
    plantspack: { status: 'yes', note: 'Free native iOS and Android apps (2026): live map, 100% vegan filter, place pages with hours and directions, saved places synced across devices, dark mode, directions can open in Organic Maps or OsmAnd' },
    happycow: { status: 'yes', note: 'Mature iOS and Android apps with a large install base. The iOS app has been a one-time paid download in several storefronts; check your store' },
  },
  {
    feature: 'Scanners inside the app',
    plantspack: { status: 'yes', note: 'Barcode scanner, ingredient-label scanner and menu scanner work in the apps and on the web' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Ads',
    plantspack: { status: 'yes', note: 'None, on the web or in the apps. Funded by supporters' },
    happycow: { status: 'partial', note: 'Advertising on the website; the apps have carried a paid tier' },
  },
  {
    feature: 'Paid placement for businesses',
    plantspack: { status: 'yes', note: 'None. Owners can claim a listing for free; claims do not change ranking or labels' },
    happycow: { status: 'no', note: 'Paid business subscriptions through their Partner Hub (US$100 per month per location, their published price)' },
  },
  {
    feature: 'Price for you',
    plantspack: { status: 'yes', note: 'Everything free. AI scans: 1 a month as a guest, 3 a month signed in, unlimited for supporters at 3 euro a month' },
    happycow: { status: 'partial', note: 'Website free; the iOS app has been a paid download' },
  },
  {
    feature: 'Barcode scanner',
    plantspack: { status: 'yes', note: 'Free, food and cosmetics, no sign-up needed' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Ingredient-label scanner (AI)',
    plantspack: { status: 'yes', note: 'Photograph a label; animal-derived ingredients and E-numbers are flagged' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Menu scanner (AI)',
    plantspack: { status: 'yes', note: 'Photograph a menu in any language; vegan dishes are highlighted and explained' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Other tools',
    plantspack: { status: 'yes', note: 'Baking substitute calculator, drinks check, E-numbers guide, impact calculator, printable restaurant cards in 30 languages' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Recipes',
    plantspack: { status: 'yes', note: '700+ recipes, every one from a creator whose whole catalogue is vegan, credited and linked to the original' },
    happycow: { status: 'partial', note: 'Some recipes on the blog' },
  },
  {
    feature: 'Editorial content',
    plantspack: { status: 'yes', note: '22 "is X vegan?" ingredient articles with cited sources, city guides for 96 dishes (best vegan pizza in Berlin, and so on), travel guides' },
    happycow: { status: 'partial', note: 'Blog and city guides, less source citation' },
  },
  {
    feature: 'City rankings',
    plantspack: { status: 'yes', note: 'A vegan-friendliness score per city, recomputed as the data changes' },
    happycow: { status: 'partial', note: 'Annual top-cities lists; no per-city score you can follow' },
  },
  {
    feature: 'Data sources and freshness',
    plantspack: { status: 'yes', note: 'Built on OpenStreetMap plus community additions, with attribution. Weekly map sync, daily website checks, community reports handled every week' },
    happycow: { status: 'yes', note: 'Community-submitted and community-maintained; long track record' },
  },
  {
    feature: 'Public methodology',
    plantspack: { status: 'yes', note: 'Documented in /methodology: how every label is set and what "fully vegan" requires' },
    happycow: { status: 'no', note: 'We could not find a published methodology' },
  },
  {
    feature: 'Open code / API',
    plantspack: { status: 'partial', note: 'Source code is public on GitHub. No public API yet' },
    happycow: { status: 'no', note: 'No public API' },
  },
]

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === 'yes') return <CheckCircle2 className="h-5 w-5 text-success" />
  if (status === 'partial') return <Minus className="h-5 w-5 text-warning" />
  return <X className="h-5 w-5 text-error" />
}

export default function ComparePage() {
  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Compare', url: 'https://www.plantspack.com/compare' },
    { name: 'vs HappyCow', url: 'https://www.plantspack.com/compare/happycow' },
  ])

  const compareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.plantspack.com/compare/happycow',
    name: 'PlantsPack vs HappyCow comparison',
    description: 'Side-by-side comparison of PlantsPack and HappyCow vegan directories, checked October 2026.',
    url: 'https://www.plantspack.com/compare/happycow',
    dateModified: '2026-10-20',
    about: [
      { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
      { '@type': 'Organization', name: 'HappyCow', url: 'https://www.happycow.net' },
    ],
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(compareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <article className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          PlantsPack vs HappyCow
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-3">
          A feature-by-feature comparison with the numbers as they stand on {LAST_CHECKED}. We say where HappyCow wins, where we win, and where we are still catching up.
        </p>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mb-10">
          Why publish this? Because most directory comparisons are marketing pages, and you deserve a straight answer to &quot;which should I use?&quot;. Every PlantsPack figure here is a live count from our database; HappyCow figures are their own published numbers.
        </p>

        <div className="rounded-2xl bg-primary/5 ghost-border p-5 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface">The short version</h2>
          </div>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed">
            <li>
              <strong>Use HappyCow if</strong> you want the widest coverage, especially in small towns and outside Europe, and you rely on other people&apos;s reviews. They list more than four times as many places as we do and have collected reviews since 1999.
            </li>
            <li>
              <strong>Use PlantsPack if</strong> you want a strict &quot;fully vegan&quot; label you can filter on, scanners for barcodes, ingredient labels and menus, recipes only from 100% vegan creators, and a directory with no ads and no paid listings. The apps are free on iOS and Android.
            </li>
            <li>
              <strong>Use both.</strong> Most vegan travellers we know do. We would rather be your second tab than pretend to be the only one.
            </li>
          </ul>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-5">Feature by feature</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="text-left py-3 px-2 font-semibold text-on-surface">Feature</th>
                  <th className="text-left py-3 px-2 font-semibold text-on-surface">PlantsPack</th>
                  <th className="text-left py-3 px-2 font-semibold text-on-surface">HappyCow</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-on-surface/5 align-top">
                    <td className="py-3 px-2 font-semibold text-on-surface w-1/4">{row.feature}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5"><StatusIcon status={row.plantspack.status} /></span>
                        <span className="text-on-surface-variant leading-relaxed">{row.plantspack.note}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5"><StatusIcon status={row.happycow.status} /></span>
                        <span className="text-on-surface-variant leading-relaxed">{row.happycow.note}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Yes / strong</span>
            <span className="flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-warning" /> Partial</span>
            <span className="flex items-center gap-1"><X className="h-3.5 w-3.5 text-error" /> No</span>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where HappyCow genuinely wins</h2>
          <p className="text-on-surface leading-relaxed mb-3">
            Saying this plainly matters, because it is true and because hiding it would cost the trust we are trying to earn.
          </p>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>Coverage.</strong> More than four times as many places as we list. In a small town, or in much of Asia and Africa, they will have options we do not.</li>
            <li><strong>Reviews.</strong> A quarter century of community reviews against our hundred and fifty. If you choose restaurants by what other diners wrote, HappyCow is the richer source today.</li>
            <li><strong>Maturity.</strong> Their apps have had years of polish and an established community behind them. Ours shipped in 2026 and still get fixes every week.</li>
            <li><strong>Recognition.</strong> Ask a vegan friend where to find food abroad and HappyCow is the answer you will hear.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where we win</h2>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>A strict fully-vegan label you can filter on.</strong> Four tiers separate &quot;everything on the menu is vegan&quot; from &quot;a steakhouse with one vegan burger&quot;, and the map has a one-tap 100% vegan filter. Vegetarian-only venues are not on our map. The rules are written down in <Link href="/methodology" className="text-primary hover:underline">our methodology</Link>.</li>
            <li><strong>Scanners.</strong> Barcode (food and cosmetics), ingredient labels and restaurant menus in any language, in the apps and on the web. Nothing like them exists on HappyCow.</li>
            <li><strong>No ads, no paid listings.</strong> Nobody can pay to appear, rank higher or get a better label. Business owners claim their listing for free. Analytics run only after you accept cookies, and we sell no data.</li>
            <li><strong>Recipes from vegan-only creators.</strong> 700+ recipes, each from a creator whose entire catalogue is vegan, credited and linked back. We dropped sources that turned out to publish non-vegan recipes.</li>
            <li><strong>Written answers with sources.</strong> 22 ingredient articles (sugar, wine, E-numbers, honey, and so on) and city pages for 96 dishes, all citing where the facts come from.</li>
            <li><strong>Transparency.</strong> Public methodology, OpenStreetMap attribution on every imported place, source code public on GitHub, and a homepage that shows what changed on the map this week.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where we are catching up</h2>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>Reviews.</strong> About 150 so far. We will not import or generate them; the count grows at the pace real people write.</li>
            <li><strong>Coverage outside Europe.</strong> Strong in Europe, North America, Mexico and Brazil; thin in South Asia, most of Africa and parts of Eastern Europe.</li>
            <li><strong>Young apps.</strong> Version 1.0.x. They do the job and get updates most weeks, but HappyCow&apos;s have years of refinement.</li>
            <li><strong>Data checks are ongoing.</strong> Many places come from open map data. A label can be stale until someone reports it; reports are worked through every week and the fixes are visible on the place page.</li>
          </ul>
        </section>

        <section className="mt-12 pt-8 border-t border-on-surface/10">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            HappyCow figures (listings, countries, Partner Hub pricing, app pricing) come from HappyCow&apos;s own website, press releases and app-store listings as of {LAST_CHECKED}; they change, so check their site for today&apos;s numbers. See something wrong here? Email <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a> and we will fact-check and update. We would also happily link to a comparable page on HappyCow&apos;s side.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
            Try PlantsPack: <Link href="/" className="text-primary hover:underline">explore places</Link>, <Link href="/tools" className="text-primary hover:underline">free vegan tools</Link>, <Link href="/vegan" className="text-primary hover:underline">vegan answers</Link>, or <Link href="/get" className="text-primary hover:underline">get the app</Link>.
          </p>
        </section>
      </article>
    </div>
  )
}
