'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function BetaBanner() {
  const [isDismissed, setIsDismissed] = useState(true) // default hidden to avoid hydration flash

  useEffect(() => {
    const dismissed = localStorage.getItem('beta-banner-dismissed')
    if (!dismissed) {
      setIsDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('beta-banner-dismissed', 'true')
  }

  if (isDismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-8 bg-secondary-container text-on-secondary flex items-center justify-center px-4">
      <p className="text-xs font-medium">
        PlantsPack is in beta — report bugs via{' '}
        <Link href="/contact" className="underline hover:opacity-80">Contact</Link>
      </p>
      <button
        onClick={handleDismiss}
        className="absolute right-3 p-0.5 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Dismiss beta notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
