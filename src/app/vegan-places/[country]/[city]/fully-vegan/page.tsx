import type { Metadata } from 'next'
import { buildCityMetadata, renderCityPage } from '../city-page'

// /vegan-places/<country>/<city>/fully-vegan - the same city page filtered to
// vegan_level = fully_vegan. A real route segment (not a rewrite to
// ?level=fully-vegan) so both URLs are statically cacheable.
export const revalidate = 21600

interface PageProps {
  params: Promise<{ country: string; city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params
  return buildCityMetadata(country, city, true)
}

export default async function CityFullyVeganPage({ params }: PageProps) {
  const { country, city } = await params
  return renderCityPage(country, city, true)
}
