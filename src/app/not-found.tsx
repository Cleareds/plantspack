import Link from 'next/link'
import { Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-low ghost-border rounded-full editorial-shadow mb-6">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-on-surface mb-2">Page Not Found</h1>
        <p className="text-on-surface-variant mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 silk-gradient text-on-primary rounded-md hover:opacity-90 font-medium transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-6 py-3 bg-surface-container-low text-on-surface-variant ghost-border rounded-md hover:bg-surface-container-low font-medium transition-colors"
          >
            Places
          </Link>
          <Link
            href="/recipes"
            className="inline-flex items-center justify-center px-6 py-3 bg-surface-container-low text-on-surface-variant ghost-border rounded-md hover:bg-surface-container-low font-medium transition-colors"
          >
            Recipes
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-6 py-3 bg-surface-container-low text-on-surface-variant ghost-border rounded-md hover:bg-surface-container-low font-medium transition-colors"
          >
            Map
          </Link>
        </div>
      </div>
    </div>
  )
}
