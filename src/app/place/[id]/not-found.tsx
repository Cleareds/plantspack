import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default function PlaceNotFound() {
  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-low rounded-full mb-6">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Place Not Found</h1>
        <p className="text-on-surface-variant mb-8">
          The place you're looking for doesn't exist or has been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-6 py-3 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors"
          >
            Browse Places
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-surface-container-low text-on-surface-variant rounded-md hover:bg-surface-container-low font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
