import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { renderBlogContent } from '@/lib/blog-renderer'
import { createClient } from '@/lib/supabase-server'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import BlogEngagement from '@/components/blog/BlogEngagement'

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

async function getArticle(idOrSlug: string): Promise<(Article & { tags?: string[] | null }) | null> {
  const sb = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  const column = isUuid ? 'id' : 'slug'
  const { data } = await sb
    .from('posts')
    .select(`
      id, slug, title, content, image_url, images, category, privacy, created_at, updated_at, tags,
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

  const canonical = `https://www.plantspack.com/blog/${article.slug || article.id}`
  const title = article.title || article.content.slice(0, 80)
  const description =
    article.content.length > 200
      ? article.content.replace(/\s+/g, ' ').slice(0, 197) + '…'
      : article.content.replace(/\s+/g, ' ')
  // Resolution order for the OG / Twitter share image:
  //   1. image_url (explicit hero set in admin)
  //   2. images[0] (first attached image from the structured field)
  //   3. first inline markdown image in the content (![alt](url))
  // The third step makes share-card thumbnails work even when the author
  // just pastes a markdown article without setting image_url explicitly.
  const inlineImageMatch = article.content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/)
  const image = article.image_url || article.images?.[0] || inlineImageMatch?.[1] || null

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

  // Draft articles are admin-only — return 404 for everyone else.
  if (article.privacy === 'draft') {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) {
      const { data: profile } = await createAdminClient()
        .from('users').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') notFound()
    } else {
      notFound()
    }
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  if (isUuid && article.slug) {
    redirect(`/blog/${article.slug}`)
  }

  const title = article.title || article.content.slice(0, 80)
  const heroImage = article.image_url || article.images?.[0] || null
  const authorName = article.users.first_name
    ? `${article.users.first_name} ${article.users.last_name || ''}`.trim()
    : `@${article.users.username}`
  const url = `https://www.plantspack.com/blog/${article.slug || article.id}`

  // Render content as markdown with custom extensions ([[place:slug]] cards)
  const rendered = await renderBlogContent(article.content)
  const bodyHtml = rendered.html

  // Pull a short clean description from the body for SEO + JSON-LD.
  // Strip place tokens, markdown images and links, then take the first 197 chars.
  const description = article.content
    .replace(/\[\[place:[a-z0-9-]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')   // strip markdown images
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')      // strip links, keep anchor text
    .replace(/[#*_`>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
    .replace(/\s\S*$/, '') + '...'

  const wordCount = (article.content || '').trim().split(/\s+/).length
  const keywords = Array.isArray((article as any).tags) ? (article as any).tags as string[] : []

  // FAQ schema: extract H2 "FAQ" or "Frequently asked questions" section and its child Q/A pairs.
  // Markdown convention used in posts: `### Question?` followed by paragraph answer.
  const faqMatch = article.content.match(/##+\s*(?:FAQ|Frequently asked questions)[^\n]*\n([\s\S]+?)(?=\n##\s|\n---|\n\*\*Want|\Z)/i)
  const faqItems: { q: string; a: string }[] = []
  if (faqMatch) {
    const block = faqMatch[1]
    const qaRegex = /###\s+([^\n]+?)\s*\n([\s\S]+?)(?=\n###\s|$)/g
    for (const m of block.matchAll(qaRegex)) {
      const q = m[1].trim().replace(/[?]?$/, '?')
      const a = m[2]
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/[#*_`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (a) faqItems.push({ q, a })
    }
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    url,
    mainEntityOfPage: url,
    wordCount,
    inLanguage: 'en',
    ...(keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
    author: {
      '@type': 'Person',
      name: authorName,
      url: `https://www.plantspack.com/profile/${article.users.username}`,
    },
    ...(heroImage ? { image: heroImage } : {}),
    articleBody: article.content,
    publisher: {
      '@type': 'Organization',
      name: 'PlantsPack',
      url: 'https://www.plantspack.com',
      logo: { '@type': 'ImageObject', url: 'https://www.plantspack.com/og-logo.png' },
    },
  }

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Blog', url: 'https://www.plantspack.com/blog' },
    { name: title, url },
  ])

  // ItemList of all places referenced via [[place:slug]] tokens, in order.
  const itemListJsonLd = rendered.places.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Places mentioned in: ${title}`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: rendered.places.length,
    itemListElement: rendered.places.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.plantspack.com/place/${p.slug}`,
      name: p.name,
    })),
  } : null

  const faqJsonLd = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  } : null

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

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
          className={[
            'prose prose-lg max-w-none',
            // headings
            'prose-headings:font-headline prose-headings:font-bold prose-headings:text-on-surface prose-headings:tracking-tight',
            'prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-outline-variant/15 prose-h2:pb-2',
            'prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3',
            // body text
            'prose-p:text-on-surface prose-p:leading-relaxed prose-p:my-4',
            // links
            'prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:break-words',
            // bold/em
            'prose-strong:text-on-surface prose-strong:font-semibold',
            // lists
            'prose-ul:text-on-surface prose-ol:text-on-surface prose-li:my-1',
            // hr
            'prose-hr:border-outline-variant/20 prose-hr:my-10',
            // images
            'prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8 prose-img:w-full',
            // blockquote
            'prose-blockquote:border-l-primary prose-blockquote:text-on-surface-variant prose-blockquote:not-italic',
          ].join(' ')}
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

        <BlogEngagement postId={article.id} />
      </article>
    </div>
  )
}
