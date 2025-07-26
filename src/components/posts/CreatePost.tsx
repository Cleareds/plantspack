'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, Globe, Users, Send, X } from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'
import ImageSlider from '../ui/ImageSlider'
import LinkPreview, { extractUrls } from './LinkPreview'

interface CreatePostProps {
  onPostCreated: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public')
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])
  const [showLinkPreview, setShowLinkPreview] = useState(true)
  const { user, profile } = useAuth()

  const maxChars = 500

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    if (text.length <= maxChars) {
      setContent(text)
      setCharCount(text.length)
    }
  }

  // Detect URLs in content
  useEffect(() => {
    const urls = extractUrls(content)
    setDetectedUrls(urls)
  }, [content])

  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls)
  }

  const removeAllImages = () => {
    setImageUrls([])
    setShowImageUploader(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!content.trim() && imageUrls.length === 0)) return

    setLoading(true)
    try {
      const postData: any = {
        user_id: user.id,
        content: content.trim(),
        privacy,
      }

      // Only add images field if we have images to avoid database errors
      if (imageUrls.length > 0) {
        postData.images = imageUrls
      }

      const { error } = await supabase.from('posts').insert(postData)

      if (error) throw error

      setContent('')
      setCharCount(0)
      setPrivacy('public')
      setImageUrls([])
      setShowImageUploader(false)
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            {profile?.avatar_url ? (
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={profile.avatar_url}
                  alt={`${profile.first_name || profile.username}'s avatar`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-medium text-sm">
                  {profile?.first_name?.[0] || profile?.username?.[0] || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Share your vegan journey..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />

            {/* Image Preview */}
            {imageUrls.length > 0 && (
              <div className="mt-3 relative">
                <button
                  type="button"
                  onClick={removeAllImages}
                  className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <ImageSlider 
                  images={imageUrls} 
                  aspectRatio="wide"
                  className="max-w-full"
                />
              </div>
            )}

            {/* Image Uploader */}
            {showImageUploader && (
              <div className="mt-3">
                <ImageUploader
                  onImagesChange={handleImagesChange}
                  maxImages={3}
                />
              </div>
            )}

            {/* Link Preview */}
            {detectedUrls.length > 0 && showLinkPreview && (
              <div className="mt-3">
                <LinkPreview
                  url={detectedUrls[0]}
                  onRemove={() => setShowLinkPreview(false)}
                  className="max-w-full"
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowImageUploader(!showImageUploader)}
                  className={`flex items-center space-x-1 hover:text-green-600 transition-colors ${
                    showImageUploader || imageUrls.length > 0 
                      ? 'text-green-600' 
                      : 'text-gray-500'
                  }`}
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm">Photo</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      value="public"
                      checked={privacy === 'public'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Public</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      value="friends"
                      checked={privacy === 'friends'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Friends</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-sm ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                  {charCount}/{maxChars}
                </span>
                <button
                  type="submit"
                  disabled={(!content.trim() && imageUrls.length === 0) || loading || charCount > maxChars}
                  className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}