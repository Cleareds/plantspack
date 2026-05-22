import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, MapPin, MessageSquare, Utensils, AlertTriangle, Lightbulb } from 'lucide-react'
import { TRAVEL_GUIDES, getTravelGuide } from '@/lib/vegan-content'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

export const revalidate = 86400

type Props = { params: Promise<{ country: string }> }

export async function generateStaticParams() {
  return TRAVEL_GUIDES.map((g) => ({ country: g.countrySlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params
  const guide = getTravelGuide(country)
  if (!guide) return { title: 'Not found' }
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `https://www.plantspack.com/vegan/travel/${guide.countrySlug}` },
    openGraph: {
      title: `How to eat vegan in ${guide.countryName}`,
      description: guide.tldr,
      type: 'article',
      url: `https://www.plantspack.com/vegan/travel/${guide.countrySlug}`,
      siteName: 'PlantsPack',
    },
  }
}

export default async function TravelGuidePage({ params }: Props) {
  const { country } = await params
  const guide = getTravelGuide(country)
  if (!guide) notFound()

  const url = `https://www.plantspack.com/vegan/travel/${guide.countrySlug}`
  const placesUrl = `/vegan-places/${guide.countrySlug}`

  // Article schema (not TravelGuide - more universally understood by Google)
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `How to eat vegan in ${guide.countryName}`,
    description: guide.tldr,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    publisher: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    about: { '@type': 'Country', name: guide.countryName },
  }

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan answers', url: 'https://www.plantspack.com/vegan' },
    { name: 'Travel', url: 'https://www.plantspack.com/vegan' },
    { name: guide.countryName, url },
  ])

  const stars = '★★★★★'.slice(0, guide.vegFriendliness) + '☆☆☆☆☆'.slice(0, 5 - guide.vegFriendliness)

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <article className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <Link
          href="/vegan"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All vegan answers
        </Link>

        <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-3">
          How to eat vegan in {guide.countryName}
        </h1>
        <p className="text-on-surface-variant mb-3">
          <span className="font-semibold text-on-surface">{stars}</span> {guide.vegFriendlinessNote}
        </p>

        {/* Prominent CTA back to country places page - the asymmetric link
            signal that tells Google "country page is the authority for
            'vegan [country]' queries; this page is supporting content." */}
        <Link
          href={placesUrl}
          className="group block rounded-2xl bg-primary/5 border border-primary/30 p-5 mb-8 hover:bg-primary/10 transition"
        >
          <div className="flex items-center gap-4">
            <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider font-bold text-primary mb-0.5">Find places</div>
              <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                Vegan restaurants &amp; cafés in {guide.countryName}
              </div>
              <div className="text-sm text-on-surface-variant">PlantsPack&apos;s verified directory</div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
          </div>
        </Link>

        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5 mb-8">
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">TL;DR</div>
          <p className="text-on-surface leading-relaxed">{guide.tldr}</p>
        </div>

        <div className="prose prose-on-surface max-w-none mb-10">
          {guide.intro.map((p, i) => (
            <p key={i} className="text-on-surface leading-relaxed mb-4">{p}</p>
          ))}
        </div>

        {guide.phrases.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-on-surface">Key phrases</h2>
            </div>
            <div className="rounded-2xl ghost-border bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-on-surface/5">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-on-surface">English</th>
                    <th className="text-left px-4 py-3 font-bold text-on-surface">In {guide.countryName}</th>
                    <th className="text-left px-4 py-3 font-bold text-on-surface hidden md:table-cell">How to say it</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.phrases.map((p, i) => (
                    <tr key={i} className="border-t border-on-surface/10">
                      <td className="px-4 py-3 text-on-surface">{p.english}</td>
                      <td className="px-4 py-3 text-on-surface font-semibold">{p.native}</td>
                      <td className="px-4 py-3 text-on-surface-variant italic hidden md:table-cell">{p.pronunciation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-on-surface">Dish dictionary</h2>
          </div>
          <DishGroup title="Reliably vegan" tint="success" dishes={guide.dishes.vegan} />
          <DishGroup title="Ask before ordering" tint="warning" dishes={guide.dishes.ask} />
          <DishGroup title="Avoid (or ask for a swap)" tint="error" dishes={guide.dishes.avoid} />
        </section>

        {guide.hiddenIngredients.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="text-2xl font-bold text-on-surface">Hidden ingredients to watch for</h2>
            </div>
            <ul className="space-y-2">
              {guide.hiddenIngredients.map((h, i) => (
                <li key={i} className="rounded-xl ghost-border bg-warning/5 p-3 text-sm text-on-surface leading-relaxed">{h}</li>
              ))}
            </ul>
          </section>
        )}

        {guide.tips.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-on-surface">Practical tips</h2>
            </div>
            <ul className="space-y-2 list-disc list-outside ml-5 text-on-surface">
              {guide.tips.map((t, i) => (
                <li key={i} className="leading-relaxed">{t}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-on-surface/10 text-xs text-on-surface-variant">
          Last updated: {guide.updatedAt}
        </div>
      </article>
    </div>
  )
}

function DishGroup({ title, tint, dishes }: { title: string; tint: 'success' | 'warning' | 'error'; dishes: { name: string; nativeName?: string; status: string; note: string }[] }) {
  if (dishes.length === 0) return null
  const tints = {
    success: { bg: 'bg-success/5', text: 'text-success' },
    warning: { bg: 'bg-warning/5', text: 'text-warning' },
    error: { bg: 'bg-error/5', text: 'text-error' },
  }[tint]
  return (
    <div className="mb-5">
      <h3 className={`text-xs uppercase tracking-wider font-bold ${tints.text} mb-2`}>{title}</h3>
      <div className="space-y-2">
        {dishes.map((d, i) => (
          <div key={i} className={`rounded-xl ${tints.bg} p-3`}>
            <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
              <span className="font-semibold text-on-surface">{d.name}</span>
              {d.nativeName && <span className="text-sm text-on-surface-variant">{d.nativeName}</span>}
            </div>
            <div className="text-sm text-on-surface-variant leading-relaxed">{d.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
