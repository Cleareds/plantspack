'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, AlertTriangle, MessageCircle } from 'lucide-react'

export default function BetaBanner() {
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if user has dismissed the banner before (localStorage)
  if (typeof window !== 'undefined') {
    const dismissed = localStorage.getItem('beta-banner-dismissed')
    if (dismissed && !isDismissed) {
      return null
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('beta-banner-dismissed', 'true')
    }
  }

  if (isDismissed) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3 flex-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                🚀 PlantsPack is in beta! You may encounter bugs or issues.
              </p>
              <p className="text-xs opacity-90 mt-1 hidden sm:block">
                Help us improve by reporting any problems you find.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              href="/contact"
              className="flex items-center space-x-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Report Issues</span>
              <span className="sm:hidden">Report</span>
            </Link>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              aria-label="Dismiss beta notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}