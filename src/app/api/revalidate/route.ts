import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { city, country, path } = body

    // Revalidate a specific path if provided
    if (path) {
      revalidatePath(path)
      return NextResponse.json({ revalidated: true, path })
    }

    // Always revalidate the main directory
    revalidatePath('/vegan-places')

    // Revalidate specific city/country pages if provided
    if (country) {
      const countrySlug = country.toLowerCase().replace(/\s+/g, '-')
      revalidatePath(`/vegan-places/${countrySlug}`)
      if (city) {
        const citySlug = city.toLowerCase().replace(/\s+/g, '-')
        revalidatePath(`/vegan-places/${countrySlug}/${citySlug}`)
      }
    }

    // Revalidate city ranks (scores change when places are added)
    revalidatePath('/city-ranks')

    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ revalidated: false }, { status: 500 })
  }
}
