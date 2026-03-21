'use client'

import Link from 'next/link'

export default function GuestWelcome() {
  return (
    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 mb-6 text-center">
      <h2 className="text-2xl font-bold text-on-surface mb-3">
        Welcome to PlantsPack! 🌱
      </h2>
      <p className="text-on-surface-variant mb-6">
          Social Network for Vegans and People Exploring Plant-Based Living<br />
          Connect with people who share your values, discover vegan places, and live your ethical journey.
      </p>
      
      <div className="space-y-3">
        <Link
          href="/auth?mode=signup"
          className="inline-block w-full silk-gradient hover:opacity-90 text-on-primary px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Join PlantsPack - Free Forever
        </Link>
        
        <p className="text-sm text-outline">
          Already have an account?{' '}
          <Link href="/auth?mode=signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      
      <div className="mt-6 pt-6 border-t border-outline-variant/15">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">🍽️</div>
            <p className="text-xs text-on-surface-variant">Share vegan lifestyle</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📍</div>
            <p className="text-xs text-on-surface-variant">Discover vegan places</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🌱</div>
            <p className="text-xs text-on-surface-variant">Connect with community</p>
          </div>
        </div>
      </div>
    </div>
  )
}