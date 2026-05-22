import { Metadata } from 'next'
import Link from 'next/link'
import { Barcode, ScanLine, UtensilsCrossed, Calculator, Printer, Lock, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Vegan Tools — Barcode, Ingredient & Menu Scanners | PlantsPack',
  description: 'Free vegan tools: barcode scanner, ingredient label checker, menu analyzer, impact calculator, and printable restaurant cards. Built for vegans, supported by the community.',
  alternates: { canonical: 'https://www.plantspack.com/tools' },
}

type Tool = {
  href: string
  title: string
  blurb: string
  icon: typeof Barcode
  status: 'live' | 'soon'
  gate: string
}

const TOOLS: Tool[] = [
  {
    href: '/tools/barcode',
    title: 'Barcode scanner',
    blurb: 'Point your phone camera at any product. We check the ingredients against Open Food Facts and flag anything non-vegan.',
    icon: Barcode,
    status: 'live',
    gate: 'Free, no sign-up',
  },
  {
    href: '/tools/ingredient-scanner',
    title: 'Ingredient label scanner',
    blurb: 'Photo of the ingredient list. We read the label and call out hidden animal-derived items (gelatin, carmine, whey, shellac, and friends).',
    icon: ScanLine,
    status: 'live',
    gate: '1 guest scan · 3/mo signed in · unlimited for supporters',
  },
  {
    href: '/tools/menu-scanner',
    title: 'Menu scanner',
    blurb: 'Photo of a restaurant menu. We highlight vegan dishes, flag the ones to ask about, and suggest swaps. Useful in non-English-speaking countries.',
    icon: UtensilsCrossed,
    status: 'live',
    gate: '1 guest scan · 3/mo signed in · unlimited for supporters',
  },
  {
    href: '/tools/calculator',
    title: 'Vegan impact calculator',
    blurb: 'How many animals, litres of water, and kg of CO2 your vegan years have saved. Shareable card at the end.',
    icon: Calculator,
    status: 'live',
    gate: 'Free, no sign-in',
  },
  {
    href: '/tools/cards',
    title: 'Printable vegan cards',
    blurb: 'Restaurant cards in 20+ languages, ingredient cheat sheets, E-number lists. Print or save to your phone.',
    icon: Printer,
    status: 'live',
    gate: 'Free, no sign-in',
  },
]

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">

        <div className="mb-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tools</span>
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
            Vegan tools that actually help
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto">
            Scanners, calculators, and printable cards. Free to try. Supporter-funded so we don&apos;t need ads or your data.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {TOOLS.map((t) => {
            const Icon = t.icon
            const isLive = t.status === 'live'
            const Wrapper: React.ElementType = isLive ? Link : 'div'
            const wrapperProps = isLive ? { href: t.href } : {}
            return (
              <Wrapper
                key={t.href}
                {...wrapperProps}
                className={`block rounded-2xl ghost-border editorial-shadow p-6 bg-surface-container-lowest transition ${isLive ? 'hover:shadow-md hover:border-primary/30' : 'opacity-75'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-on-surface">{t.title}</h2>
                      {!isLive && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-on-surface/10 text-on-surface-variant">
                          Soon
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
              </Wrapper>
            )
          })}
        </div>

        <div className="mt-10 p-5 rounded-2xl bg-surface-container-lowest ghost-border text-sm text-on-surface-variant leading-relaxed">
          <p>
            <strong className="text-on-surface">Why supporter-gated?</strong> Image scans cost real money per request. Supporters keep these tools free of ads and tracking. One free scan is on us — after that, <Link href="/support" className="text-primary underline">back PlantsPack</Link> for unlimited use.
          </p>
        </div>

      </div>
    </div>
  )
}
