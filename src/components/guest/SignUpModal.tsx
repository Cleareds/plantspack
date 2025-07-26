'use client'

import { X } from 'lucide-react'
import Link from 'next/link'

interface SignUpModalProps {
  isOpen: boolean
  onClose: () => void
  action?: 'like' | 'comment' | 'share'
}

export default function SignUpModal({ isOpen, onClose, action = 'like' }: SignUpModalProps) {
  if (!isOpen) return null

  const actionMessages = {
    like: {
      title: 'Like this post?',
      description: 'Join PlantsPack to like posts and connect with the vegan community!'
    },
    comment: {
      title: 'Want to comment?',
      description: 'Join PlantsPack to share your thoughts and engage with fellow plant-based enthusiasts!'
    },
    share: {
      title: 'Want to share this?',
      description: 'Join PlantsPack to share amazing content with your friends!'
    }
  }

  const { title, description } = actionMessages[action]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-600 mb-6">
              {description}
            </p>

            {/* Action buttons */}
            <div className="space-y-3">
              <Link
                href="/auth?mode=signup"
                className="block w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                onClick={onClose}
              >
                Join PlantsPack
              </Link>
              
              <Link
                href="/auth?mode=signin"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                onClick={onClose}
              >
                Already have an account? Sign in
              </Link>
            </div>

            {/* Features highlight */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl mb-1">❤️</div>
                  <p className="text-xs text-gray-600">Like & save posts</p>
                </div>
                <div>
                  <div className="text-xl mb-1">💬</div>
                  <p className="text-xs text-gray-600">Join discussions</p>
                </div>
                <div>
                  <div className="text-xl mb-1">👥</div>
                  <p className="text-xs text-gray-600">Follow friends</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}