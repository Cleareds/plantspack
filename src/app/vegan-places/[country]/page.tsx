import type { Metadata } from 'next'
import { buildCountryMetadata, renderCountryPage } from './country-page'

// No searchParams here on purpose - they force dynamic rendering. See
// country-page.tsx / city-page.tsx.
export const revalidate = 43200 // 12h; country composition changes slowly (cost cut 2026-07-10)

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
  return buildCountryMetadata(country, false)
}

export default async function CountryPage({ params }: PageProps) {
  const { country } = await params
  return renderCountryPage(country, false)
}
