import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PhotoScanner from '../_components/PhotoScanner'

export const metadata: Metadata = {
  title: 'Vegan Ingredient Label Scanner | Plants Pack',
  description: 'Photograph any product ingredient label and we flag animal-derived ingredients like gelatin, carmine, whey, casein, and shellac.',
  alternates: { canonical: 'https://www.plantspack.com/tools/ingredient-scanner' },
}

export default function IngredientScannerPage() {
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
          Ingredient label scanner
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Photo of the ingredient list - we read the label and flag animal-derived items like gelatin, carmine, whey, casein, shellac, and L-cysteine.
        </p>

        <PhotoScanner
          tool="ingredient"
          examplePrompt="Take a close, well-lit photo of the ingredient list on the back of the package."
        />

        <div className="mt-8 text-sm text-on-surface-variant leading-relaxed">
          <p className="mb-2">
            <strong className="text-on-surface">Free tier:</strong> 1 scan as a guest, 3/month signed in. Supporters get unlimited (up to $1 of AI cost per month).
          </p>
          <p>
            <strong className="text-on-surface">Honesty note:</strong> AI vision is imperfect. When the model isn&apos;t sure, it says so. Always double-check the package for anything you&apos;re unsure about.
          </p>
        </div>
      </div>
    </div>
  )
}
