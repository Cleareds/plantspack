import type { Metadata } from 'next'
import { buildCountryMetadata, renderCountryPage } from '../country-page'

// /vegan-places/<country>/fully-vegan - the country page filtered to
// vegan_level = fully_vegan, as a real route segment so it is cacheable.
export const revalidate = 43200

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
  params: Promise<{ country: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params
  return buildCountryMetadata(country, true)
}

export default async function CountryFullyVeganPage({ params }: PageProps) {
  const { country } = await params
  return renderCountryPage(country, true)
}
