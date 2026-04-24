import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

// Article list needs to refresh quickly when a new post is published but
// shouldn't hammer the DB. 1h ISR is plenty for a blog index.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — PlantsPack',
  description:
    'Data-driven essays on veganism, restaurant rankings by city, and insights from 37,000+ verified vegan places worldwide.',
  alternates: { canonical: 'https://plantspack.com/blog' },
  openGraph: {
    title: 'PlantsPack Blog',
    description:
      'Data-driven essays on veganism, restaurant rankings by city, and insights from 37,000+ verified vegan places worldwide.',
    type: 'website',
    url: 'https://plantspack.com/blog',
    siteName: 'PlantsPack',
  },
}

interface ArticleRow {
  id: string
  slug: string | null
  title: string | null
  content: string
  image_url: string | null
  images: string[] | null
  created_at: string
  users: {
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | Array<{
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }> | null
}

function normaliseUser(u: ArticleRow['users']) {
  if (!u) return null
  return Array.isArray(u) ? u[0] : u
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function readingTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function excerpt(text: string, max = 240): string {
  const clean = text
    .replace(/^#{1,6}\s+/gm, '')        // strip heading markers
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // strip images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/[*_`~]/g, '')              // strip emphasis
    .replace(/^[-*]\s+/gm, '')           // strip list markers
    .replace(/^---+$/gm, '')             // strip hr
    .replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…'
}

async function getArticles(): Promise<ArticleRow[]> {
  const sb = createAdminClient()
  const { data } = await sb
    .from('posts')
    .select(`
      id, slug, title, content, image_url, images, created_at,
      users!inner(username, first_name, last_name, avatar_url)
    `)
    .eq('category', 'article')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data as any[]) || []
}

export default async function BlogIndex() {
  const articles = await getArticles()

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Blog', url: 'https://plantspack.com/blog' },
  ])

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight mb-3">
            PlantsPack <span className="text-primary">Blog</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Data-driven essays on veganism, city-by-city rankings, and what 37,000+ verified vegan places tell us about the world.
          </p>
        </header>

        {articles.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest rounded-2xl ghost-border">
            <p className="text-on-surface-variant">No articles yet. Stay tuned.</p>
          </div>
        ) : (
          <ul className="space-y-8">
            {articles.map((a) => {
              const user = normaliseUser(a.users)
              const name = user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`.trim()
                : (user?.username || 'PlantsPack')
              const heroImage = a.image_url || a.images?.[0] || null
              const href = `/blog/${a.slug || a.id}`
              return (
                <li key={a.id}>
                  <Link
                    href={href}
                    className="group block bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden hover:border-primary/30 transition-all"
                  >
                    <div className="grid md:grid-cols-5 gap-0">
                      {heroImage && (
                        <div className="md:col-span-2 aspect-[16/10] md:aspect-auto overflow-hidden bg-surface-container-low">
                          <img
                            src={heroImage}
                            alt={a.title || ''}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className={`${heroImage ? 'md:col-span-3' : 'md:col-span-5'} p-6 flex flex-col justify-center`}>
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">
                          {formatDate(a.created_at)} · {readingTime(a.content)} min read
                        </p>
                        <h2 className="font-headline font-bold text-2xl md:text-3xl text-on-surface mb-3 group-hover:text-primary transition-colors">
                          {a.title || excerpt(a.content, 80)}
                        </h2>
                        <p className="text-on-surface-variant text-base leading-relaxed">
                          {excerpt(a.content, 240)}
                        </p>
                        <p className="text-sm text-on-surface-variant mt-4">
                          by <span className="font-medium">{name}</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
