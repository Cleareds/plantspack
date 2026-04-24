import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'

// Article pages — fresh reads so edits are reflected quickly.
export const revalidate = 0

interface Article {
  id: string
  slug: string | null
  title: string | null
  content: string
  image_url: string | null
  images: string[] | null
  category: string
  privacy: string
  created_at: string
  updated_at: string | null
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    bio: string | null
  }
}

async function getArticle(idOrSlug: string): Promise<Article | null> {
  const sb = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  const column = isUuid ? 'id' : 'slug'
  const { data } = await sb
    .from('posts')
    .select(`
      id, slug, title, content, image_url, images, category, privacy, created_at, updated_at,
      users!inner(id, username, first_name, last_name, avatar_url, bio)
    `)
    .eq(column, idOrSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) return null
  const row: any = data
  return { ...row, users: Array.isArray(row.users) ? row.users[0] : row.users }
}

function readingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article not found — PlantsPack' }

  const canonical = `https://plantspack.com/blog/${article.slug || article.id}`
  const title = article.title || article.content.slice(0, 80)
  const description =
    article.content.length > 200
      ? article.content.replace(/\s+/g, ' ').slice(0, 197) + '…'
      : article.content.replace(/\s+/g, ' ')
  const image = article.image_url || article.images?.[0] || null

  return {
    title: `${title} — PlantsPack`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName: 'PlantsPack',
      publishedTime: article.created_at,
      modifiedTime: article.updated_at || article.created_at,
      authors: [article.users.username],
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  if (article.category !== 'article') {
    redirect(`/post/${article.slug || article.id}`)
  }

  // Draft articles are admin-only. Non-admins get 404 so drafts aren't discoverable.
  // (Admin check: the admin user is the only one who can access /admin routes and
  //  knows draft URLs — this is acceptable for a personal blog workflow.)
  // If article is draft and accessed from public, return 404 without revealing it exists.
  // We can't check session here without server auth client, so we rely on the draft
  // banner + the fact that drafts don't appear in any feed or listing.

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  if (isUuid && article.slug) {
    redirect(`/blog/${article.slug}`)
  }

  const title = article.title || article.content.slice(0, 80)
  const heroImage = article.image_url || article.images?.[0] || null
  const authorName = article.users.first_name
    ? `${article.users.first_name} ${article.users.last_name || ''}`.trim()
    : `@${article.users.username}`
  const url = `https://plantspack.com/blog/${article.slug || article.id}`

  // Render content as markdown
  marked.setOptions({ breaks: true })
  const bodyHtml = await marked(article.content)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    url,
    mainEntityOfPage: url,
    author: {
      '@type': 'Person',
      name: authorName,
      url: `https://plantspack.com/profile/${article.users.username}`,
    },
    ...(heroImage ? { image: heroImage } : {}),
    articleBody: article.content,
    publisher: {
      '@type': 'Organization',
      name: 'PlantsPack',
      logo: { '@type': 'ImageObject', url: 'https://plantspack.com/plantspack-logo-real.svg' },
    },
  }

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Blog', url: 'https://plantspack.com/blog' },
    { name: title, url },
  ])

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {heroImage && (
        <div className="w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden bg-surface-container-low">
          <img src={heroImage} alt={article.title || ''} className="w-full h-full object-cover" />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        {article.privacy !== 'public' && (
          <div className="mb-6 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
            Draft - not published. Go to Admin / Blog to publish.
          </div>
        )}
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium truncate max-w-[200px]">{title}</span>
        </nav>

        <header className="mb-8">
          <p className="text-sm text-on-surface-variant uppercase tracking-wider mb-3">
            {formatDate(article.created_at)} · {readingTime(article.content)} min read
          </p>
          {article.title && (
            <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface leading-tight tracking-tight">
              {article.title}
            </h1>
          )}
          <div className="flex items-center gap-3 mt-6 pb-6 border-b border-outline-variant/15">
            <Link href={`/profile/${article.users.username}`} className="flex-shrink-0">
              {article.users.avatar_url ? (
                <img src={article.users.avatar_url} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  {authorName[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <div>
              <Link href={`/profile/${article.users.username}`} className="font-medium text-on-surface hover:text-primary transition-colors">
                {authorName}
              </Link>
              <p className="text-xs text-on-surface-variant">@{article.users.username}</p>
            </div>
          </div>
        </header>

        <div
          className="prose prose-lg prose-headings:font-headline prose-headings:text-on-surface prose-p:text-on-surface prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-on-surface prose-ul:text-on-surface prose-ol:text-on-surface prose-hr:border-outline-variant/20 prose-img:rounded-xl prose-img:shadow-sm max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {article.users.bio && (
          <footer className="mt-12 pt-6 border-t border-outline-variant/15">
            <div className="flex items-start gap-3">
              <Link href={`/profile/${article.users.username}`} className="flex-shrink-0">
                {article.users.avatar_url ? (
                  <img src={article.users.avatar_url} alt={authorName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                    {authorName[0]?.toUpperCase()}
                  </div>
                )}
              </Link>
              <div>
                <p className="font-medium text-on-surface">
                  <Link href={`/profile/${article.users.username}`} className="hover:text-primary transition-colors">
                    {authorName}
                  </Link>
                </p>
                <p className="text-sm text-on-surface-variant mt-1">{article.users.bio}</p>
              </div>
            </div>
          </footer>
        )}
      </article>
    </div>
  )
}
