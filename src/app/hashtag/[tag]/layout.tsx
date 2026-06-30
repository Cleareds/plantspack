import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  return {
    title: `#${decodedTag} - PlantsPack`,
    description: `Browse posts tagged with #${decodedTag} on PlantsPack, the vegan community platform.`,
    openGraph: {
      title: `#${decodedTag} - PlantsPack`,
      description: `Browse posts tagged with #${decodedTag} on PlantsPack.`,
      type: 'website',
      siteName: 'PlantsPack',
      images: OG_DEFAULT_IMAGES,
    },
  }
}

export default function HashtagLayout({ children }: { children: React.ReactNode }) {
  return children
}
