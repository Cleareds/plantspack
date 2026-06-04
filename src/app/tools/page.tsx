import { Metadata } from 'next'
import Link from 'next/link'
import {
  Barcode, ScanLine, UtensilsCrossed, Calculator, Printer, Lock, Sparkles,
  Replace, History, Wine, ChefHat, Sparkle, ShoppingBag, ChefHat as ChefIcon,
  Plane, TrendingUp, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Vegan Tools — Barcode, Ingredient, Menu, Drinks & Baking | PlantsPack',
  description: 'Free vegan tools that work the way real life does: scan barcodes, check ingredient labels, translate menus, calculate baking substitutes, look up beer/wine vegan status. No ads, no tracking.',
  alternates: { canonical: 'https://www.plantspack.com/tools' },
}

type Tool = {
  href: string
  title: string
  blurb: string
  icon: typeof Barcode
  gate: string
  featured?: boolean
}

// ---------- Tool sections, grouped by job-to-be-done ----------

const SHOP_TOOLS: Tool[] = [
  {
    href: '/tools/barcode',
    title: 'Food barcode scanner',
    blurb: 'Point your phone camera at any product. We check Open Food Facts and flag anything non-vegan.',
    icon: Barcode,
    gate: 'Free, no sign-up',
    featured: true,
  },
  {
    href: '/tools/barcode?mode=cosmetics',
    title: 'Cosmetics barcode scanner',
    blurb: 'Same scanner, Open Beauty Facts mode. Flags lanolin, carmine, beeswax, silk, snail mucin, keratin.',
    icon: Sparkle,
    gate: 'Free, no sign-up',
  },
  {
    href: '/tools/ingredient-scanner',
    title: 'Ingredient label scanner',
    blurb: 'Photo of the ingredient list. We read it and call out hidden animal-derived items.',
    icon: ScanLine,
    gate: '1 guest scan · 3/mo signed in · unlimited for supporters',
  },
  {
    href: '/tools/drinks',
    title: 'Is this drink vegan?',
    blurb: 'Beer, wine, spirits, liqueurs, ciders. Curated list of mainstream brands with confirmed vegan status.',
    icon: Wine,
    gate: 'Free, no sign-in',
  },
]

const KITCHEN_TOOLS: Tool[] = [
  {
    href: '/tools/baking',
    title: 'Baking substitute calculator',
    blurb: 'Type how much egg, butter, milk, buttermilk, cream, honey, or gelatin your recipe needs. We give exact plant replacement amounts matched to your recipe type.',
    icon: ChefHat,
    gate: 'Free, no sign-in',
    featured: true,
  },
  {
    href: '/tools/substitutes',
    title: 'Vegan substitute finder',
    blurb: 'Search any non-vegan ingredient (milk, eggs, gelatin, mayo, mince) and get the best plant swaps with notes on what each works for.',
    icon: Replace,
    gate: 'Free, no sign-up',
  },
]

const RESTAURANT_TOOLS: Tool[] = [
  {
    href: '/tools/menu-scanner',
    title: 'Menu scanner',
    blurb: 'Photo of a restaurant menu. We highlight vegan dishes, flag ones to ask about, suggest swaps. Built for non-English-speaking countries.',
    icon: UtensilsCrossed,
    gate: '1 guest scan · 3/mo signed in · unlimited for supporters',
    featured: true,
  },
  {
    href: '/tools/cards',
    title: 'Printable restaurant cards',
    blurb: 'Cards in 30+ languages explaining you\'re vegan. Hand to your waiter, save to your phone, print before a trip.',
    icon: Printer,
    gate: 'Free, no sign-in',
  },
]

const TRACK_TOOLS: Tool[] = [
  {
    href: '/tools/calculator',
    title: 'Vegan impact calculator',
    blurb: 'How many animals, litres of water, and kg of CO2 your vegan years have saved. Shareable card. Peer-reviewed sources.',
    icon: Calculator,
    gate: 'Free, no sign-in',
  },
  {
    href: '/tools/history',
    title: 'My scan history',
    blurb: 'Your past ingredient and menu scans, kept private to your profile.',
    icon: History,
    gate: 'Signed-in users only',
  },
]

const SCENARIOS = [
  { label: 'I\'m shopping', target: '#shop', icon: ShoppingBag },
  { label: 'I\'m cooking', target: '#kitchen', icon: ChefIcon },
  { label: 'I\'m eating out', target: '#restaurant', icon: Plane },
  { label: 'Track my impact', target: '#track', icon: TrendingUp },
]

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">

        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tools</span>
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
            Vegan tools that fit real life
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto">
            Free to use. No ads. No tracking. Supporter-funded so we never have to monetise your scans.
          </p>
        </div>

        {/* Scenario chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {SCENARIOS.map((s) => (
            <a
              key={s.target}
              href={s.target}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full ghost-border bg-surface-container-lowest text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition"
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </a>
          ))}
        </div>

        {/* Featured / gateway tool — the barcode scanner is the no-cost
            gateway most users want, so it gets a hero card above the
            sectioned list. */}
        <Link
          href="/tools/barcode"
          className="block rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 md:p-8 mb-12 hover:bg-primary/10 transition group"
        >
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
              <Barcode className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">Start here</div>
              <h2 className="font-bold text-on-surface text-xl md:text-2xl mb-2">Scan a barcode</h2>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed mb-3">
                The fastest way to check if a packaged product is vegan. Camera scan in 2 seconds. Works on food and (in cosmetics mode) on shampoo, makeup, skincare. Free, unlimited, no sign-up.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-2 transition-all">
                Open scanner <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        {/* Section: In the shop */}
        <ToolSection
          id="shop"
          icon={ShoppingBag}
          title="In the shop"
          subtitle="Standing in front of a label or shelf"
          tools={SHOP_TOOLS}
        />

        {/* Section: In the kitchen */}
        <ToolSection
          id="kitchen"
          icon={ChefIcon}
          title="In the kitchen"
          subtitle="Converting a recipe or planning a meal"
          tools={KITCHEN_TOOLS}
        />

        {/* Section: Eating out */}
        <ToolSection
          id="restaurant"
          icon={Plane}
          title="Eating out / travelling"
          subtitle="At a restaurant, especially abroad"
          tools={RESTAURANT_TOOLS}
        />

        {/* Section: Tracking */}
        <ToolSection
          id="track"
          icon={TrendingUp}
          title="Tracking & sharing"
          subtitle="See your impact, revisit past scans"
          tools={TRACK_TOOLS}
        />

        {/* Reference + transparency row - bridges tools to the wider
            content + methodology layer for both users and LLM citation. */}
        <section className="mt-12 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-on-surface">Reference</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/methodology" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-1">Methodology</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">How we classify and verify places.</div>
            </Link>
            <Link href="/glossary" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-1">Glossary</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Plain-language vegan term definitions.</div>
            </Link>
            <Link href="/research/vegan-places-2026" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-1">Data report 2026</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Original analysis of 52,870 verified places.</div>
            </Link>
            <Link href="/compare/happycow" className="block rounded-xl ghost-border bg-surface-container-lowest p-4 hover:border-primary/30 transition">
              <div className="font-bold text-sm text-on-surface mb-1">Compare vs HappyCow</div>
              <div className="text-xs text-on-surface-variant leading-relaxed">Honest side-by-side comparison.</div>
            </Link>
          </div>
        </section>

        {/* Trust + data sources */}
        <div className="mt-8 p-5 rounded-2xl bg-surface-container-lowest ghost-border text-sm text-on-surface-variant leading-relaxed">
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface mb-2">What we use</div>
          <p>
            Barcode data: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">Open Food Facts</a> + <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">Open Beauty Facts</a> (community-built, CC-BY-SA). E-codes + cosmetic INCI dictionaries are our own curated lists. Drinks lookup is verified against manufacturer statements and Vegan Society / V-Label certifications. Image scans use OpenAI vision and cost real money — we cap free use to keep this sustainable.
          </p>
        </div>

        <div className="mt-4 p-5 rounded-2xl ghost-border text-sm text-on-surface-variant leading-relaxed">
          <p>
            <strong className="text-on-surface">Why supporter-gated?</strong> Image scans cost real money per request. Supporters keep these tools free of ads and tracking. One free scan is on us — after that, <Link href="/support" className="text-primary underline">back PlantsPack</Link> for unlimited use.
          </p>
        </div>

      </div>
    </div>
  )
}

function ToolSection({
  id,
  icon: Icon,
  title,
  subtitle,
  tools,
}: {
  id: string
  icon: typeof Barcode
  title: string
  subtitle: string
  tools: Tool[]
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
      </div>
      <p className="text-sm text-on-surface-variant mb-5 ml-12">{subtitle}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {tools.map((t) => {
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              className="block rounded-2xl ghost-border editorial-shadow p-5 bg-surface-container-lowest hover:shadow-md hover:border-primary/30 transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-on-surface">{t.title}</h3>
                    {t.featured && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    {t.blurb}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Lock className="h-3 w-3" />
                    <span>{t.gate}</span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
