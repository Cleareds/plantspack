import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react'
import { INGREDIENT_ARTICLES, getIngredientArticle } from '@/lib/vegan-content'
import type { Verdict } from '@/lib/vegan-content/types'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import ECodeSearch from './_components/ECodeSearch'

export const revalidate = 86400

type Props = { params: Promise<{ topic: string }> }

export async function generateStaticParams() {
  return INGREDIENT_ARTICLES.map((a) => ({ topic: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params
  const article = getIngredientArticle(topic)
  if (!article) return { title: 'Not found' }
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: { canonical: `https://www.plantspack.com/vegan/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.tldr,
      type: 'article',
      url: `https://www.plantspack.com/vegan/${article.slug}`,
      siteName: 'PlantsPack',
    },
  }
}

const TOOL_LABELS: Record<string, { label: string; href: string }> = {
  'ingredient-scanner': { label: 'Ingredient label scanner', href: '/tools/ingredient-scanner' },
  'menu-scanner': { label: 'Menu scanner', href: '/tools/menu-scanner' },
  'barcode': { label: 'Barcode scanner', href: '/tools/barcode' },
  'substitutes': { label: 'Substitute finder', href: '/tools/substitutes' },
  'cards': { label: 'Printable cards', href: '/tools/cards' },
  'calculator': { label: 'Impact calculator', href: '/tools/calculator' },
  'drinks': { label: 'Vegan drinks lookup', href: '/tools/drinks' },
  'cosmetics': { label: 'Cosmetics barcode scanner', href: '/tools/barcode?mode=cosmetics' },
  'baking': { label: 'Baking substitute calculator', href: '/tools/baking' },
}

const VERDICT_THEME: Record<Verdict, { Icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  'usually-yes': { Icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success', label: 'Usually yes' },
  'sometimes': { Icon: HelpCircle, bg: 'bg-warning/10', text: 'text-warning', label: 'Sometimes' },
  'usually-no': { Icon: AlertCircle, bg: 'bg-error/10', text: 'text-error', label: 'Usually no' },
  'depends': { Icon: HelpCircle, bg: 'bg-on-surface/10', text: 'text-on-surface-variant', label: 'Depends' },
}

export default async function IngredientArticlePage({ params }: Props) {
  const { topic } = await params
  const article = getIngredientArticle(topic)
  if (!article) notFound()

  const theme = VERDICT_THEME[article.verdict]
  const url = `https://www.plantspack.com/vegan/${article.slug}`

  // FAQPage JSON-LD - this is the heavy SEO signal for "is X vegan" queries
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.tldr,
    datePublished: article.updatedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    publisher: { '@type': 'Organization', name: 'PlantsPack', url: 'https://www.plantspack.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan answers', url: 'https://www.plantspack.com/vegan' },
    { name: article.title, url },
  ])

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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

        <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          {article.title}
        </h1>

        <div className={`rounded-2xl ${theme.bg} p-5 mb-6 flex items-start gap-3`}>
          <theme.Icon className={`h-6 w-6 ${theme.text} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className={`text-xs uppercase tracking-wider font-bold ${theme.text} mb-1`}>Short answer: {theme.label}</div>
            <p className="text-on-surface font-semibold leading-relaxed">{article.verdictHeadline}</p>
          </div>
        </div>

        <div className="rounded-2xl ghost-border bg-surface-container-lowest p-5 mb-8">
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2">TL;DR</div>
          <p className="text-on-surface leading-relaxed">{article.tldr}</p>
        </div>

        <div className="prose prose-on-surface max-w-none mb-8">
          {article.fullAnswer.map((p, i) => (
            <p key={i} className="text-on-surface leading-relaxed mb-4">{p}</p>
          ))}
        </div>

        {article.slug === 'e-codes' && <ECodeSearch />}

        {article.whatToLookFor && (
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            <div className="rounded-2xl bg-success/5 ghost-border p-5">
              <div className="text-xs uppercase tracking-wider font-bold text-success mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Look for
              </div>
              <ul className="space-y-2 text-sm text-on-surface">
                {article.whatToLookFor.good.map((g, i) => (
                  <li key={i} className="flex gap-2"><span className="text-success">+</span><span>{g}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-error/5 ghost-border p-5">
              <div className="text-xs uppercase tracking-wider font-bold text-error mb-3 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Avoid
              </div>
              <ul className="space-y-2 text-sm text-on-surface">
                {article.whatToLookFor.avoid.map((a, i) => (
                  <li key={i} className="flex gap-2"><span className="text-error">-</span><span>{a}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-5">Frequently asked</h2>
          <div className="space-y-4">
            {article.faq.map((f, i) => (
              <div key={i} className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
                <h3 className="font-bold text-on-surface mb-2">{f.question}</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {article.relatedTools.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-on-surface mb-4">Helpful tools</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {article.relatedTools.map((t) => {
                const tool = TOOL_LABELS[t]
                if (!tool) return null
                return (
                  <Link key={t} href={tool.href} className="rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition flex items-center justify-between">
                    <span className="font-semibold text-on-surface text-sm">{tool.label}</span>
                    <ArrowLeft className="h-4 w-4 text-on-surface-variant rotate-180" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {article.relatedTopics.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-on-surface mb-4">Related answers</h2>
            <div className="flex flex-wrap gap-2">
              {article.relatedTopics.map((slug) => {
                const a = INGREDIENT_ARTICLES.find((x) => x.slug === slug)
                if (!a) return null
                return (
                  <Link key={slug} href={`/vegan/${a.slug}`} className="px-4 py-2 rounded-full ghost-border bg-surface-container-lowest text-sm font-semibold hover:border-primary/30">
                    {a.title}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Cross-link to reference pages on every article. Helps with
            both internal navigation and LLM citation - establishing that
            this article sits within a wider, methodologically-grounded
            content hub. */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-on-surface mb-4">Reference</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/glossary" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-0.5">Vegan glossary</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Plain-language definitions of ingredients, certifications, and additive families.</div>
            </Link>
            <Link href="/methodology" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-0.5">How we classify places</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">The four vegan-level tiers we use and how we verify each entry.</div>
            </Link>
          </div>
        </section>

        {article.sources && article.sources.length > 0 && (
          <section className="mt-12 pt-8 border-t border-on-surface/10">
            <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Sources</h2>
            <ul className="space-y-1.5 text-sm">
              {article.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    {s.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-on-surface-variant mt-3">Last updated: {article.updatedAt}</p>
          </section>
        )}
      </article>
    </div>
  )
}
