import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BarcodeClient from './BarcodeClient'

export const metadata: Metadata = {
  title: 'Vegan Barcode Scanner - Free | PlantsPack',
  description: 'Scan any product barcode with your phone camera to check if it is vegan. Powered by Open Food Facts. Free, no sign-up.',
  alternates: { canonical: 'https://www.plantspack.com/tools/barcode' },
}

export default function BarcodeToolPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto px-4 py-10 md:py-14">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All tools</span>
        </Link>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
          Vegan barcode scanner
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Point your phone camera at a product barcode. We check Open Food Facts (3M+ products) and tell you if it&apos;s vegan.
        </p>

        <BarcodeClient />

        <div className="mt-8 text-sm text-on-surface-variant leading-relaxed">
          <p className="mb-2">
            <strong className="text-on-surface">How it works.</strong> Open Food Facts is a free, open product database (think Wikipedia for food). For products with full ingredient lists they pre-compute a vegan verdict; for the rest we scan the ingredient text for common animal-derived terms (gelatin, whey, carmine, shellac, and ~30 others).
          </p>
          <p>
            <strong className="text-on-surface">Limits.</strong> Coverage is best in Europe and weakest for store-brand items. When we&apos;re not sure, we say so - we don&apos;t guess.
          </p>
        </div>
      </div>
    </div>
  )
}
