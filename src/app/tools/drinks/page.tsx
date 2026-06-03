import { Metadata } from 'next'
import DrinksClient from './DrinksClient'

export const metadata: Metadata = {
  title: 'Is this drink vegan? Beer, wine, spirits lookup | PlantsPack',
  description: 'Look up whether a beer, wine, spirit, liqueur or cider is vegan. Curated list of mainstream brands with publicly-confirmed vegan status.',
  alternates: { canonical: 'https://www.plantspack.com/tools/drinks' },
}

export const revalidate = 86400

export default function DrinksPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-8 text-center">
          <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Is this drink vegan?
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Beer, wine, spirits, liqueurs and ciders sometimes use animal-derived fining agents (isinglass, gelatine, egg white, casein) that don&apos;t appear on the label. Type a brand to check.
          </p>
        </div>
        <DrinksClient />
      </div>
    </div>
  )
}
