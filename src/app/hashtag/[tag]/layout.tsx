import type { Metadata } from 'next'

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
    },
  }
}

export default function HashtagLayout({ children }: { children: React.ReactNode }) {
  return children
}
