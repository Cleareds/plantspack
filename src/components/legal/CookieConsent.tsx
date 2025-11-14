'use client'

import { useState, useEffect } from 'react'
import { X, Cookie, Settings } from 'lucide-react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'plantspack_cookie_consent'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  preferences: boolean
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true
    analytics: false,
    preferences: false
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Delay showing banner slightly for better UX
      setTimeout(() => setShowBanner(true), 1000)
    } else {
      const savedPreferences = JSON.parse(consent)
      setPreferences(savedPreferences)
    }
  }, [])

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
    setPreferences(prefs)
    setShowBanner(false)
    setShowSettings(false)
  }

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      preferences: true
    })
  }

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      preferences: false
    })
  }

  const handleSaveSettings = () => {
    saveConsent(preferences)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-green-500 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Cookie className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cookie Preferences</h3>
              </div>
              <p className="text-sm text-gray-700">
                We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
                You can customize your preferences or accept all cookies.{' '}
                <Link href="/legal/privacy" className="text-green-600 hover:text-green-700 underline">
                  Learn more
                </Link>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Customize</span>
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
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
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Cookie Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
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
                      className="h-4 w-4 text-green-600 rounded border-gray-300"
                    />
                    <h3 className="font-semibold text-gray-900">Necessary Cookies</h3>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Required</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
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
                      className="h-4 w-4 text-green-600 rounded border-gray-300"
                    />
                    <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
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
                      className="h-4 w-4 text-green-600 rounded border-gray-300"
                    />
                    <h3 className="font-semibold text-gray-900">Preference Cookies</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    These cookies remember your preferences and choices (such as language, region, or theme)
                    to provide a more personalized experience.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  For more information about how we use cookies and protect your privacy, please read our{' '}
                  <Link href="/legal/privacy" className="text-green-600 hover:text-green-700 underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
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
