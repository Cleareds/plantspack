'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import CreatePost from './CreatePost'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 z-10">
          <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">
            Create Post
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-low rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <CreatePost onPostCreated={() => {
            onPostCreated()
            onClose()
          }} />
        </div>
      </div>
    </div>
  )
}
