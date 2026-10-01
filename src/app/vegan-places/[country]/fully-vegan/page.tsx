import type { Metadata } from 'next'
import { buildCountryMetadata, renderCountryPage } from '../country-page'

// /vegan-places/<country>/fully-vegan - the country page filtered to
// vegan_level = fully_vegan, as a real route segment so it is cacheable.
export const revalidate = 43200

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
