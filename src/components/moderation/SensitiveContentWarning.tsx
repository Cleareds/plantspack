'use client'

import { useState } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'

interface SensitiveContentWarningProps {
  children: React.ReactNode
  warnings?: string[]
  type?: 'image' | 'text' | 'full'
  className?: string
}

export default function SensitiveContentWarning({
  children,
  warnings = [],
  type = 'full',
  className = ''
}: SensitiveContentWarningProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (!warnings || warnings.length === 0) {
    return <>{children}</>
  }

  if (isRevealed) {
    return (
      <div className={className}>
        {children}
        <button
          onClick={() => setIsRevealed(false)}
          className="mt-2 inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <EyeOff className="h-4 w-4 mr-1" />
          Hide sensitive content
        </button>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred background */}
      <div className={`${type === 'image' ? 'filter blur-2xl' : 'filter blur-md'} pointer-events-none select-none`}>
        {children}
      </div>

      {/* Warning overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-60 rounded-lg">
        <div className="text-center p-6 max-w-md">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Sensitive Content Warning
          </h3>
          <p className="text-sm text-gray-200 mb-4">
            This content may contain:{' '}
            <span className="font-medium">
              {warnings.join(', ')}
            </span>
          </p>
          <button
            onClick={() => setIsRevealed(true)}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-900 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            Show Content
          </button>
        </div>
      </div>
    </div>
  )
}
