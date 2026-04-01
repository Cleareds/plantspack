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
  title: "PlantsPack - Community Platform for Vegans and People Exploring Plant-Based Living",
  description: "Discover vegan restaurants, share recipes, and connect with people who share your values. Free forever, community-funded.",
  metadataBase: new URL('https://plantspack.com'),
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
    title: 'PlantsPack - Vegan Community Platform',
    description: 'Discover vegan restaurants, share recipes, and connect with people who share your values.',
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
              description: 'Community-funded vegan platform. Find vegan places, share recipes, connect with the community.',
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
