import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ClientProviders from "@/components/providers/ClientProviders";
import Header from "@/components/layout/Header";
import BetaBanner from "@/components/layout/BetaBanner";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "PlantsPack - Social Network for Plant-Based Living",
  description: "Connect with fellow plant-based enthusiasts, discover vegan places, and share your green journey",
  manifest: '/manifest.json',
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
        <ClientProviders>
          <Header />
          <BetaBanner />
          <main className="min-h-screen">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
