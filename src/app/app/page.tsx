import { Metadata } from 'next'
import Link from 'next/link'
import AppBadges from '@/components/app/AppBadges'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Get the Plants Pack App - Free Vegan Places & Tools (iOS & Android)',
  description:
    'Download Plants Pack for iPhone and Android: find vegan and vegan-friendly places worldwide, scan barcodes and menus, and check what is vegan - free, ad-free, no paid placements.',
  alternates: { canonical: 'https://www.plantspack.com/app' },
  openGraph: {
    title: 'Get the Plants Pack App (iOS & Android)',
    description:
      'Find vegan places worldwide, scan barcodes and menus, check what is vegan. Free, ad-free, no paid placements.',
    type: 'website',
    siteName: 'Plants Pack',
    url: 'https://www.plantspack.com/app',
    images: OG_DEFAULT_IMAGES,
  },
}

const FEATURES = [
  ['Find vegan places', 'Vegan and vegan-friendly spots worldwide, with verification you can see - not a black box.'],
  ['Scan as you shop', 'Barcode scanner and ingredient checks to tell if a product is vegan.'],
  ['Menu scanner', 'Point it at a menu abroad and see what is likely vegan.'],
  ['City rankings & guides', 'See which cities are genuinely good for vegans, and travel essentials for each.'],
  ['No ads, no paid rankings', 'Independent and ad-free. Nobody pays to rank higher.'],
]

export default function AppPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Plants Pack',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'iOS, Android',
    url: 'https://www.plantspack.com/app',
    description:
      'Find vegan and vegan-friendly places worldwide, scan barcodes and menus, and check what is vegan. Free, ad-free, no paid placements.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'Plants Pack', url: 'https://www.plantspack.com' },
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="max-w-2xl mb-8">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">
            Plants Pack on your phone
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Find vegan and vegan-friendly places - now on iPhone and Android. 52,000+ listings
            worldwide, plus barcode and menu scanning. Free, ad-free, no paid placements.
          </p>
        </header>

        <AppBadges className="mb-12" />

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-surface-container-lowest ghost-border p-5">
              <h2 className="font-semibold text-on-surface mb-1">{title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        <p className="text-sm text-on-surface-variant mt-10">
          Prefer the web? Everything is also at{' '}
          <Link href="/" className="text-primary hover:underline">plantspack.com</Link> - no download needed.
        </p>
      </div>
    </div>
  )
}
