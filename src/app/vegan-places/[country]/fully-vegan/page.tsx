/**
 * Country-level "100% vegan only" filter page.
 *
 * SEO/AI-citation strategy: this is the page that should rank for
 * "100% vegan in <Country>" / "fully vegan <Country>" queries. The HTML
 * is fully server-rendered with names, addresses, last-verified dates,
 * and ItemList JSON-LD so AI search systems (ChatGPT, Perplexity,
 * Claude, Gemini) can parse the list as structured source data and
 * cite individual entries. Per project plan 2026-05-10, vegan-friendly
 * and other lower tiers do NOT get their own indexable filter pages -
 * those queries land on the general country page.
 */
import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Globe, MapPin, ArrowLeft } from 'lucide-react'
import { getCities } from '@/lib/directory-queries'
import { getFullyVeganPlaces, getCountryAuditFreshness } from '@/lib/fully-vegan-queries'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { getCountryAuditPost } from '@/lib/country-audit-post'

export const revalidate = 3600

const COUNTRY_REDIRECTS: Record<string, string> = {
  'macedonia': 'north-macedonia',
  'italia': 'italy',
  'czechia': 'czech-republic',
  'ivory-coast': 'cote-d-ivoire',
  'laramie': 'united-states',
}

interface PageProps {
  params: Promise<{ country: string }>
}

const CATEGORY_LABEL: Record<string, string> = {
  eat: 'Restaurant', store: 'Shop', hotel: 'Stay', organisation: 'Sanctuary', event: 'Event', other: 'Place',
}

function formatDate(d: string | null): string {
  if (!d) return 'not yet verified'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params
  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}/fully-vegan`)
  const { country: countryName } = await getCities(country)
  const { lastVerifiedAt, verifiedCount, totalFv } = await getCountryAuditFreshness(countryName)
  const title = `100% Vegan Places in ${countryName} — ${totalFv} Verified Spots | PlantsPack`
  const description = `Manually verified directory of 100% vegan restaurants, cafés, bakeries, sanctuaries and stores in ${countryName}. ${verifiedCount} of ${totalFv} entries hand-checked against the venue's own website${lastVerifiedAt ? `; last full review ${formatDate(lastVerifiedAt)}` : ''}. Free, ad-free, no paid listings.`
  return {
    title,
    description,
    alternates: { canonical: `https://plantspack.com/vegan-places/${country}/fully-vegan` },
    openGraph: {
      title: `100% Vegan in ${countryName} — ${totalFv} Verified Spots`,
      description,
      type: 'website',
      siteName: 'PlantsPack',
      url: `https://plantspack.com/vegan-places/${country}/fully-vegan`,
    },
  }
}

export default async function CountryFullyVeganPage({ params }: PageProps) {
  const { country } = await params
  if (COUNTRY_REDIRECTS[country]) redirect(`/vegan-places/${COUNTRY_REDIRECTS[country]}/fully-vegan`)

  const { country: countryName } = await getCities(country)
  if (!countryName) notFound()

  const [places, freshness, auditPost] = await Promise.all([
    getFullyVeganPlaces(countryName),
    getCountryAuditFreshness(countryName),
    getCountryAuditPost(country),
  ])

  // Group by city (alphabetical city order, places alphabetical within city)
  const byCity = new Map<string, typeof places>()
  for (const p of places) {
    const c = p.city || '(no city)'
    if (!byCity.has(c)) byCity.set(c, [])
    byCity.get(c)!.push(p)
  }
  const cities = [...byCity.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan Places', url: 'https://plantspack.com/vegan-places' },
    { name: countryName, url: `https://plantspack.com/vegan-places/${country}` },
    { name: '100% Vegan', url: `https://plantspack.com/vegan-places/${country}/fully-vegan` },
  ])

  // Schema.org ItemList so AI/search can parse the place list as structured source data
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `100% Vegan Places in ${countryName}`,
    description: `Manually verified 100% vegan restaurants, cafés, bakeries, sanctuaries and stores in ${countryName}. Each entry checked against the venue's own website.`,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://plantspack.com/place/${p.slug || p.id}`,
      name: p.name,
    })),
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <nav className="text-sm text-on-surface-variant mb-4">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/vegan-places" className="hover:text-primary">Vegan Places</Link>
          <span className="mx-2">›</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary">{countryName}</Link>
          <span className="mx-2">›</span>
          <span className="font-medium">100% Vegan</span>
        </nav>

        <div className="mb-6">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-3">
            100% Vegan in <span className="text-primary">{countryName}</span>
          </h1>
          <p className="text-on-surface-variant text-base mb-3 max-w-3xl">
            A manually verified directory of {freshness.totalFv} fully vegan venues in {countryName}: restaurants, cafés, bakeries, animal sanctuaries, vegan-only stores and stays. Every entry was opened, checked against the venue's own website, and cross-referenced against secondary sources before being tagged 100% vegan.
          </p>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 border border-emerald-100/80">
              <CheckCircle2 className="h-3 w-3" /> {freshness.verifiedCount} of {freshness.totalFv} hand-verified
            </span>
            {freshness.lastVerifiedAt && (
              <span className="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant rounded-full px-2.5 py-1 ghost-border">
                Last review: {formatDate(freshness.lastVerifiedAt)}
              </span>
            )}
            <Link href={`/vegan-places/${country}`} className="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant rounded-full px-2.5 py-1 ghost-border hover:bg-surface-container">
              <ArrowLeft className="h-3 w-3" /> All vegan and vegan-friendly places in {countryName}
            </Link>
          </div>
        </div>

        {auditPost && (
          <Link
            href={`/blog/${auditPost.slug}`}
            className="block mb-6 group bg-surface-container-lowest hover:bg-surface-container-low ghost-border rounded-2xl overflow-hidden editorial-shadow transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-stretch">
              {auditPost.image_url && (
                <div className="md:w-1/4 aspect-[16/9] md:aspect-auto overflow-hidden bg-surface-container-low">
                  <img src={auditPost.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                </div>
              )}
              <div className="flex-1 p-5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2">
                  How we verified {countryName}
                </div>
                <h2 className="text-base md:text-lg font-headline font-bold text-on-surface mb-1 group-hover:text-primary leading-snug">
                  {auditPost.title}
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{auditPost.description}</p>
              </div>
            </div>
          </Link>
        )}

        {places.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-on-surface mb-2">No 100% vegan places in {countryName} yet</h2>
            <p className="text-sm text-on-surface-variant mb-4">We have not found a venue in {countryName} that meets the strict 100% vegan bar yet.</p>
            <Link href={`/vegan-places/${country}`} className="inline-flex items-center gap-2 text-sm font-medium silk-gradient text-on-primary-btn px-4 py-2 rounded-lg hover:opacity-90">
              See all vegan and vegan-friendly places in {countryName} →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {cities.map(([city, list]) => (
              <section key={city}>
                <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface mb-3">
                  {city} <span className="text-sm font-normal text-on-surface-variant">— {list.length} {list.length === 1 ? 'venue' : 'venues'}</span>
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map(p => (
                    <li key={p.id}>
                      <Link href={`/place/${p.slug || p.id}`} className="flex gap-3 bg-surface-container-lowest ghost-border rounded-xl p-3 hover:bg-surface-container-low transition-colors">
                        {p.main_image_url ? (
                          <img src={p.main_image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-surface-container-low" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-surface-container-low flex-shrink-0 flex items-center justify-center text-2xl">🌿</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-on-surface truncate">{p.name}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {CATEGORY_LABEL[p.category || 'eat'] || 'Place'}
                            {p.address ? ` · ${p.address.split(',')[0]}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-[10px] inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-1.5 py-0.5">
                              <CheckCircle2 className="h-2.5 w-2.5" /> 100% vegan
                            </span>
                            {p.verification_level && p.verification_level >= 3 && (
                              <span className="text-[10px] inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full px-1.5 py-0.5">
                                Hand-verified{p.last_verified_at ? ` · ${formatDate(p.last_verified_at)}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-surface-container">
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Looking for vegan-friendly venues with vegan options on an otherwise omnivore menu? They live on the{' '}
            <Link href={`/vegan-places/${country}`} className="text-primary hover:underline font-medium">main {countryName} directory</Link>
            {' '}— this page is the strict 100% vegan tier only.
          </p>
        </div>
      </div>
    </div>
  )
}
