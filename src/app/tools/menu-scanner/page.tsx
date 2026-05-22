import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PhotoScanner from '../_components/PhotoScanner'

export const metadata: Metadata = {
  title: 'Vegan Menu Scanner | PlantsPack',
  description: 'Photograph a restaurant menu in any language and we highlight vegan dishes, flag ones to ask about, and suggest swaps.',
  alternates: { canonical: 'https://www.plantspack.com/tools/menu-scanner' },
}

export default function MenuScannerPage() {
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
          Menu scanner
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Photo of a restaurant menu - any language. We highlight the vegan dishes, flag the ones worth asking about, and note where small swaps could work.
        </p>

        <PhotoScanner
          tool="menu"
          examplePrompt="Take a photo of the printed or chalkboard menu. Closer is better - one section at a time works well for big menus."
        />

        <div className="mt-8 text-sm text-on-surface-variant leading-relaxed">
          <p className="mb-2">
            <strong className="text-on-surface">Free tier:</strong> 1 scan as a guest, 3/month signed in. Supporters get unlimited (up to $1 of AI cost per month).
          </p>
          <p>
            <strong className="text-on-surface">Always confirm with the server.</strong> Hidden ingredients (fish sauce in Thai curries, butter on grilled veg, dairy in &quot;veggie&quot; broths) are common. The scanner flags what to ask about, but the conversation closes the deal.
          </p>
        </div>
      </div>
    </div>
  )
}
