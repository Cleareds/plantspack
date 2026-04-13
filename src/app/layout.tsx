import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import ClientProviders from "@/components/providers/ClientProviders";
import AppShell from "@/components/layout/AppShell";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PageViewTracker from "@/components/analytics/PageViewTracker";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide",
  description: "16,000+ vegan restaurants, stores, stays, and sanctuaries across 117 countries. City vegan rankings, 580+ recipes, community reviews. Free, no ads.",
  metadataBase: new URL('https://www.plantspack.com'),
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: 'PlantsPack',
    title: 'PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide',
    description: '16,000+ vegan restaurants, stores, stays, and sanctuaries across 117 countries. City vegan rankings, 580+ recipes, community reviews. Free, no ads.',
    locale: 'en_US',
    images: [{ url: 'https://www.plantspack.com/og-image.png', width: 1200, height: 630, alt: 'PlantsPack — Vegan Community Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@plantspackX',
    images: ['https://www.plantspack.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://plantspack.com',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PlantsPack',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={`${jakarta.variable} ${manrope.variable} font-body antialiased bg-surface text-on-surface min-h-screen`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'PlantsPack',
              url: 'https://plantspack.com',
              logo: 'https://plantspack.com/plantspack-logo-real.svg',
              description: 'Community-funded vegan platform with 16,000+ places across 117 countries, city vegan rankings, and 580+ recipes. Free forever, no ads.',
              sameAs: [
                'https://x.com/plantspackX',
                'https://www.instagram.com/plants.pack/',
                'https://www.facebook.com/profile.php?id=61583784658664',
              ],
            }),
          }}
        />
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ClientProviders>
          <AppShell>
            {children}
          </AppShell>
        </ClientProviders>
      </body>
    </html>
  );
}
