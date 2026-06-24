'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MapPin, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Footer from './Footer'
import { safeStorage } from '@/lib/safe-storage'

function useGeolocation() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    // Path A: anonymous visitors get a fully static home with no
    // location-aware content. Asking them to "enable location" is a
    // dark-pattern prompt for a feature they don't get. Only signed-in
    // users see this banner and the subsequent geolocation prompts.
    // `auth-status` is written by the AuthProvider on every state change.
    if (safeStorage.session.get('auth-status') !== 'authenticated') return
    // Use localStorage for persistence across tabs/reloads
    if (safeStorage.local.get('geo_resolved')) return

    function storeLocation(lat: number, lng: number, city?: string, country?: string) {
      safeStorage.local.set('user_lat', String(lat))
      safeStorage.local.set('user_lng', String(lng))
      if (city) safeStorage.local.set('user_city', city)
      if (country) safeStorage.local.set('user_country', country)
      safeStorage.local.set('geo_resolved', '1')
      safeStorage.local.set('geo_timestamp', String(Date.now()))
      // Mirror to cookies so the next SSR hit of / can use them directly.
      // Same-tab localStorage writes don't fire `storage` events, so we have
      // to set the cookies explicitly here.
      import('@/lib/location-cookies').then(({ setGeoLocationCookies }) => {
        setGeoLocationCookies({ lat: String(lat), lng: String(lng), city: city ?? null, country: country ?? null })
      })
      setShowBanner(false)
    }

    function ipFallback() {
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            storeLocation(data.latitude, data.longitude, data.city, data.country_name)
          }
        })
        .catch(() => { safeStorage.local.set('geo_resolved', '1') })
    }

    // Check permission state
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          pos => storeLocation(pos.coords.latitude, pos.coords.longitude),
          () => ipFallback(),
          { timeout: 8000, maximumAge: 300000 }
        )
      } else if (result.state === 'denied') {
        // Already denied — IP fallback silently
        ipFallback()
      } else {
        // 'prompt' — show banner asking user to enable, also do IP fallback immediately
        setShowBanner(true)
        ipFallback()
      }
    }).catch(() => {
      // Permissions API not available — show banner + IP fallback
      setShowBanner(true)
      ipFallback()
    })
  }, [])

  const requestGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        safeStorage.session.set('user_lat', String(pos.coords.latitude))
        safeStorage.session.set('user_lng', String(pos.coords.longitude))
        safeStorage.session.set('geo_resolved', '1')
        setShowBanner(false)
        window.location.reload() // reload to use precise location
      },
      () => setShowBanner(false),
      { timeout: 8000 }
    )
  }

  return { showBanner, setShowBanner, requestGeolocation }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { showBanner, setShowBanner, requestGeolocation } = useGeolocation()

  // Pages that should not show the app shell (admin pages)
  const isAdminPage = pathname?.startsWith('/admin')
  if (isAdminPage) {
    return <>{children}</>
  }

  // Map page needs full-height content (no bottom padding, no footer)
  const isMapPage = pathname === '/map'

  return (
    <>
      {/* Material Symbols font loaded in layout.tsx */}

      {/* Desktop sidebar - always visible on lg+ */}
      <Sidebar />

      {/* Top bar - always visible */}
      <TopBar />

      {/* Location banner */}
      {showBanner && (
        <div className="fixed top-[80px] left-0 right-0 z-30 lg:left-64">
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-on-surface">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Enable location to see vegan places near you and your city&apos;s Vegan Score</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={requestGeolocation}
                className="px-3 py-1 text-xs font-medium text-on-primary-btn silk-gradient rounded-lg hover:opacity-90 transition-colors"
              >
                Enable
              </button>
              <button onClick={() => setShowBanner(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className={`${isMapPage ? 'h-screen overflow-hidden' : 'min-h-screen'} pt-[64px] ${showBanner ? 'pt-[108px]' : ''} lg:ml-64 ${isMapPage ? '' : 'pb-20 lg:pb-0'}`}>
        {children}
      </main>

      {/* Footer - hidden on map page */}
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
