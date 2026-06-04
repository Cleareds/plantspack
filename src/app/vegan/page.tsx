import { Metadata } from 'next'
import Link from 'next/link'
import { Leaf, Wine, Plane, ArrowRight, Barcode, ChefHat, UtensilsCrossed, Sparkle } from 'lucide-react'
import { INGREDIENT_ARTICLES, TRAVEL_GUIDES } from '@/lib/vegan-content'

export const metadata: Metadata = {
  title: 'Vegan answers — is it vegan? Travel guides | PlantsPack',
  description: 'Researched answers to "is X vegan?" questions plus practical country-by-country travel guides for vegans. Free, no fluff.',
  alternates: { canonical: 'https://www.plantspack.com/vegan' },
}

export const revalidate = 86400

export default function VeganHubPage() {
  const ingredients = INGREDIENT_ARTICLES.filter((a) => a.category === 'ingredient')
  const drinks = INGREDIENT_ARTICLES.filter((a) => a.category === 'drink')
  const lifestyle = INGREDIENT_ARTICLES.filter((a) => a.category === 'lifestyle')

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          Vegan answers
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8 max-w-2xl">
          Researched answers to common &quot;is X vegan?&quot; questions and country-by-country travel guides. No fluff, no fake studies, sources cited.
        </p>

        {/* Tools strip — bridge from "reading about" to "doing".
            Surfacing the four tools that most often answer the question
            the visitor came here for. */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/tools/barcode" className="block p-4 rounded-xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition">
              <Barcode className="h-5 w-5 text-primary mb-2" />
              <div className="font-bold text-sm text-on-surface">Barcode scanner</div>
              <div className="text-xs text-on-surface-variant mt-0.5">Check a product</div>
            </Link>
            <Link href="/tools/drinks" className="block p-4 rounded-xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition">
              <Wine className="h-5 w-5 text-primary mb-2" />
              <div className="font-bold text-sm text-on-surface">Is this drink vegan?</div>
              <div className="text-xs text-on-surface-variant mt-0.5">Beer / wine / spirits</div>
            </Link>
            <Link href="/tools/baking" className="block p-4 rounded-xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition">
              <ChefHat className="h-5 w-5 text-primary mb-2" />
              <div className="font-bold text-sm text-on-surface">Baking calculator</div>
              <div className="text-xs text-on-surface-variant mt-0.5">Exact substitute ratios</div>
            </Link>
            <Link href="/tools/menu-scanner" className="block p-4 rounded-xl ghost-border bg-surface-container-lowest hover:border-primary/30 transition">
              <UtensilsCrossed className="h-5 w-5 text-primary mb-2" />
              <div className="font-bold text-sm text-on-surface">Menu scanner</div>
              <div className="text-xs text-on-surface-variant mt-0.5">For eating out abroad</div>
            </Link>
          </div>
        </section>

        {ingredients.length > 0 && (
          <Section icon={Leaf} title="Ingredients & foods" items={ingredients.map((a) => ({
            href: `/vegan/${a.slug}`,
            title: a.title,
            subtitle: a.verdictHeadline,
          }))} />
        )}

        {drinks.length > 0 && (
          <Section icon={Wine} title="Drinks" items={drinks.map((a) => ({
            href: `/vegan/${a.slug}`,
            title: a.title,
            subtitle: a.verdictHeadline,
          }))} />
        )}

        {lifestyle.length > 0 && (
          <Section icon={Leaf} title="Lifestyle" items={lifestyle.map((a) => ({
            href: `/vegan/${a.slug}`,
            title: a.title,
            subtitle: a.verdictHeadline,
          }))} />
        )}

        {TRAVEL_GUIDES.length > 0 && (
          <Section icon={Plane} title="Travel guides" items={TRAVEL_GUIDES.map((g) => ({
            href: `/vegan/travel/${g.countrySlug}`,
            title: `Vegan in ${g.countryName}`,
            subtitle: g.vegFriendlinessNote,
          }))} />
        )}

        <Section icon={Leaf} title="Reference" items={[
          {
            href: '/glossary',
            title: 'Vegan glossary',
            subtitle: 'Plain-language definitions of vegan ingredients, certifications, fining agents, and additive families.',
          },
          {
            href: '/methodology',
            title: 'How we classify places',
            subtitle: 'The four vegan-level tiers we use and how we verify each entry.',
          },
          {
            href: '/research/vegan-places-2026',
            title: 'Vegan places worldwide: 2026 data report',
            subtitle: 'Original analysis of 52,870 verified places - top countries, fully-vegan share by region, city density.',
          },
          {
            href: '/compare/happycow',
            title: 'PlantsPack vs HappyCow - honest comparison',
            subtitle: 'Where they win, where we win, where we are catching up. We use both.',
          },
        ]} />
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Leaf
  title: string
  items: { href: string; title: string; subtitle: string }[]
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl ghost-border bg-surface-container-lowest p-5 hover:border-primary/30 transition group"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-on-surface group-hover:text-primary transition-colors mb-1">
                  {item.title}
                </div>
                <div className="text-sm text-on-surface-variant leading-relaxed">{item.subtitle}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-on-surface-variant flex-shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
