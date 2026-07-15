import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SubstitutesClient from './SubstitutesClient'

export const metadata: Metadata = {
  title: 'Vegan Substitute Finder | Plants Pack',
  description: 'Search for vegan swaps - milk, butter, cheese, eggs, gelatin, honey, mayo, meat, fish. With notes on what each works best for in cooking and baking.',
  alternates: { canonical: 'https://www.plantspack.com/tools/substitutes' },
}

export default function SubstitutesPage() {
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
          Vegan substitute finder
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Search any ingredient - milk, eggs, cheese, gelatin - and we&apos;ll list the best vegan swaps with notes on what each works for in real cooking.
        </p>

        <SubstitutesClient />

        <div className="mt-10 text-sm text-on-surface-variant leading-relaxed">
          <p>
            <strong className="text-on-surface">Missing something?</strong> Tell us at{' '}
            <Link href="/contact" className="text-primary underline">contact</Link> and we&apos;ll add it.
          </p>
        </div>
      </div>
    </div>
  )
}
