'use client'

import Link from 'next/link'

export default function GuestWelcome() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Welcome to PlantsPack! 🌱
      </h2>
      <p className="text-gray-600 mb-6">
        Connect with fellow plant-based enthusiasts, share your green journey, add, review and discover amazing vegan and pet-friendly places and events around the world.
      </p>
      
      <div className="space-y-3">
        <Link
          href="/auth?mode=signup"
          className="inline-block w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Join PlantsPack - Free Forever
        </Link>
        
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth?mode=signin" className="text-green-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">🍽️</div>
            <p className="text-xs text-gray-600">Share vegan lifestyle</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📍</div>
            <p className="text-xs text-gray-600">Discover vegan places</p>
          </div>
          <div>
            <div className="text-2xl mb-1">🌱</div>
            <p className="text-xs text-gray-600">Connect with community</p>
          </div>
        </div>
      </div>
    </div>
  )
}