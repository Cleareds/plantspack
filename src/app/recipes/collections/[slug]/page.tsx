import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import RecipeCard from '@/components/recipes/RecipeCard'
import { getCollection, RECIPE_COLLECTIONS, TOOL_META } from '@/lib/collections'
import type { RecipeCollection } from '@/lib/collections'

// Collections are curated + change rarely; cache for an hour.
export const revalidate = 3600

// Below this many matching recipes the page is too thin to index (mirrors the
// country-hub noindex<5 posture). It still renders for users + internal links.
const MIN_RECIPES_TO_INDEX = 3

const RECIPE_SELECT = `
  id, title, slug, content, images, image_url, secondary_tags, created_at,
  recipe_data,
  users!inner(id, username, first_name, last_name, avatar_url)
`

async function getCollectionRecipes(c: RecipeCollection): Promise<any[]> {
  const supabase = createAdminClient()
  const out: any[] = []
  const seen = new Set<string>()

  const push = (rows: any[] | null) => {
    for (const r of rows ?? []) {
      if (!seen.has(r.id)) {
        seen.add(r.id)
        out.push(r)
      }
    }
  }

  // Pinned recipes first.
  if (c.recipeSlugs?.length) {
    const { data } = await supabase
      .from('posts')
      .select(RECIPE_SELECT)
      .eq('category', 'recipe')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .not('recipe_data', 'is', null)
      .in('slug', c.recipeSlugs)
    push(data)
  }

  // Then everything matching the collection's tags.
  if (c.tags?.length) {
    const { data } = await supabase
      .from('posts')
      .select(RECIPE_SELECT)
      .eq('category', 'recipe')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .not('recipe_data', 'is', null)
      .overlaps('secondary_tags', c.tags)
      .order('created_at', { ascending: false })
      .limit(48)
    push(data)
  }

  return out
}

export function generateStaticParams() {
  return RECIPE_COLLECTIONS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = getCollection(slug)
  if (!c) return {}
  const recipes = await getCollectionRecipes(c)
  const canonical = `https://www.plantspack.com/recipes/collections/${c.slug}`
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical },
    // Don't let Google index a near-empty collection.
    robots: recipes.length >= MIN_RECIPES_TO_INDEX ? undefined : { index: false, follow: true },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      type: 'website',
      siteName: 'PlantsPack',
      url: canonical,
    },
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = getCollection(slug)
  if (!c) notFound()

  const recipes = await getCollectionRecipes(c)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.title,
    description: c.metaDescription,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: recipes.length,
      itemListElement: recipes.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://www.plantspack.com/recipe/${r.slug || r.id}`,
        name: r.title || (r.content?.split('\n')[0] ?? '').slice(0, 80),
      })),
    },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Recipes', item: 'https://www.plantspack.com/recipes' },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: 'https://www.plantspack.com/recipes/collections' },
      { '@type': 'ListItem', position: 3, name: c.title, item: `https://www.plantspack.com/recipes/collections/${c.slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-on-surface-variant mb-4" aria-label="Breadcrumb">
          <Link href="/recipes" className="hover:text-primary">Recipes</Link>
          <span className="mx-2">/</span>
          <Link href="/recipes/collections" className="hover:text-primary">Collections</Link>
          <span className="mx-2">/</span>
          <span className="text-on-surface">{c.title}</span>
        </nav>

        {/* Header + pillar intro */}
        <header className="mb-6 max-w-3xl">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">{c.title}</h1>
          <p className="text-lg text-on-surface-variant mb-4">{c.tagline}</p>
          {c.intro.map((p, i) => (
            <p key={i} className="text-on-surface-variant mb-3 leading-relaxed">{p}</p>
          ))}
        </header>

        {/* Gentle-food disclaimer */}
        {c.showComfortDisclaimer && (
          <div className="mb-8 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">A note on comfort:</strong> these recipes are general food
            ideas, not medical or dietary advice. Some ingredients suit some people better than others.
            If you are managing IBS, a low-FODMAP plan, or recovery from a procedure, check with a
            qualified dietitian or your doctor.
          </div>
        )}

        {/* Recipe grid */}
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
            <p className="mb-1 font-medium text-on-surface">Recipes for this collection are coming soon.</p>
            <p className="text-sm">
              We are building these out. In the meantime, browse{' '}
              <Link href="/recipes" className="text-primary hover:underline">all vegan recipes</Link>.
            </p>
          </div>
        )}

        {/* Cross-links into the Library + Tools */}
        {(c.relatedAnswers?.length || c.relatedTools?.length) && (
          <section className="mt-12 grid gap-8 sm:grid-cols-2 max-w-3xl">
            {c.relatedAnswers?.length ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant mb-3">From the Library</h2>
                <ul className="space-y-2">
                  {c.relatedAnswers.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/vegan/${a.slug}`} className="text-primary hover:underline">{a.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {c.relatedTools?.length ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant mb-3">Handy tools</h2>
                <ul className="space-y-2">
                  {c.relatedTools.map((t) => (
                    <li key={t}>
                      <Link href={TOOL_META[t].href} className="text-primary hover:underline">{TOOL_META[t].label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  )
}
