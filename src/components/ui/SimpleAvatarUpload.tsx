'use client'

import React, { useState, useRef } from 'react'
import { Upload, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface SimpleAvatarUploadProps {
  currentAvatar?: string | null
  onAvatarUpdate: (avatarUrl: string) => void
  className?: string
}

export default function SimpleAvatarUpload({ currentAvatar, onAvatarUpdate, className = '' }: SimpleAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Clear any previous errors
    setError(null)

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    console.log('🔄 Starting avatar upload...', { fileName: file.name, size: file.size })
    setIsUploading(true)

    try {
      // Create unique filename
      const fileName = `avatar-${user.id}-${Date.now()}.${file.name.split('.').pop()}`
      console.log('📝 Uploading file:', fileName)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: 'public, max-age=2592000, immutable', // 30 days - filenames are unique
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      console.log('✅ File uploaded successfully:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      console.log('📝 Public URL:', publicUrl)

      // Update UI - let parent component handle database update
      onAvatarUpdate(publicUrl)
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('❌ Avatar upload error:', err)
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
        disabled={isUploading}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="relative group avatar-container"
        disabled={isUploading}
        type="button"
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
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-white" />
          )}
        </div>
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-400 rounded text-red-700 text-xs flex items-center space-x-1 max-w-xs">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {isUploading && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-blue-100 border border-blue-400 rounded text-blue-700 text-xs">
          Uploading...
        </div>
      )}
    </div>
  )
}