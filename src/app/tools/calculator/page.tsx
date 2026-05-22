import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CalculatorClient from './CalculatorClient'

export const metadata: Metadata = {
  title: 'Vegan Impact Calculator | PlantsPack',
  description: 'See how many animals, kilograms of CO2, and litres of water your vegan years have saved. Based on peer-reviewed studies (Poore & Nemecek 2018, Scarborough 2023).',
  alternates: { canonical: 'https://www.plantspack.com/tools/calculator' },
}

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All tools</span>
        </Link>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
          Vegan impact calculator
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Animals not slaughtered, CO2 not emitted, water not used. Based on peer-reviewed research, not the figures most vegan calculators recycle.
        </p>

        <CalculatorClient />
      </div>
    </div>
  )
}
