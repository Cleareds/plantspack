'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface ImageUploaderProps {
  onImagesChange: (urls: string[]) => void
  maxImages?: number
  className?: string
}

export default function ImageUploader({ 
  onImagesChange, 
  maxImages = 3, 
  className = '' 
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const compressImage = useCallback((file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  const validateFile = (file: File, existingImages: ImageFile[]): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSizePerFile = 5 * 1024 * 1024 // 5MB per file
    const maxTotalSize = 10 * 1024 * 1024 // 10MB total

    if (!validTypes.includes(file.type)) {
      alert('Please upload only JPEG, PNG, or WebP images.')
      return false
    }

    if (file.size > maxSizePerFile) {
      alert('Each image must be smaller than 5MB.')
      return false
    }

    // Check total size including existing images
    const existingTotalSize = existingImages.reduce((total, img) => total + img.file.size, 0)
    if (existingTotalSize + file.size > maxTotalSize) {
      alert('Total size of all images cannot exceed 10MB.')
      return false
    }

    return true
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (!user) {
      console.error('No user logged in for image upload')
      return
    }

    console.log('Handling files:', files.length, 'files')
    const validFiles: File[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log('Validating file:', file.name, 'size:', file.size, 'type:', file.type)
      
      if (validateFile(file, images) && images.length + validFiles.length < maxImages) {
        validFiles.push(file)
        console.log('File validated successfully:', file.name)
      } else {
        console.log('File validation failed or too many images:', file.name)
      }
    }

    if (validFiles.length === 0) {
      console.log('No valid files to process')
      return
    }

    const newImages: ImageFile[] = []
    for (const file of validFiles) {
      const compressedFile = await compressImage(file)
      const preview = URL.createObjectURL(compressedFile)
      newImages.push({
        file: compressedFile,
        preview,
        id: Math.random().toString(36).substr(2, 9)
      })
    }

    console.log('Adding images to state:', newImages.length)
    setImages(prev => [...prev, ...newImages])
    
    // Upload images immediately
    console.log('Uploading images immediately')
    const uploadedUrls = await uploadImages(newImages)
    console.log('Upload completed, URLs:', uploadedUrls)
  }, [user, images.length, maxImages, compressImage])

  const uploadImages = useCallback(async (imagesToUpload?: ImageFile[]) => {
    const targetImages = imagesToUpload || images
    console.log('Upload images called with:', targetImages.length, 'images')
    
    if (!user) {
      console.error('No user for upload')
      return []
    }
    
    if (targetImages.length === 0) {
      console.log('No images to upload')
      return []
    }

    setUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (const imageFile of targetImages) {
        console.log('Uploading:', imageFile.file.name, 'size:', imageFile.file.size)
        const fileExt = imageFile.file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        console.log('Storage path:', fileName)
        const { data, error } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Storage upload error:', error)
          throw error
        }

        console.log('Upload success, path:', data.path)
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(data.path)

        console.log('Public URL generated:', publicUrl)
        uploadedUrls.push(publicUrl)
      }

      console.log('All uploads complete:', uploadedUrls)
      onImagesChange(uploadedUrls)
      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images. Please try again.')
      return []
    } finally {
      setUploading(false)
    }
  }, [user, onImagesChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id)
      const removedImage = prev.find(img => img.id === id)
      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview)
      }
      return updated
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(image => {
        if (image.preview) {
          URL.revokeObjectURL(image.preview)
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Images are uploaded immediately in handleFiles, no need for auto-upload effect

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
          }`}
        >
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Drop images here or click to select
          </p>
          <p className="text-xs text-gray-400">
            {images.length}/{maxImages} images • JPEG, PNG, WebP up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.preview}
                alt="Upload preview"
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Upload className="h-4 w-4 animate-pulse" />
          <span>Uploading images...</span>
        </div>
      )}
    </div>
  )
}