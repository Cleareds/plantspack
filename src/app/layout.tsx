import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
// NOTE: Leaflet + marker-cluster CSS moved to src/components/map/MapCssBoot.tsx
// so it only ships with map-using routes (/map, /place/[id], /vegan-places/.../...).
// Every other route previously shipped ~60-80 KB gz of unused CSS.
import ClientProviders from "@/components/providers/ClientProviders";
import AppShell from "@/components/layout/AppShell";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import NavigationProgress from "@/components/layout/NavigationProgress";

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

// Next.js 15 moved viewport out of metadata -- it's now its own export.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: "PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide",
  description: "33,000+ vegan restaurants, stores, stays, and sanctuaries across 117 countries. City vegan rankings, 580+ recipes, community reviews. Free, no ads.",
  metadataBase: new URL('https://www.plantspack.com'),
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: 'PlantsPack',
    title: 'PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide',
    description: '33,000+ vegan restaurants, stores, stays, and sanctuaries across 117 countries. City vegan rankings, 580+ recipes, community reviews. Free, no ads.',
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
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${jakarta.variable} ${manrope.variable} font-body antialiased bg-surface text-on-surface min-h-screen`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://plantspack.com/#organization',
                  name: 'PlantsPack',
                  url: 'https://plantspack.com',
                  logo: 'https://plantspack.com/plantspack-logo-real.svg',
                  description: 'Community-funded vegan platform with 33,000+ places across 117 countries, city vegan rankings, and 580+ recipes. Free forever, no ads.',
                  sameAs: [
                    'https://x.com/plantspackX',
                    'https://www.instagram.com/plants.pack/',
                    'https://www.facebook.com/profile.php?id=61583784658664',
                  ],
                },
                // WebSite ties all pages to the brand identity and lets
                // Google build rich site-name + hierarchy in SERPs. We're
                // intentionally NOT including SearchAction — we don't have a
                // dedicated /search results page (yet); adding it would lie
                // to Google and degrade trust. Add later if we build one.
                {
                  '@type': 'WebSite',
                  '@id': 'https://plantspack.com/#website',
                  url: 'https://plantspack.com',
                  name: 'PlantsPack',
                  publisher: { '@id': 'https://plantspack.com/#organization' },
                },
              ],
            }),
          }}
        />
        <GoogleAnalytics />
        <NavigationProgress />
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
