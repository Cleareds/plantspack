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
  // openGraph.images and twitter.images are auto-supplied by Next.js's
  // file-based metadata convention from src/app/opengraph-image.tsx and
  // src/app/twitter-image.tsx. Those generators render the brand SVG +
  // wordmark live, so we don't have to maintain a static og-image.png.
  // Per-page metadata can still override (place / post / recipe pages
  // do, with their own hero photo).
  openGraph: {
    type: 'website',
    siteName: 'PlantsPack',
    title: 'PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide',
    description: '33,000+ vegan restaurants, stores, stays, and sanctuaries across 117 countries. City vegan rankings, 580+ recipes, community reviews. Free, no ads.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@plantspackX',
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
        {/*
          Preconnect to the third-party origins on the critical path so the
          TLS handshake + DNS lookup for fonts, hero images, and place card
          images happens in parallel with the document download. Skip
          tile.openstreetmap.org on purpose — that origin is only needed
          after CityMap lazy-mounts; warming it would defeat the deferral.
        */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://mfeelaqjbtnypoojhfjp.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
        {/*
          Material Symbols Outlined: narrowed from the full variable axis
          range (opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200) to a
          single-weight subset. The full range made Google Fonts ship 7.9MB
          on first paint of the city directory page; this trims it to a
          static subset under 200KB while preserving every icon glyph
          we render across the app.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap"
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
