import { Metadata } from 'next'
import Link from 'next/link'
import { INGREDIENT_ARTICLES, TRAVEL_GUIDES } from '@/lib/vegan-content'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vegan Library - Answers, Guides, Glossary & Reads | PlantsPack',
  description:
    'The PlantsPack Library: clear "is it vegan?" answers, country guides, a plain-language glossary, and reads from our team. Reference and opinion, kept honest.',
  alternates: { canonical: 'https://www.plantspack.com/library' },
  openGraph: {
    title: 'Vegan Library | PlantsPack',
    description:
      'Clear "is it vegan?" answers, country guides, a plain-language glossary, and reads from our team.',
    type: 'website',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/library',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function LibraryPage() {
  const answers = INGREDIENT_ARTICLES.filter((a) => a.category === 'ingredient' || a.category === 'drink')
  const reference = INGREDIENT_ARTICLES.filter((a) => a.category === 'lifestyle')

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">Library</h1>
          <p className="text-on-surface-variant leading-relaxed">
            Everything to read on PlantsPack in one place - sourced answers and reference, plus
            opinion and essays from our team. We keep the two clearly apart.
          </p>
        </header>

        {/* Quick links - every Library section linked in the first viewport */}
        <nav aria-label="Library sections" className="mb-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/vegan', label: 'Answers', sub: 'Is it vegan?' },
            { href: '#guides', label: 'Guides', sub: 'Country & reference' },
            { href: '/glossary', label: 'Glossary', sub: 'Vegan terms' },
            { href: '/blog', label: 'Reads', sub: 'Essays & opinion' },
          ].map((q) => (
            <a
              key={q.href}
              href={q.href}
              className="rounded-2xl bg-surface-container-lowest ghost-border p-5 hover:shadow-md transition-shadow"
            >
              <span className="block font-semibold text-on-surface">{q.label}</span>
              <span className="block text-sm text-on-surface-variant mt-0.5">{q.sub}</span>
            </a>
          ))}
        </nav>

        {/* Answers */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl font-semibold text-on-surface">Is it vegan? - Answers</h2>
            <Link href="/vegan" className="text-sm text-primary hover:underline">All answers</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {answers.map((a) => (
              <Link
                key={a.slug}
                href={`/vegan/${a.slug}`}
                className="block rounded-xl bg-surface-container-lowest ghost-border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-on-surface text-sm mb-1">{a.title}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{a.verdictHeadline}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Guides & reference */}
        <section id="guides" className="mb-10 scroll-mt-20">
          <h2 className="text-xl font-semibold text-on-surface mb-3">Guides &amp; reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reference.map((a) => (
              <Link
                key={a.slug}
                href={`/vegan/${a.slug}`}
                className="block rounded-xl bg-surface-container-lowest ghost-border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-on-surface text-sm mb-1">{a.title}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{a.verdictHeadline}</p>
              </Link>
            ))}
            {TRAVEL_GUIDES.map((g) => (
              <Link
                key={g.countrySlug}
                href={`/vegan/travel/${g.countrySlug}`}
                className="block rounded-xl bg-surface-container-lowest ghost-border p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-on-surface text-sm mb-1">Eating vegan in {g.countryName}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{g.tldr}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
