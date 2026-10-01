import type { Metadata } from 'next'
import { buildCityMetadata, renderCityPage } from './city-page'

// SEO: city pages must be cacheable so Google spends crawl budget on them.
// Mutation paths (place add/edit/delete) call revalidatePath() so new places
// appear immediately. No searchParams here on purpose - see city-page.tsx.
export const revalidate = 21600 // 6h; place mutations revalidatePath on-demand (cost cut 2026-07-10)

// ISR actually requires this. A dynamic segment WITHOUT generateStaticParams is
// rendered on every request and `revalidate` is ignored - the build table lists
// it as "ƒ (Dynamic)" and responses carry `cache-control: no-store`
// (verified on deployment e2939b4, 2026-10-01: still x-vercel-cache: MISS after
// the searchParams removal). Returning [] prerenders nothing at build time and
// lets every path be generated on first request, then cached for `revalidate`
// seconds - the same pattern as /place/[id].
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ country: string; city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  return buildCityMetadata(country, city, false)
}

export default async function CityPage({ params }: PageProps) {
  const { country, city } = await params
  return renderCityPage(country, city, false)
}
