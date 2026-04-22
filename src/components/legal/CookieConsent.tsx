'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, Settings } from 'lucide-react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'plantspack_cookie_consent'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  preferences: boolean
  marketing: boolean
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true
    analytics: false,
    preferences: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Delay showing banner slightly for better UX
      setTimeout(() => setShowBanner(true), 1000)
    } else {
      const savedPreferences = JSON.parse(consent)
      // Default any newly-added categories to false so pre-existing consents
      // aren't silently upgraded when we add new cookie categories.
      setPreferences({
        necessary: true,
        analytics: !!savedPreferences.analytics,
        preferences: !!savedPreferences.preferences,
        marketing: !!savedPreferences.marketing,
      })
    }
  }, [])

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)
    setShowSettings(false)

    // Notify other components (e.g. GoogleAnalytics) about the consent change
    window.dispatchEvent(new Event('cookie-consent-changed'))
  }

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      preferences: true,
      marketing: true,
    })
  }

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      preferences: false,
      marketing: false,
    })
  }

  const handleSaveSettings = () => {
    saveConsent(preferences)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-primary shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Cookie className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-on-surface">Cookie Preferences</h3>
              </div>
              <p className="text-sm text-on-surface-variant">
                We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
                You can customize your preferences or accept all cookies.{' '}
                <Link href="/legal/privacy" className="text-primary hover:text-primary underline">
                  Learn more
                </Link>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center space-x-1 px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Customize</span>
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-md text-sm font-medium transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-surface-container-high p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-on-surface">Cookie Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-outline hover:text-on-surface-variant"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-on-surface-variant mt-2">
                Manage your cookie preferences. You can enable or disable different types of cookies below.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="h-4 w-4 text-primary rounded border-outline-variant"
                    />
                    <h3 className="font-semibold text-on-surface">Necessary Cookies</h3>
                    <span className="text-xs bg-surface-container-high text-on-surface-variant px-2 py-1 rounded">Required</span>
                  </div>
                  <p className="text-sm text-on-surface-variant ml-6">
                    These cookies are essential for the website to function properly. They enable core features
                    like authentication, security, and accessibility. These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="h-4 w-4 text-primary rounded border-outline-variant"
                    />
                    <h3 className="font-semibold text-on-surface">Analytics Cookies</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant ml-6">
                    These cookies help us understand how visitors interact with our website by collecting and
                    reporting information anonymously. This helps us improve the website and user experience.
                  </p>
                </div>
              </div>

              {/* Preference Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={(e) => setPreferences({ ...preferences, preferences: e.target.checked })}
                      className="h-4 w-4 text-primary rounded border-outline-variant"
                    />
                    <h3 className="font-semibold text-on-surface">Preference Cookies</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant ml-6">
                    These cookies remember your preferences and choices (such as language, region, or theme)
                    to provide a more personalized experience.
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="h-4 w-4 text-primary rounded border-outline-variant"
                    />
                    <h3 className="font-semibold text-on-surface">Marketing Cookies</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant ml-6">
                    These cookies help us measure how effective our marketing is — for example, whether
                    newsletter clicks lead to sign-ups or whether ads we run on other sites bring
                    people here. Separate from the newsletter itself, which you opt in to at signup
                    or in your account settings.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-container-high">
                <p className="text-sm text-on-surface-variant mb-4">
                  For more information about how we use cookies and protect your privacy, please read our{' '}
                  <Link href="/legal/privacy" className="text-primary hover:text-primary underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface-container-low border-t border-surface-container-high p-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-md text-sm font-medium transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
