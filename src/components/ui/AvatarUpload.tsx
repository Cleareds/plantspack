'use client'

import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface AvatarUploadProps {
  currentAvatar?: string | null
  onAvatarUpdate: (avatarUrl: string) => void
  className?: string
}

export default function AvatarUpload({ currentAvatar, onAvatarUpdate, className = '' }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const imgRef = useRef<HTMLImageElement>(null)
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateFile(file)) {
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
  }, [])

  const getCroppedImg = useCallback((
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('No 2d context'))
        return
      }

      // Set canvas size to 500x500
      canvas.width = 500
      canvas.height = 500

      // Calculate scaling factors
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // Draw the cropped image scaled to 500x500
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        500,
        500
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.9
      )
    })
  }, [])

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !completedCrop || !user) {
      console.log('Missing required data:', { hasImgRef: !!imgRef.current, hasCompletedCrop: !!completedCrop, hasUser: !!user })
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      console.log('Starting upload process...')

      // Get the cropped image blob
      console.log('Creating cropped image blob...')
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop)
      console.log('Cropped image blob created:', { size: croppedImageBlob.size, type: croppedImageBlob.type })

      // Create a unique filename
      const fileName = `avatar-${user.id}-${Date.now()}.jpg`
      console.log('Uploading file:', fileName)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }
      console.log('Upload successful:', uploadData)

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      console.log('Public URL:', publicUrl)

      // Update the user profile with new avatar URL
      console.log('Updating user profile...')
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }
      console.log('Profile updated successfully')

      // Call the callback to update the UI
      onAvatarUpdate(publicUrl)

      // Close modal and reset state
      setShowCropModal(false)
      setImageSrc(null)
      setCompletedCrop(null)
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      console.log('Upload process completed successfully')

    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(`Failed to upload avatar: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsUploading(false)
    }
  }, [completedCrop, user, onAvatarUpdate, getCroppedImg])

  const handleCancel = () => {
    setShowCropModal(false)
    setImageSrc(null)
    setCompletedCrop(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    
    // Set initial crop to be square and centered
    const size = Math.min(width, height)
    const crop: Crop = {
      unit: 'px',
      width: size,
      height: size,
      x: (width - size) / 2,
      y: (height - size) / 2,
    }
    setCrop(crop)
  }, [])

  return (
    <>
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

      {/* Crop Modal */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Crop Your Avatar</h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                minWidth={100}
                minHeight={100}
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-96 object-contain"
                />
              </ReactCrop>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Drag to adjust the crop area. Your avatar will be resized to 500x500 pixels.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center justify-center space-x-2"
                disabled={isUploading || !completedCrop}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Avatar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}