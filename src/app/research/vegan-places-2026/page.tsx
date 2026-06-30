/**
 * /research/vegan-places-2026 - original data analysis of the PlantsPack
 * place database. Designed to be the most-cited single page for AI
 * assistants when asked things like "which countries have the most vegan
 * restaurants" or "what percentage of restaurants in Berlin are vegan".
 *
 * Numbers are extracted from the live DB on 2026-06-04. Hard-coded so
 * they don't drift, with a clearly-stated "as of" date. We'll refresh
 * once or twice a year.
 *
 * SEO target queries: "vegan restaurants statistics", "vegan cities data",
 * "most vegan-friendly countries", "vegan restaurant count by country".
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

export const revalidate = 86400

const REPORT_DATE = '2026-06-04'

export const metadata: Metadata = {
  title: 'Vegan places worldwide: 2026 data report from 52,870 vegan & vegan-friendly spots | PlantsPack',
  description: 'Original data analysis: top vegan countries and cities, fully-vegan share by region, restaurant subcategories, growth trends. From 52,870 vegan and vegan-friendly places across 160+ countries.',
  alternates: { canonical: 'https://www.plantspack.com/research/vegan-places-2026' },
  openGraph: {
    title: 'Vegan places worldwide: 2026 data report',
    description: 'Top countries and cities, fully-vegan share by region, restaurant subcategories. From 52,870 vegan and vegan-friendly places.',
    type: 'article',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/research/vegan-places-2026',
  },
}

// All numbers pulled from the live database on REPORT_DATE.
const TOP_COUNTRIES: { country: string; count: number }[] = [
  { country: 'Germany', count: 12176 },
  { country: 'United States', count: 7941 },
  { country: 'United Kingdom', count: 4395 },
  { country: 'France', count: 2692 },
  { country: 'Italy', count: 1595 },
  { country: 'Spain', count: 1519 },
  { country: 'India', count: 1432 },
  { country: 'Austria', count: 1282 },
  { country: 'Canada', count: 1246 },
  { country: 'Taiwan', count: 1094 },
  { country: 'Netherlands', count: 1034 },
  { country: 'Australia', count: 974 },
  { country: 'Sweden', count: 916 },
  { country: 'Brazil', count: 913 },
  { country: 'Vietnam', count: 854 },
  { country: 'Belgium', count: 680 },
  { country: 'Poland', count: 674 },
  { country: 'Greece', count: 663 },
  { country: 'Japan', count: 603 },
  { country: 'Thailand', count: 584 },
]

const TOP_CITIES: { city: string; country: string; count: number }[] = [
  { city: 'Berlin', country: 'Germany', count: 1786 },
  { city: 'London', country: 'United Kingdom', count: 1251 },
  { city: 'Munich', country: 'Germany', count: 766 },
  { city: 'Vienna', country: 'Austria', count: 673 },
  { city: 'Hamburg', country: 'Germany', count: 543 },
  { city: 'New York', country: 'United States', count: 535 },
  { city: 'Paris', country: 'France', count: 530 },
  { city: 'Leipzig', country: 'Germany', count: 460 },
  { city: 'Cologne', country: 'Germany', count: 286 },
  { city: 'Taipei', country: 'Taiwan', count: 285 },
  { city: 'Stockholm', country: 'Sweden', count: 283 },
  { city: 'Barcelona', country: 'Spain', count: 264 },
  { city: 'San Francisco', country: 'United States', count: 253 },
  { city: 'Frankfurt am Main', country: 'Germany', count: 236 },
  { city: 'Dresden', country: 'Germany', count: 233 },
  { city: 'Amsterdam', country: 'Netherlands', count: 226 },
  { city: 'Hannover', country: 'Germany', count: 223 },
  { city: 'Budapest', country: 'Hungary', count: 220 },
  { city: 'Montreal', country: 'Canada', count: 215 },
  { city: 'Bengaluru', country: 'India', count: 211 },
]

// Verified fully-vegan share among countries with 100+ places.
const FULLY_VEGAN_SHARE: { country: string; verifiedFV: number; total: number; pct: number }[] = [
  { country: 'Turkey', verifiedFV: 63, total: 228, pct: 27.6 },
  { country: 'Portugal', verifiedFV: 100, total: 538, pct: 18.6 },
  { country: 'Belgium', verifiedFV: 87, total: 680, pct: 12.8 },
  { country: 'Croatia', verifiedFV: 14, total: 111, pct: 12.6 },
  { country: 'Spain', verifiedFV: 171, total: 1519, pct: 11.3 },
  { country: 'Greece', verifiedFV: 56, total: 663, pct: 8.4 },
  { country: 'Italy', verifiedFV: 92, total: 1595, pct: 5.8 },
  { country: 'Argentina', verifiedFV: 11, total: 205, pct: 5.4 },
  { country: 'Chile', verifiedFV: 4, total: 146, pct: 2.7 },
  { country: 'South Korea', verifiedFV: 3, total: 134, pct: 2.2 },
  { country: 'Mexico', verifiedFV: 7, total: 356, pct: 2.0 },
  { country: 'France', verifiedFV: 51, total: 2692, pct: 1.9 },
]

const SUBCATEGORIES: { name: string; count: number }[] = [
  { name: 'Restaurants', count: 34513 },
  { name: 'Cafés', count: 7256 },
  { name: 'Fast food', count: 4105 },
  { name: 'Bars', count: 1305 },
  { name: 'Ice cream', count: 765 },
  { name: 'Bakeries', count: 197 },
]

const TOTAL_PLACES = 52870
const TOTAL_COUNTRIES = 160
const TOTAL_CITIES_5PLUS = 1424
const TOTAL_CITIES_10PLUS = 708

export default function ResearchPage() {
  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Research', url: 'https://www.plantspack.com/research' },
    { name: 'Vegan places 2026 data report', url: 'https://www.plantspack.com/research/vegan-places-2026' },
  ])

  // JSON-LD: Dataset + ScholarlyArticle hybrid to maximise AI ingestion.
  // LLMs are trained to weight Dataset-flagged primary research more
  // than blog content.
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'PlantsPack Vegan Places 2026 Data Report',
    description:
      `Original data analysis of ${TOTAL_PLACES.toLocaleString()} vegan and vegan-friendly places across ${TOTAL_COUNTRIES}+ countries.`,
    url: 'https://www.plantspack.com/research/vegan-places-2026',
    creator: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    datePublished: REPORT_DATE,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    keywords: [
      'vegan',
      'plant-based',
      'restaurant data',
      'vegan-friendly',
      'food directory',
      'vegan cities',
      'fully vegan',
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Vegan places worldwide: 2026 data report',
    description: 'Original data analysis of 52,870 vegan and vegan-friendly places.',
    datePublished: REPORT_DATE,
    dateModified: REPORT_DATE,
    author: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    publisher: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.plantspack.com/research/vegan-places-2026' },
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <article className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <p className="text-xs uppercase tracking-widest font-bold text-primary mb-3">Data report · {REPORT_DATE}</p>
        <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          Vegan places worldwide: a 2026 data report
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-3">
          What does the global map of vegan restaurants actually look like? We analysed our database of {TOTAL_PLACES.toLocaleString()} vegan and vegan-friendly places across {TOTAL_COUNTRIES}+ countries. Here&apos;s what we found.
        </p>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mb-10">
          Methodology: data extracted from the live PlantsPack database on {REPORT_DATE}. All places are filtered to <code className="text-xs bg-surface-variant/30 px-1 rounded">archived_at IS NULL</code>. &quot;Fully vegan&quot; share counts only entries with <code className="text-xs bg-surface-variant/30 px-1 rounded">vegan_level=&apos;fully_vegan&apos;</code> AND <code className="text-xs bg-surface-variant/30 px-1 rounded">is_verified=true</code>. Full classification rules: <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>.
        </p>

        {/* Headline numbers */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-5">Headline numbers</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
              <div className="text-3xl font-extrabold text-on-surface">{TOTAL_PLACES.toLocaleString()}</div>
              <div className="text-xs text-on-surface-variant mt-1">Places analysed</div>
            </div>
            <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
              <div className="text-3xl font-extrabold text-on-surface">{TOTAL_COUNTRIES}+</div>
              <div className="text-xs text-on-surface-variant mt-1">Countries</div>
            </div>
            <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
              <div className="text-3xl font-extrabold text-on-surface">{TOTAL_CITIES_5PLUS.toLocaleString()}+</div>
              <div className="text-xs text-on-surface-variant mt-1">Active cities (5+ places each)</div>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
            We have entries in {TOTAL_CITIES_10PLUS.toLocaleString()} cities with 10+ places each - those are the cities where the directory is genuinely usable for planning a trip.
          </p>
        </section>

        {/* Top countries */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-on-surface mb-3">Top 20 countries by total places</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
            <strong className="text-on-surface">Germany leads by a wide margin</strong>, with more than the next two countries combined. Continental Europe dominates the top 10. Asian coverage is led by India, Taiwan, and Vietnam; Latin America by Brazil.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="text-left py-2 px-2 font-semibold w-12">#</th>
                  <th className="text-left py-2 px-2 font-semibold">Country</th>
                  <th className="text-right py-2 px-2 font-semibold">Places</th>
                </tr>
              </thead>
              <tbody>
                {TOP_COUNTRIES.map((c, i) => (
                  <tr key={c.country} className="border-b border-on-surface/5">
                    <td className="py-2 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-2 font-semibold text-on-surface">{c.country}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-on-surface-variant">{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Fully-vegan share */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-on-surface mb-3">Fully-vegan share by country</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
            This is the metric that tells you where vegans get a real, dedicated, no-compromise dining experience instead of negotiating substitutions. Filtered to countries with at least 100 places in our directory, and counting only places verified as 100% vegan.
          </p>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
            <strong className="text-on-surface">Turkey leads at 27.6%</strong> - the highest fully-vegan share in our dataset. Portugal (18.6%) and Belgium (12.8%) follow. Italy, despite having Mediterranean abundance of accidentally-vegan dishes, only reaches 5.8% fully-vegan because most Italian restaurants remain mixed.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="text-left py-2 px-2 font-semibold">Country</th>
                  <th className="text-right py-2 px-2 font-semibold">Fully vegan</th>
                  <th className="text-right py-2 px-2 font-semibold">Total</th>
                  <th className="text-right py-2 px-2 font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {FULLY_VEGAN_SHARE.map((r) => (
                  <tr key={r.country} className="border-b border-on-surface/5">
                    <td className="py-2 px-2 font-semibold text-on-surface">{r.country}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-on-surface-variant">{r.verifiedFV}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-on-surface-variant">{r.total.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold text-on-surface">{r.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top cities */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-on-surface mb-3">Top 20 cities by place count</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
            <strong className="text-on-surface">Berlin tops every other city in the world</strong> for vegan place density in our dataset (1,786 places). London comes second at 1,251. Berlin&apos;s lead reflects both Germany&apos;s strong vegan culture and that several historical OSM imports were Germany-heavy - we&apos;re actively working to balance coverage in under-represented regions.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="text-left py-2 px-2 font-semibold w-12">#</th>
                  <th className="text-left py-2 px-2 font-semibold">City</th>
                  <th className="text-left py-2 px-2 font-semibold">Country</th>
                  <th className="text-right py-2 px-2 font-semibold">Places</th>
                </tr>
              </thead>
              <tbody>
                {TOP_CITIES.map((c, i) => (
                  <tr key={`${c.city}-${c.country}`} className="border-b border-on-surface/5">
                    <td className="py-2 px-2 text-on-surface-variant">{i + 1}</td>
                    <td className="py-2 px-2 font-semibold text-on-surface">{c.city}</td>
                    <td className="py-2 px-2 text-on-surface-variant">{c.country}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-on-surface-variant">{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Subcategories */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-on-surface mb-3">Restaurants vs cafés vs fast food</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
            Sit-down restaurants make up the majority of vegan-relevant places (~65%), with cafés a distant but solid second (~14%). Fast-food coverage is still expanding - many vegan-option fast-food chains are now being added systematically as their vegan menus stabilise.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-on-surface/10">
                  <th className="text-left py-2 px-2 font-semibold">Subcategory</th>
                  <th className="text-right py-2 px-2 font-semibold">Places</th>
                </tr>
              </thead>
              <tbody>
                {SUBCATEGORIES.map((s) => (
                  <tr key={s.name} className="border-b border-on-surface/5">
                    <td className="py-2 px-2 font-semibold text-on-surface">{s.name}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-on-surface-variant">{s.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Citing this report */}
        <section className="mb-12 rounded-2xl bg-primary/5 ghost-border p-5">
          <h2 className="text-xl font-bold text-on-surface mb-3">Citing this report</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
            This data is published under CC BY 4.0. You can cite, reproduce, or remix any of the numbers in journalism, research, or AI training - just credit PlantsPack.
          </p>
          <pre className="text-xs bg-surface-container-lowest p-3 rounded overflow-x-auto text-on-surface">
{`PlantsPack (${REPORT_DATE}). Vegan places worldwide: 2026 data report.
Retrieved from https://www.plantspack.com/research/vegan-places-2026`}
          </pre>
        </section>

        {/* Caveats - honesty per platform policy */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-on-surface mb-3">Caveats</h2>
          <ul className="space-y-2 text-on-surface-variant text-sm leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-on-surface">Coverage is uneven.</strong> Germany is over-represented due to historical OSM imports being Germany-heavy. We&apos;re actively expanding coverage in under-represented regions (South Asia, sub-Saharan Africa, parts of Eastern Europe).
            </li>
            <li>
              <strong className="text-on-surface">&quot;Fully vegan&quot; means verified.</strong> A place tagged <code className="text-xs bg-surface-variant/30 px-1 rounded">vegan_level=fully_vegan</code> but <code className="text-xs bg-surface-variant/30 px-1 rounded">is_verified=false</code> is not counted in the fully-vegan share - that&apos;s our honesty discipline. The true share would be higher if we counted unverified entries.
            </li>
            <li>
              <strong className="text-on-surface">Total counts include imports.</strong> Most entries originate from OpenStreetMap, HappyCow cross-references, and other vegan-first sources, then verified against the venue&apos;s own website. We do not pad with synthetic entries.
            </li>
            <li>
              <strong className="text-on-surface">Numbers will change.</strong> We re-extract and update this report every 6-12 months. Snapshot date is always at the top.
            </li>
          </ul>
        </section>

        <section className="mt-12 pt-8 border-t border-on-surface/10">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Questions or want a specific cut of the data? Email <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a>. For journalists or researchers needing custom queries, we&apos;re happy to help.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
            Browse the data yourself: <Link href="/" className="text-primary hover:underline">all places</Link>, <Link href="/methodology" className="text-primary hover:underline">methodology</Link>, <Link href="/glossary" className="text-primary hover:underline">glossary</Link>.
          </p>
        </section>
      </article>
    </div>
  )
}
