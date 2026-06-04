/**
 * /compare/happycow - honest comparison of PlantsPack and HappyCow.
 *
 * SEO + AI-citation purpose: when users ask "X vs Y" queries, AI assistants
 * preferentially cite pages that lay out both sides fairly rather than
 * marketing pages. Page is written to be defensible if HappyCow themselves
 * read it - acknowledges their real strengths, points out our differences
 * without snark.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, X, Minus, Sparkles } from 'lucide-react'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'PlantsPack vs HappyCow - honest comparison for vegan travellers | PlantsPack',
  description: 'Side-by-side comparison of PlantsPack and HappyCow: coverage, tools, pricing, content depth, mobile apps, data freshness. Honest assessment, including where HappyCow wins.',
  alternates: { canonical: 'https://www.plantspack.com/compare/happycow' },
  openGraph: {
    title: 'PlantsPack vs HappyCow - honest comparison',
    description: 'Coverage, tools, content depth, mobile apps, pricing. We tell you where HappyCow wins too.',
    type: 'article',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/compare/happycow',
  },
}

interface Row {
  feature: string
  plantspack: { status: 'yes' | 'partial' | 'no'; note: string }
  happycow: { status: 'yes' | 'partial' | 'no'; note: string }
}

const ROWS: Row[] = [
  {
    feature: 'Total places listed',
    plantspack: { status: 'partial', note: '~52,000 verified places' },
    happycow: { status: 'yes', note: '~200,000+ places (their core strength)' },
  },
  {
    feature: 'Country coverage',
    plantspack: { status: 'partial', note: '160+ countries, 1,400+ cities with 5+ places' },
    happycow: { status: 'yes', note: '180+ countries, broader smaller-city coverage' },
  },
  {
    feature: 'User reviews',
    plantspack: { status: 'partial', note: 'Growing - early-stage user base, modest review volume' },
    happycow: { status: 'yes', note: '25 years of community reviews, very high density' },
  },
  {
    feature: 'Strict vegan classification',
    plantspack: { status: 'yes', note: 'Four-tier system: fully vegan / mostly vegan / vegan-friendly / vegan options. Each tier defined in our methodology' },
    happycow: { status: 'partial', note: 'Vegan and vegetarian tags exist but conflated in many search results' },
  },
  {
    feature: 'Mobile app',
    plantspack: { status: 'no', note: 'Web-only for now (PWA-friendly)' },
    happycow: { status: 'yes', note: 'Native iOS + Android apps with millions of downloads' },
  },
  {
    feature: 'Ad-free experience',
    plantspack: { status: 'yes', note: 'Zero ads, ever. Supporter-funded' },
    happycow: { status: 'no', note: 'Display ads on the free version; premium tier removes them' },
  },
  {
    feature: 'Free to use',
    plantspack: { status: 'yes', note: 'All features free. Optional $3/mo supporter tier for unlimited AI scans' },
    happycow: { status: 'partial', note: 'Free web; premium subscription for app features and ad removal' },
  },
  {
    feature: 'Barcode scanner',
    plantspack: { status: 'yes', note: 'Free, food and cosmetics modes, no signup needed' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Ingredient label scanner (AI)',
    plantspack: { status: 'yes', note: 'Photo a label, we read it and flag animal-derived items' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Restaurant menu scanner (AI)',
    plantspack: { status: 'yes', note: 'Photo any menu in any language, we highlight vegan dishes' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Baking substitute calculator',
    plantspack: { status: 'yes', note: 'Quantitative ratios per ingredient and recipe type, no AI' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Drinks vegan lookup',
    plantspack: { status: 'yes', note: '100+ curated beer/wine/spirit brands with confirmed status' },
    happycow: { status: 'no', note: 'Not offered' },
  },
  {
    feature: 'Printable restaurant cards (30+ languages)',
    plantspack: { status: 'yes', note: 'Free, multi-language' },
    happycow: { status: 'no', note: 'Not offered as a built-in tool' },
  },
  {
    feature: 'Editorial content (is X vegan articles, travel guides)',
    plantspack: { status: 'yes', note: '14+ ingredient deep-dives, 4+ country travel guides, sources cited' },
    happycow: { status: 'partial', note: 'Blog content exists but shallower per topic; sources rarely cited' },
  },
  {
    feature: 'City rankings (vegan-friendliness score)',
    plantspack: { status: 'yes', note: 'Algorithmic score per city, deltas tracked over time' },
    happycow: { status: 'no', note: 'Place ratings only, no city-level ranking' },
  },
  {
    feature: 'Open data / API',
    plantspack: { status: 'partial', note: 'Read-only API in development' },
    happycow: { status: 'no', note: 'No public API' },
  },
  {
    feature: 'Public methodology / audit transparency',
    plantspack: { status: 'yes', note: 'Methodology page explains how every classification is made' },
    happycow: { status: 'no', note: 'No public methodology document' },
  },
  {
    feature: 'Active development pace',
    plantspack: { status: 'yes', note: 'Multiple shipped features per month' },
    happycow: { status: 'partial', note: 'Mature product, slower update cadence' },
  },
]

const StatusIcon = ({ status }: { status: 'yes' | 'partial' | 'no' }) => {
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

  // JSON-LD: ComparisonPage signal for LLMs and Google rich results
  const compareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.plantspack.com/compare/happycow',
    name: 'PlantsPack vs HappyCow comparison',
    description: 'Side-by-side comparison of PlantsPack and HappyCow vegan directories.',
    url: 'https://www.plantspack.com/compare/happycow',
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
          An honest, feature-by-feature comparison. We&apos;ll tell you where HappyCow wins, where we win, and where we&apos;re still catching up.
        </p>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mb-10">
          Why publish this? Because most vegan-directory comparisons are marketing pages, and you deserve a straight answer to &quot;which should I use?&quot;
        </p>

        {/* TL;DR card */}
        <div className="rounded-2xl bg-primary/5 ghost-border p-5 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface">TL;DR</h2>
          </div>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed">
            <li>
              <strong>Use HappyCow if:</strong> you want maximum place coverage (especially in smaller cities), a polished mobile app, and 25 years of community reviews. They have far more places than us.
            </li>
            <li>
              <strong>Use PlantsPack if:</strong> you want free tools (barcode scanner, baking calculator, menu translator, drinks lookup) that HappyCow doesn&apos;t offer, an ad-free experience, strict vegan classification (we separate &quot;fully vegan&quot; from &quot;vegan-friendly&quot; clearly), and editorial answers to &quot;is X vegan?&quot; questions.
            </li>
            <li>
              <strong>Use both:</strong> most vegan travellers we know do. They&apos;re complementary, not substitutes. We&apos;d rather be your second tab than fake being your only one.
            </li>
          </ul>
        </div>

        {/* Feature table */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-5">Feature-by-feature</h2>
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

        {/* Where HappyCow genuinely wins */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where HappyCow genuinely wins</h2>
          <p className="text-on-surface leading-relaxed mb-3">
            Being honest about this matters - both because it&apos;s true and because hiding it would erode the trust we&apos;re trying to build.
          </p>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>Raw place coverage.</strong> HappyCow has roughly 4x more places than us. If you&apos;re in a small city or a country with weak coverage, they&apos;ll have more options listed.</li>
            <li><strong>Community-review depth.</strong> 25 years of user reviews is a real moat. Our review density is improving but it&apos;ll take time.</li>
            <li><strong>Mobile app.</strong> Their iOS and Android apps are mature, well-maintained, and have millions of installs. We&apos;re web-only.</li>
            <li><strong>Brand recognition.</strong> &quot;HappyCow&quot; is the default search for vegans worldwide. If you ask a vegan friend &quot;where do you find vegan restaurants abroad?&quot; HappyCow is what they&apos;ll say.</li>
          </ul>
        </section>

        {/* Where we win */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where we win</h2>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>Free vegan tools.</strong> Barcode scanner (food + cosmetics modes), AI ingredient-label scanner, AI menu translator, baking substitute calculator, drinks vegan lookup, printable cards in 30+ languages. None of these exist on HappyCow.</li>
            <li><strong>Strict vegan classification.</strong> Our four-tier system (fully vegan / mostly vegan / vegan-friendly / vegan options) separates the &quot;all-vegan restaurant&quot; case from &quot;steakhouse with a vegan burger&quot; clearly. HappyCow&apos;s tags often conflate these.</li>
            <li><strong>Ad-free, no tracking, ever.</strong> We don&apos;t serve ads, don&apos;t sell data, and don&apos;t use behavioural tracking. Supporter-funded at $3/month optional.</li>
            <li><strong>Editorial depth.</strong> Long-form articles on &quot;is X vegan?&quot; questions (sugar, wine, beer, e-codes, cheese, gelatin, honey, etc.) with cited sources.</li>
            <li><strong>Public methodology.</strong> We document how every place is classified in <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. HappyCow doesn&apos;t publish theirs.</li>
            <li><strong>Active development.</strong> We ship multiple features per month. HappyCow updates are slower.</li>
          </ul>
        </section>

        {/* Where we're catching up */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-4">Where we&apos;re catching up</h2>
          <ul className="space-y-2 text-on-surface text-sm leading-relaxed list-disc pl-5">
            <li><strong>Mobile app.</strong> Not yet. The site is mobile-optimised but a native app is on our backlog.</li>
            <li><strong>Place coverage in some regions.</strong> Strong in Europe, US, Mexico (Mexico City, Tulum, Oaxaca), Brazil. Thinner in South Asia, sub-Saharan Africa, parts of Eastern Europe.</li>
            <li><strong>User reviews.</strong> Our early-stage user base means modest review volume per place. We don&apos;t fake this with bot reviews - we&apos;d rather have 50 real reviews than 5,000 synthetic ones.</li>
          </ul>
        </section>

        <section className="mt-12 pt-8 border-t border-on-surface/10">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            See something wrong in this comparison? Email <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a> - we&apos;ll fact-check and update. We&apos;re also happy to link to a comparable page on HappyCow&apos;s side if they ever publish one.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
            Try PlantsPack: <Link href="/" className="text-primary hover:underline">explore places</Link>, <Link href="/tools" className="text-primary hover:underline">free vegan tools</Link>, <Link href="/vegan" className="text-primary hover:underline">vegan answers</Link>.
          </p>
        </section>
      </article>
    </div>
  )
}
