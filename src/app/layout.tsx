import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ClientProviders from "@/components/providers/ClientProviders";
import ConditionalHeader from "@/components/layout/ConditionalHeader";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PageViewTracker from "@/components/analytics/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PlantsPack - Social Network for Plant-Based Living",
  description: "Connect with fellow plant-based enthusiasts, discover vegan places, and share your green journey",
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
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
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ClientProviders>
          <ConditionalHeader />
          <main className="min-h-screen">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
