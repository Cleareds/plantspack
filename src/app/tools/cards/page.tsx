import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CardsClient from './CardsClient'

export const metadata: Metadata = {
  title: 'Printable Vegan Restaurant Cards & Cheat Sheets | Plants Pack',
  description: 'Free printable vegan restaurant cards in 20+ languages, E-number guide, and hidden non-vegan ingredient lists. Print or save to your phone.',
  alternates: { canonical: 'https://www.plantspack.com/tools/cards' },
}

export default function CardsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14 print:p-0 print:max-w-none">
        <div className="print:hidden">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span>All tools</span>
          </Link>

          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Printable vegan cards
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
            Restaurant cards in 20+ languages, E-number guide, and a hidden-ingredient cheat sheet. Print them or save as PDF to your phone for travel.
          </p>
        </div>

        <CardsClient />
      </div>
    </div>
  )
}
