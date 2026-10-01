import type { Metadata } from 'next'
import { buildCountryMetadata, renderCountryPage } from './country-page'

// No searchParams here on purpose - they force dynamic rendering. See
// country-page.tsx / city-page.tsx.
export const revalidate = 43200 // 12h; country composition changes slowly (cost cut 2026-07-10)

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
