'use client'

import React, { useState, useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-simple'

interface AvatarUploadProps {
  currentAvatar?: string | null
  onAvatarUpdate: (avatarUrl: string) => void
  className?: string
}

export default function AvatarUpload({ currentAvatar, onAvatarUpdate, className = '' }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return false
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return false
    }

    return true
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!validateFile(file)) {
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Create a unique filename
      const fileName = `avatar-${user.id}-${Date.now()}.${file.name.split('.').pop()}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update the user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Call the callback to update the UI
      onAvatarUpdate(publicUrl)
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(`Failed to upload avatar: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="relative group"
        disabled={isUploading}
      >
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <Upload className="w-6 h-6 text-white" />
          )}
        </div>
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-400 rounded text-red-700 text-xs flex items-center space-x-1 whitespace-nowrap">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}