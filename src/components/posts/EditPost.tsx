'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Globe, Users, Save, Image as ImageIcon, Video } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getUserSubscription, type UserSubscription } from '@/lib/stripe'
import ImageUploader from '../ui/ImageUploader'
import VideoUploader from '../ui/VideoUploader'
import MentionAutocomplete from './MentionAutocomplete'
import LinkPreview, { extractUrls } from './LinkPreview'
import type { PostCategory, RecipeData, EventData, ProductData } from '@/lib/database.types'

interface EditPostProps {
  post: {
    id: string
    title?: string | null
    content: string
    privacy: 'public' | 'friends'
    post_type?: 'original' | 'share' | 'quote'
    quote_content?: string | null
    category?: PostCategory
    secondary_tags?: string[] | null
    recipe_data?: any
    event_data?: any
    product_data?: any
    image_urls?: string[] | null
    images?: string[] | null
    video_urls?: string[] | null
  }
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function EditPost({ post, isOpen, onClose, onSaved }: EditPostProps) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)

  const isQuotePost = post.post_type === 'quote'
  const isSharePost = post.post_type === 'share'
  const initialContent = isQuotePost && post.quote_content ? post.quote_content : post.content

  const maxChars = -1

  const [title, setTitle] = useState(post.title || '')
  const [content, setContent] = useState(initialContent)
  const [privacy, setPrivacy] = useState<'public' | 'friends'>(post.privacy)
  const [category, setCategory] = useState<PostCategory>(post.category || 'general')
  const [secondaryTags, setSecondaryTags] = useState<string[]>(post.secondary_tags || [])
  const [tagInput, setTagInput] = useState('')
  const [recipeData, setRecipeData] = useState<Partial<RecipeData>>(post.recipe_data || {})
  const [eventData, setEventData] = useState<Partial<EventData>>(post.event_data || {})
  const [productData, setProductData] = useState<Partial<ProductData>>(post.product_data || {})
  const [imageUrls, setImageUrls] = useState<string[]>(post.image_urls || post.images || [])
  const [videoUrls, setVideoUrls] = useState<string[]>(post.video_urls || [])
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [showVideoUploader, setShowVideoUploader] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(initialContent.length)
  const [detectedUrls, setDetectedUrls] = useState<string[]>(extractUrls(initialContent))
  const [showLinkPreview, setShowLinkPreview] = useState(true)

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (user) {
      getUserSubscription(user.id).then(setSubscription)
    }
  }, [user])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  if (isSharePost) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow w-full max-w-md p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-on-surface text-lg">Cannot Edit</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors">
              <X className="h-5 w-5 text-on-surface-variant" />
            </button>
          </div>
          <p className="text-on-surface-variant mb-4">
            Shared posts cannot be edited. You can only delete them or view the original post.
          </p>
          <button
            onClick={onClose}
            className="w-full silk-gradient text-on-primary-btn px-4 py-2.5 rounded-xl font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setCharCount(newContent.length)
    setDetectedUrls(extractUrls(newContent))

    // Mention detection
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newContent.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setMentionStartPos(cursorPos - mentionMatch[0].length)
      setShowMentionAutocomplete(true)

      // Calculate cursor position for autocomplete popup
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        setCursorPosition({
          top: rect.bottom + 4,
          left: rect.left + 16
        })
      }
    } else {
      setShowMentionAutocomplete(false)
    }
  }

  const handleMentionSelect = (username: string) => {
    const before = content.substring(0, mentionStartPos)
    const after = content.substring(textareaRef.current?.selectionStart || content.length)
    const newContent = `${before}@${username} ${after}`
    setContent(newContent)
    setCharCount(newContent.length)
    setShowMentionAutocomplete(false)

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionStartPos + username.length + 2
        textareaRef.current.selectionStart = newPos
        textareaRef.current.selectionEnd = newPos
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls)
  }

  const handleVideosChange = (urls: string[]) => {
    setVideoUrls(urls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) {
      setError('Content cannot be empty')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, any> = { privacy }

      if (isQuotePost) {
        body.quote_content = content.trim()
      } else {
        body.content = content.trim()
        body.title = title.trim() || null
        body.category = category
        body.secondary_tags = secondaryTags
        body.image_urls = imageUrls
        body.video_urls = videoUrls

        if (category === 'recipe' && recipeData.ingredients?.length) {
          body.recipe_data = recipeData
        } else if (category === 'recipe') {
          body.recipe_data = null
        }

        if (category === 'event' && eventData.start_time) {
          body.event_data = eventData
        } else if (category === 'event') {
          body.event_data = null
        }

        if (category === 'product' && productData.brand) {
          body.product_data = productData
        } else if (category === 'product') {
          body.product_data = null
        }
      }

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update post')
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 z-10">
          <h2 className="font-headline font-bold text-on-surface text-lg tracking-tight">
            {isQuotePost ? 'Edit Your Quote' : 'Edit Post'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-xl transition-colors">
            <X className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Info message for quote posts */}
            {isQuotePost && (
              <div className="mb-4 p-3 bg-surface-container-low ghost-border rounded-lg">
                <p className="text-sm text-on-surface-variant">
                  You&apos;re editing your commentary on the quoted post. The original post content cannot be changed.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Title */}
            {!isQuotePost && (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                maxLength={200}
                className="w-full px-3 py-2 mb-3 bg-surface-container-low border-0 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border placeholder:text-outline"
              />
            )}

            {/* Content */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder={isQuotePost ? "What do you think about this post?" : "Share your vegan journey..."}
                className="w-full p-3 bg-surface-container-low border-0 rounded-lg resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border"
                rows={4}
              />

              {/* Mention Autocomplete */}
              {showMentionAutocomplete && (
                <MentionAutocomplete
                  searchQuery={mentionQuery}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionAutocomplete(false)}
                  cursorPosition={cursorPosition}
                />
              )}
            </div>

            {/* Category Selector (not for quote posts) */}
            {!isQuotePost && (
              <>
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { slug: 'general', icon: 'article', label: 'General' },
                      { slug: 'recipe', icon: 'restaurant_menu', label: 'Recipe' },
                      { slug: 'place', icon: 'location_on', label: 'Place' },
                      { slug: 'event', icon: 'event', label: 'Event' },
                      { slug: 'lifestyle', icon: 'self_improvement', label: 'Lifestyle' },
                      { slug: 'activism', icon: 'campaign', label: 'Activism' },
                      { slug: 'question', icon: 'help', label: 'Question' },
                      { slug: 'product', icon: 'shopping_bag', label: 'Product' },
                      { slug: 'hotel', icon: 'hotel', label: 'Hotel' },
                      { slug: 'organisation', icon: 'corporate_fare', label: 'Organisation' },
                    ].map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setCategory(cat.slug as PostCategory)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          category === cat.slug
                            ? 'bg-primary text-on-primary-btn'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontSize: '14px' }}>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secondary Tags */}
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {secondaryTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 bg-secondary-container text-on-surface text-xs px-2 py-0.5 rounded-full">
                        {tag}
                        <button type="button" onClick={() => setSecondaryTags(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-error">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {secondaryTags.length < 3 && (
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagInput.trim()) {
                            e.preventDefault()
                            if (secondaryTags.length < 3) {
                              setSecondaryTags(prev => [...prev, tagInput.trim()])
                              setTagInput('')
                            }
                          }
                        }}
                        placeholder={secondaryTags.length === 0 ? "Add tags (e.g. Rome, Budget)..." : "Add tag..."}
                        className="text-xs bg-transparent border-none outline-none text-on-surface-variant placeholder:text-outline min-w-[100px] flex-1 py-0.5"
                      />
                    )}
                  </div>
                </div>

                {/* Category-Specific Fields */}
                {category === 'recipe' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Recipe Details</p>
                    <textarea
                      value={recipeData.ingredients?.join('\n') || ''}
                      onChange={(e) => setRecipeData(prev => ({ ...prev, ingredients: e.target.value.split('\n').filter(Boolean) }))}
                      placeholder="Ingredients (one per line)"
                      className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <input type="number" placeholder="Prep (min)" value={recipeData.prep_time_min || ''} onChange={(e) => setRecipeData(prev => ({ ...prev, prep_time_min: Number(e.target.value) }))} className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                      <input type="number" placeholder="Cook (min)" value={recipeData.cook_time_min || ''} onChange={(e) => setRecipeData(prev => ({ ...prev, cook_time_min: Number(e.target.value) }))} className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                      <input type="number" placeholder="Servings" value={recipeData.servings || ''} onChange={(e) => setRecipeData(prev => ({ ...prev, servings: Number(e.target.value) }))} className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                    </div>
                    <select value={recipeData.difficulty || ''} onChange={(e) => setRecipeData(prev => ({ ...prev, difficulty: e.target.value as RecipeData['difficulty'] }))} className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none">
                      <option value="">Difficulty...</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                )}

                {category === 'event' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Event Details</p>
                    <div className="flex gap-2">
                      <input type="datetime-local" value={eventData.start_time || ''} onChange={(e) => setEventData(prev => ({ ...prev, start_time: e.target.value }))} className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                      <input type="datetime-local" value={eventData.end_time || ''} onChange={(e) => setEventData(prev => ({ ...prev, end_time: e.target.value }))} placeholder="End time" className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                    </div>
                    <input type="text" value={eventData.location || ''} onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))} placeholder="Event location" className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                    <input type="url" value={eventData.ticket_url || ''} onChange={(e) => setEventData(prev => ({ ...prev, ticket_url: e.target.value }))} placeholder="Ticket URL (optional)" className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                  </div>
                )}

                {category === 'product' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Product Details</p>
                    <input type="text" value={productData.brand || ''} onChange={(e) => setProductData(prev => ({ ...prev, brand: e.target.value }))} placeholder="Brand name" className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                    <div className="flex gap-2">
                      <input type="text" value={productData.price_range || ''} onChange={(e) => setProductData(prev => ({ ...prev, price_range: e.target.value }))} placeholder="Price range (e.g. $5-10)" className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                      <input type="text" value={productData.where_to_buy || ''} onChange={(e) => setProductData(prev => ({ ...prev, where_to_buy: e.target.value }))} placeholder="Where to buy" className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none" />
                    </div>
                  </div>
                )}

                {category === 'place' && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-lg">
                    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Place Details</p>
                    <p className="text-xs text-on-surface-variant">Place details can be edited from the map page.</p>
                  </div>
                )}

                {/* Existing Images Preview */}
                {imageUrls.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {imageUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Uploader */}
                {showImageUploader && (
                  <div className="mt-3">
                    <ImageUploader
                      onImagesChange={handleImagesChange}
                      maxImages={-1}
                    />
                  </div>
                )}

                {/* Video Uploader */}
                {showVideoUploader && (
                  <div className="mt-3">
                    <VideoUploader
                      onVideosChange={handleVideosChange}
                      subscription={subscription}
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

                {/* Media Buttons */}
                <div className="flex items-center space-x-4 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowImageUploader(!showImageUploader)}
                    className={`flex items-center space-x-1 hover:text-primary transition-colors ${
                      showImageUploader || imageUrls.length > 0 ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-sm">Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVideoUploader(!showVideoUploader)}
                    className={`flex items-center space-x-1 hover:text-purple-600 transition-colors ${
                      showVideoUploader || videoUrls.length > 0 ? 'text-purple-600' : 'text-outline'
                    }`}
                  >
                    <Video className="h-5 w-5" />
                    <span className="text-sm">Video</span>
                  </button>
                </div>
              </>
            )}

            {/* Privacy */}
            <div className="flex items-center space-x-2 mt-3">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                  className="text-primary focus:ring-primary"
                />
                <Globe className="h-4 w-4 text-outline" />
                <span className="text-sm text-on-surface-variant">Public</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  value="friends"
                  checked={privacy === 'friends'}
                  onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                  className="text-primary focus:ring-primary"
                />
                <Users className="h-4 w-4 text-outline" />
                <span className="text-sm text-on-surface-variant">Friends</span>
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mt-4">
              <span className={`text-sm ${maxChars !== -1 && charCount > maxChars * 0.9 ? 'text-red-500' : 'text-outline'}`}>
                {charCount}{maxChars === -1 ? '' : `/${maxChars}`}
              </span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-xl font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) ||
                    loading ||
                    (maxChars !== -1 && charCount > maxChars)
                  }
                  className="flex items-center gap-2 silk-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary-btn px-5 py-2.5 rounded-xl font-medium transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
