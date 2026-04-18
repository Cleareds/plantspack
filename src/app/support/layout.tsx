import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support PlantsPack — Community-Funded, Ad-Free, Forever | PlantsPack',
  description: 'Back a community-funded vegan platform. No investors, no ads — 50% of profit goes to verified animal welfare and plant-based charities. Monthly support from €3.',
  alternates: { canonical: 'https://plantspack.com/support' },
  openGraph: {
    title: 'Support PlantsPack',
    description: 'Help keep PlantsPack free and ad-free. 50% of profit funds verified animal welfare and plant-based charities.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
