import { Metadata } from 'next'
import Link from 'next/link'
import { RECIPE_COLLECTIONS } from '@/lib/collections'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vegan Recipe Collections | PlantsPack',
  description:
    'Curated vegan recipe collections for real situations - soft food after dental work, low-FODMAP-friendly smoothies, high-protein cream soups, and more.',
  alternates: { canonical: 'https://www.plantspack.com/recipes/collections' },
  openGraph: {
    title: 'Vegan Recipe Collections | PlantsPack',
    description:
      'Curated vegan recipe collections for real situations - soft food after dental work, low-FODMAP-friendly smoothies, high-protein cream soups, and more.',
    type: 'website',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/recipes/collections',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function CollectionsIndexPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Vegan Recipe Collections',
    description: 'Curated vegan recipe collections for real situations.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: RECIPE_COLLECTIONS.length,
      itemListElement: RECIPE_COLLECTIONS.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://www.plantspack.com/recipes/collections/${c.slug}`,
        name: c.title,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-on-surface-variant mb-4" aria-label="Breadcrumb">
          <Link href="/recipes" className="hover:text-primary">Recipes</Link>
          <span className="mx-2">/</span>
          <span className="text-on-surface">Collections</span>
        </nav>

        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">Recipe Collections</h1>
          <p className="text-on-surface-variant">
            Vegan recipes grouped for real situations - gentle, soft, and practical. Each collection
            pulls together recipes plus the answers and tools that go with them.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {RECIPE_COLLECTIONS.map((c) => (
            <Link
              key={c.slug}
              href={`/recipes/collections/${c.slug}`}
              className="group block bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <h2 className="font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors">{c.title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">{c.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
