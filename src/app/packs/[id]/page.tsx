import { Metadata } from 'next'
import { Suspense } from 'react'
import PackDetailClient from './PackDetailClient'

async function fetchPackData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/packs/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.pack || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const pack = await fetchPackData(id)

  if (!pack) {
    return { title: 'Pack Not Found — PlantsPack' }
  }

  const title = pack.title
  const description = pack.description
    ? pack.description.slice(0, 160)
    : `Explore ${title} — a curated vegan pack on PlantsPack`

  return {
    title: `${title} — PlantsPack`,
    description,
    alternates: { canonical: `https://plantspack.com/packs/${id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'PlantsPack',
      ...(pack.banner_url ? { images: [pack.banner_url] } : {}),
    },
  }
}

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-on-surface-variant">Loading pack...</p>
        </div>
      </div>
    }>
      <PackDetailClient id={id} />
    </Suspense>
  )
}
