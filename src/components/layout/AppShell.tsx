'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Footer from './Footer'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Request geolocation on first visit (any page)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    // Only request once per session
    const asked = sessionStorage.getItem('geo_asked')
    if (asked) return
    sessionStorage.setItem('geo_asked', '1')

    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'prompt') {
        // Trigger the permission dialog by requesting position
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Store in sessionStorage for homepage and other components
            sessionStorage.setItem('user_lat', String(pos.coords.latitude))
            sessionStorage.setItem('user_lng', String(pos.coords.longitude))
          },
          () => {
            // Permission denied — try IP-based fallback
            fetch('https://ipapi.co/json/')
              .then(r => r.json())
              .then(data => {
                if (data.latitude && data.longitude) {
                  sessionStorage.setItem('user_lat', String(data.latitude))
                  sessionStorage.setItem('user_lng', String(data.longitude))
                  sessionStorage.setItem('user_city', data.city || '')
                  sessionStorage.setItem('user_country', data.country_name || '')
                }
              })
              .catch(() => {})
          },
          { timeout: 8000, maximumAge: 300000 }
        )
      } else if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sessionStorage.setItem('user_lat', String(pos.coords.latitude))
            sessionStorage.setItem('user_lng', String(pos.coords.longitude))
          },
          () => {},
          { timeout: 8000, maximumAge: 300000 }
        )
      } else {
        // Denied — use IP fallback silently
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(data => {
            if (data.latitude && data.longitude) {
              sessionStorage.setItem('user_lat', String(data.latitude))
              sessionStorage.setItem('user_lng', String(data.longitude))
              sessionStorage.setItem('user_city', data.city || '')
              sessionStorage.setItem('user_country', data.country_name || '')
            }
          })
          .catch(() => {})
      }
    }).catch(() => {
      // permissions API not available — just try geolocation directly
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sessionStorage.setItem('user_lat', String(pos.coords.latitude))
          sessionStorage.setItem('user_lng', String(pos.coords.longitude))
        },
        () => {},
        { timeout: 8000, maximumAge: 300000 }
      )
    })
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

      {/* Desktop sidebar - always visible on lg+ */}
      <Sidebar />

      {/* Top bar - hidden on desktop for map page (map has its own controls) */}
      <div className={isMapPage ? 'lg:hidden' : ''}>
        <TopBar />
      </div>

      {/* Main content area */}
      <main className={`min-h-screen pt-[80px] ${isMapPage ? 'sm:pt-16 lg:ml-64 lg:pt-0' : 'lg:ml-64'} ${!isMapPage ? 'pb-24 lg:pb-0' : ''}`}>
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
