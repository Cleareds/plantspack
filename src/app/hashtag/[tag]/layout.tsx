import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  return {
    title: `#${decodedTag} - Plants Pack`,
    description: `Browse posts tagged with #${decodedTag} on Plants Pack, the vegan community platform.`,
    openGraph: {
      title: `#${decodedTag} - Plants Pack`,
      description: `Browse posts tagged with #${decodedTag} on Plants Pack.`,
      type: 'website',
      siteName: 'Plants Pack',
      images: OG_DEFAULT_IMAGES,
    },
  }
}

export default function HashtagLayout({ children }: { children: React.ReactNode }) {
  return children
}
