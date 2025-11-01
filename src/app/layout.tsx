import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/lib/auth";
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
  icons: {
    icon: [
      { url: '/plantspack.png' },
      { url: '/plantspack.png', sizes: '192x192', type: 'image/png' },
      { url: '/plantspack.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/plantspack.png' },
      { url: '/plantspack.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/plantspack.png',
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
        <AuthProvider>
          <Header />
          <BetaBanner />
          <main className="min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
