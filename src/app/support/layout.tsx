import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Support PlantsPack — Community-Driven, Ad-Free, Forever | PlantsPack',
  description: 'Back a community-driven vegan platform — no investors, no ads, no paid listings. Supporter contributions keep it free for everyone, from €3/month.',
  alternates: { canonical: 'https://www.plantspack.com/support' },
  openGraph: {
    title: 'Support PlantsPack',
    description: 'Help keep PlantsPack free and ad-free — community-driven, no investors, no paid listings.',
    type: 'website',
    siteName: 'PlantsPack',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
