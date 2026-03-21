'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Footer from './Footer'
import BetaBanner from './BetaBanner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [bannerVisible, setBannerVisible] = useState(false)

  const handleBannerVisibility = useCallback((visible: boolean) => {
    setBannerVisible(visible)
  }, [])

  // Pages that should not show the app shell (admin pages)
  const isAdminPage = pathname?.startsWith('/admin')
  if (isAdminPage) {
    return <>{children}</>
  }

  // Map page needs full-bleed content (no padding, sidebar overlays)
  const isMapPage = pathname === '/map'

  return (
    <>
      {/* Material Symbols font for sidebar/bottom nav icons */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <BetaBanner onVisibilityChange={handleBannerVisibility} />

      {/* Desktop sidebar - always visible on lg+ */}
      <Sidebar />

      {/* Top bar */}
      <TopBar bannerOffset={bannerVisible} />

      {/* Main content area */}
      <main className={`min-h-screen ${bannerVisible ? 'pt-24' : 'pt-16'} ${isMapPage ? 'lg:ml-64' : 'lg:ml-64'} ${!isMapPage ? 'pb-24 lg:pb-0' : ''}`}>
        {children}
      </main>

      {/* Footer - hidden on map page, shown in content flow on desktop */}
      {!isMapPage && (
        <div className="lg:ml-64 hidden lg:block">
          <Footer />
        </div>
      )}

      {/* Bottom nav - mobile only */}
      <BottomNav />
    </>
  )
}
