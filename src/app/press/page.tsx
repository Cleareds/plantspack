import { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Press & Media Kit | PlantsPack',
  description:
    'PlantsPack press kit: what we are, the numbers, positioning, logo and screenshots, and contact. An independent, ad-free vegan discovery platform.',
  alternates: { canonical: 'https://www.plantspack.com/press' },
  openGraph: {
    title: 'Press & Media Kit | PlantsPack',
    description: 'Independent, ad-free vegan discovery platform - facts, numbers, assets, and contact.',
    type: 'website',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/press',
  },
}

const FACTS: [string, string][] = [
  ['Listings', '52,000+ vegan and vegan-friendly places'],
  ['Coverage', '160+ countries, 1,400+ cities with 5+ places each'],
  ['Apps', 'Live on iOS and Android (free)'],
  ['Business model', 'Free, ad-free, no paid placements or paid rankings'],
  ['Verification', 'Transparent confidence levels shown on every listing'],
]

export default function PressPage() {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">
          Press &amp; media kit
        </h1>
        <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
          Everything you need to write about PlantsPack accurately. Questions:{' '}
          <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a>.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-on-surface mb-3">One-paragraph description</h2>
          <p className="rounded-2xl bg-surface-container-lowest ghost-border p-5 text-on-surface-variant leading-relaxed">
            PlantsPack is a free, ad-free vegan discovery app and directory: 52,000+ vegan and
            vegan-friendly places across 160+ countries, transparent verification you can see, city
            rankings, and free tools like barcode and menu scanning. Fully-vegan-first. No ads, no
            paid placements.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-on-surface mb-3">The facts</h2>
          <dl className="rounded-2xl bg-surface-container-lowest ghost-border divide-y divide-outline-variant/15">
            {FACTS.map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-5 py-3">
                <dt className="text-sm font-semibold text-on-surface sm:w-40 shrink-0">{k}</dt>
                <dd className="text-sm text-on-surface-variant">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-on-surface-variant mt-2">
            Numbers are kept honest and current - see our{' '}
            <Link href="/methodology" className="text-primary hover:underline">methodology</Link> and{' '}
            <Link href="/research/vegan-places-2026" className="text-primary hover:underline">data report</Link>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-on-surface mb-3">What makes it different</h2>
          <p className="text-on-surface-variant leading-relaxed">
            Most vegan directories mix vegan and vegetarian and rank by popularity or paid placement.
            PlantsPack is fully-vegan-first with a transparent, community-driven verification model:
            anyone can confirm a place is still open and accurate, every listing shows that confidence
            level and how it was checked, and the 100% vegan places we have hand-checked are flagged
            separately. Nobody can pay to rank higher. It is the trust layer for vegan discovery, not
            another map.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-on-surface mb-3">Who builds it</h2>
          <p className="text-on-surface-variant leading-relaxed">
            PlantsPack is built by Anton and Oleksandra, a Ukrainian couple - Oleksandra has been
            vegan for 10+ years and Anton joined her on it. No investors, no ads, no paywalls; funded
            by optional supporter contributions. Because two people cannot personally check 52,000
            places, verification is community-driven: confirmations from people on the ground,
            cross-referenced vegan-first sources, and the fully-vegan spots we hand-check ourselves.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-on-surface mb-3">Assets &amp; links</h2>
          <ul className="space-y-2 text-on-surface-variant">
            <li><a href="/plantspack.svg" className="text-primary hover:underline">Logo (SVG)</a></li>
            <li><a href="/og-default.png" className="text-primary hover:underline">Brand banner (PNG, 1200x630)</a></li>
            <li><Link href="/app" className="text-primary hover:underline">App page</Link> (App Store + Google Play)</li>
            <li><Link href="/compare/happycow" className="text-primary hover:underline">How we compare</Link></li>
            <li><a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
