import { Metadata } from 'next'
import BakingClient from './BakingClient'

export const metadata: Metadata = {
  title: 'Vegan baking substitute calculator | Plants Pack',
  description: 'Convert any baking recipe to vegan. Type in how much butter, egg, milk, buttermilk, cream, honey, gelatin, yogurt or condensed milk your recipe needs - get exact plant-based replacement amounts.',
  alternates: { canonical: 'https://www.plantspack.com/tools/baking' },
}

export const revalidate = 86400

export default function BakingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-8 text-center">
          <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Vegan baking calculator
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Pick the ingredient your recipe calls for, type the amount, and we&apos;ll give you exact plant-based replacement quantities matched to your recipe type.
          </p>
        </div>
        <BakingClient />
      </div>
    </div>
  )
}
