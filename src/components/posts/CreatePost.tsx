'use client'

import {useState, useEffect, useCallback, useRef} from 'react'
import {useAuth} from '@/lib/auth'
import {supabase} from '@/lib/supabase'
import {Image as ImageIcon, Globe, Users, Send, X, MapPin, Video} from 'lucide-react'
import ImageUploader from '../ui/ImageUploader'
import VideoUploader from '../ui/VideoUploader'
import LinkPreview, {extractUrls} from './LinkPreview'
import MentionAutocomplete from './MentionAutocomplete'
import LocationPicker from './LocationPicker'
import Link from 'next/link'
import {
    analyzePostContent,
    detectLanguage,
    type LocationData,
    type PostMetadata
} from '@/lib/post-analytics'
import {getUserSubscription, SUBSCRIPTION_TIERS, type UserSubscription} from '@/lib/stripe'
import {
    extractHashtags,
    extractMentions,
    resolveUsernames,
} from '@/lib/hashtags'
import AddressSearch from '../ui/AddressSearch'
import type {PostCategory, RecipeData, EventData, ProductData} from '@/lib/database.types'

interface PlaceData {
    name: string
    category: string
    address: string
    latitude: number
    longitude: number
    description: string
    website: string
    is_pet_friendly: boolean
    city?: string
    country?: string
}

interface CreatePostProps {
    onPostCreated: () => void
}

const DRAFT_KEY = 'createpost_draft'

export default function CreatePost({onPostCreated}: CreatePostProps) {
    const {user, profile} = useAuth()
    const [subscription, setSubscription] = useState<UserSubscription | null>(null)

    // Get max characters based on subscription tier
    const maxChars = -1

    // Load draft from localStorage on mount
    const loadDraft = useCallback(() => {
        if (typeof window === 'undefined') return null
        try {
            const draft = localStorage.getItem(DRAFT_KEY)
            return draft ? JSON.parse(draft) : null
        } catch {
            return null
        }
    }, [])

    const [title, setTitle] = useState(() => loadDraft()?.title || '')
    const [content, setContent] = useState(() => loadDraft()?.content || '')
    const [privacy, setPrivacy] = useState<'public' | 'friends'>(() => loadDraft()?.privacy || 'public')
    const [category, setCategory] = useState<PostCategory>(() => loadDraft()?.category || 'general')
    const [secondaryTags, setSecondaryTags] = useState<string[]>(() => loadDraft()?.secondaryTags || [])
    const [tagInput, setTagInput] = useState('')
    const [recipeData, setRecipeData] = useState<Partial<RecipeData>>(() => loadDraft()?.recipeData || {})
    const [eventData, setEventData] = useState<Partial<EventData>>(() => loadDraft()?.eventData || {})
    const [productData, setProductData] = useState<Partial<ProductData>>(() => loadDraft()?.productData || {})
    const [placeData, setPlaceData] = useState<PlaceData>(() => loadDraft()?.placeData || {
        name: '', category: 'eat', address: '', latitude: 0, longitude: 0,
        description: '', website: '', is_pet_friendly: false,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [charCount, setCharCount] = useState(() => loadDraft()?.content?.length || 0)
    const [showImageUploader, setShowImageUploader] = useState(() => loadDraft()?.showImageUploader || false)
    const [imageUrls, setImageUrls] = useState<string[]>(() => loadDraft()?.imageUrls || [])
    const [showVideoUploader, setShowVideoUploader] = useState(() => loadDraft()?.showVideoUploader || false)
    const [videoUrls, setVideoUrls] = useState<string[]>(() => loadDraft()?.videoUrls || [])
    const [detectedUrls, setDetectedUrls] = useState<string[]>([])
    const [showLinkPreview, setShowLinkPreview] = useState(() => loadDraft()?.showLinkPreview !== false)

    // Mention autocomplete state
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionStartPos, setMentionStartPos] = useState(-1)
    const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
    const [cursorPosition, setCursorPosition] = useState({top: 0, left: 0})
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Enhanced metadata state
    const [locationData, setLocationData] = useState<LocationData | null>(null)
    const [shareLocation, setShareLocation] = useState(false)
    const [showLocationPicker, setShowLocationPicker] = useState(false)
    const [analyzedMetadata, setAnalyzedMetadata] = useState<Pick<PostMetadata, 'tags' | 'contentType' | 'mood'> | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // GPT content analysis state
    const [gptAnalysis, setGptAnalysis] = useState<{
        sentiment: string
        tags: string[]
        isAntiVegan: boolean
        antiVeganReason?: string
        shouldBlock: boolean
        reasoning: string
        fallback?: boolean
        error?: boolean
    } | null>(null)
    const [isGptAnalyzing, setIsGptAnalyzing] = useState(false)

    // Load user subscription on mount
    useEffect(() => {
        if (user) {
            getUserSubscription(user.id).then(setSubscription)
        }
    }, [user])

    // Save draft to localStorage
    const saveDraft = useCallback(() => {
        if (typeof window === 'undefined') return
        try {
            const draft = {
                title,
                content,
                privacy,
                category,
                secondaryTags,
                recipeData,
                eventData,
                productData,
                showImageUploader,
                imageUrls,
                showVideoUploader,
                videoUrls,
                showLinkPreview,
                shareLocation,
                locationData
            }
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        } catch {
            // Ignore localStorage errors
        }
    }, [content, privacy, showImageUploader, imageUrls, showLinkPreview, shareLocation, locationData])

    // Save draft when form state changes
    useEffect(() => {
        if (content || imageUrls.length > 0 || videoUrls.length > 0) {
            saveDraft()
        }
    }, [content, privacy, showImageUploader, imageUrls, showVideoUploader, videoUrls, showLinkPreview, saveDraft])

    // Clear draft
    const clearDraft = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(DRAFT_KEY)
        }
    }, [])

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value
        const cursorPos = e.target.selectionStart

        // Allow unlimited for premium tier (-1), otherwise respect the limit
        if (maxChars === -1 || text.length <= maxChars) {
            setContent(text)
            setCharCount(text.length)

            // Detect @ mention
            const beforeCursor = text.substring(0, cursorPos)
            const lastAtSymbol = beforeCursor.lastIndexOf('@')

            if (lastAtSymbol !== -1) {
                const textAfterAt = text.substring(lastAtSymbol + 1, cursorPos)
                // Check if there's no space after @ (still typing the mention)
                if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                    setMentionQuery(textAfterAt)
                    setMentionStartPos(lastAtSymbol)
                    setShowMentionAutocomplete(true)

                    // Calculate cursor position for dropdown
                    if (textareaRef.current) {
                        const textarea = textareaRef.current
                        const {top, left} = getCaretCoordinates(textarea, cursorPos)
                        setCursorPosition({top, left})
                    }
                } else {
                    setShowMentionAutocomplete(false)
                }
            } else {
                setShowMentionAutocomplete(false)
            }
        }
    }

    // Helper function to get caret coordinates
    const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
        const rect = element.getBoundingClientRect()
        const div = document.createElement('div')
        const style = window.getComputedStyle(element)

        div.style.position = 'absolute'
        div.style.visibility = 'hidden'
        div.style.whiteSpace = 'pre-wrap'
        div.style.wordWrap = 'break-word'
        div.style.font = style.font
        div.style.padding = style.padding
        div.style.border = style.border
        div.style.width = element.offsetWidth + 'px'

        const text = element.value.substring(0, position)
        div.textContent = text

        document.body.appendChild(div)
        const span = document.createElement('span')
        span.textContent = element.value.substring(position) || '.'
        div.appendChild(span)

        const coordinates = {
            top: rect.top + span.offsetTop - element.scrollTop,
            left: rect.left + span.offsetLeft - element.scrollLeft
        }

        document.body.removeChild(div)
        return coordinates
    }

    const handleMentionSelect = (username: string) => {
        if (mentionStartPos === -1) return

        const beforeMention = content.substring(0, mentionStartPos)
        const afterCursor = content.substring(textareaRef.current?.selectionStart || content.length)
        const newContent = beforeMention + '@' + username + ' ' + afterCursor

        setContent(newContent)
        setCharCount(newContent.length)
        setShowMentionAutocomplete(false)
        setMentionQuery('')
        setMentionStartPos(-1)

        // Set cursor position after the inserted mention
        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPos = beforeMention.length + username.length + 2
                textareaRef.current.selectionStart = newCursorPos
                textareaRef.current.selectionEnd = newCursorPos
                textareaRef.current.focus()
            }
        }, 0)
    }

    // Detect URLs in content
    useEffect(() => {
        const urls = extractUrls(content)
        setDetectedUrls(urls)
    }, [content])

    // Analyze content for metadata when content changes
    useEffect(() => {
        if (content.trim().length < 10) {
            setAnalyzedMetadata(null)
            return
        }

        const timeoutId = setTimeout(() => {
            setIsAnalyzing(true)
            const metadata = analyzePostContent(content)
            setAnalyzedMetadata(metadata)
            setIsAnalyzing(false)
        }, 500) // Debounce analysis

        return () => clearTimeout(timeoutId)
    }, [content])

    // GPT-based content analysis with 1-second debounce
    useEffect(() => {
        if (content.trim().length < 10) {
            setGptAnalysis(null)
            return
        }

        const timeoutId = setTimeout(async () => {
            setIsGptAnalyzing(true)
            try {
                const response = await fetch('/api/content/analyze', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({content: content.trim()})
                })

                if (response.ok) {
                    const result = await response.json()
                    setGptAnalysis(result)
                } else {
                    // Fallback to neutral if API fails - don't block posting
                    setGptAnalysis({
                        sentiment: 'neutral',
                        tags: [],
                        isAntiVegan: false,
                        shouldBlock: false,
                        reasoning: 'Analysis unavailable',
                        error: true
                    })
                }
            } catch (error) {
                console.error('GPT analysis failed:', error)
                // Don't block posting if analysis fails
                setGptAnalysis({
                    sentiment: 'neutral',
                    tags: [],
                    isAntiVegan: false,
                    shouldBlock: false,
                    reasoning: 'Analysis error',
                    error: true
                })
            } finally {
                setIsGptAnalyzing(false)
            }
        }, 1000) // 1 second debounce - faster response

        return () => clearTimeout(timeoutId)
    }, [content])

    // Open location picker modal or remove location
    const handleLocationToggle = useCallback(() => {
        if (shareLocation) {
            setShareLocation(false)
            setLocationData(null)
        } else {
            setShowLocationPicker(true)
        }
    }, [shareLocation])

    const handleLocationSelect = useCallback((location: LocationData) => {
        setLocationData(location)
        setShareLocation(true)
        setShowLocationPicker(false)
    }, [])

    const handleImagesChange = (urls: string[]) => {
        setImageUrls(urls)
    }

    const removeAllImages = () => {
        setImageUrls([])
        setShowImageUploader(false)
    }

    const handleVideosChange = (urls: string[]) => {
        setVideoUrls(urls)
    }

    const removeAllVideos = () => {
        setVideoUrls([])
        setShowVideoUploader(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!user) {
            setError('You must be logged in to create a post')
            return
        }

        // Check if user is banned
        if (profile?.is_banned) {
            setError('Your account has been suspended and cannot create posts')
            return
        }

        if (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) {
            setError('Please add some content, images, or videos')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Check rate limit before creating post (optional - skip if function doesn't exist)
            const {data: rateLimitData, error: rateLimitError} = await supabase
                .rpc('check_rate_limit_posts', {p_user_id: user.id})

            if (rateLimitError) {
                // Silently skip rate limiting if function doesn't exist (404 error)
                if (rateLimitError.code !== '42883' && !rateLimitError.message?.includes('does not exist')) {
                    console.warn('Rate limit check unavailable:', rateLimitError.message)
                }
                // Continue anyway if rate limit check fails
            } else if (rateLimitData && typeof rateLimitData === 'object' && 'allowed' in rateLimitData) {
                if (!rateLimitData.allowed) {
                    throw new Error('Rate limit exceeded. Please wait before posting again.')
                }
            } else if (rateLimitData === false) {
                throw new Error('Rate limit exceeded. Please wait a few minutes before posting again.')
            }

            // Content is already checked by GPT analysis in real-time
            // No need for additional moderation check here
            // The GPT analysis prevents posting if shouldBlock is true (see submit button disabled state)

            // Get final content analysis
            const finalMetadata = analyzedMetadata || analyzePostContent(content)
            const detectedLang = detectLanguage(content)

            const postData: any = {
                user_id: user.id,
                content: content.trim(),
                privacy,
                category,
                secondary_tags: secondaryTags.length > 0 ? secondaryTags : undefined,
                tags: finalMetadata.tags,
                content_type: finalMetadata.contentType,
                mood: finalMetadata.mood,
                language: detectedLang
            }

            // Add title if provided (slug is auto-generated by DB trigger)
            if (title.trim()) {
                postData.title = title.trim()
            }

            // Add category-specific data
            if (category === 'recipe' && recipeData.ingredients?.length) {
                postData.recipe_data = recipeData
            }
            if (category === 'event' && eventData.start_time) {
                postData.event_data = eventData
            }
            if (category === 'product' && productData.brand) {
                postData.product_data = productData
            }

            // Validate place data when category is place
            if (category === 'place') {
                if (!placeData.name.trim()) {
                    setError('Please enter a place name')
                    setLoading(false)
                    return
                }
                if (!placeData.latitude || !placeData.longitude) {
                    setError('Please select an address for the place')
                    setLoading(false)
                    return
                }
            }

            // Insert place FIRST when category is place, so we can link it to the post
            if (category === 'place' && placeData.latitude && placeData.longitude) {
                try {
                    const { data: insertedPlace, error: placeError } = await supabase
                        .from('places')
                        .insert({
                            name: placeData.name.trim(),
                            category: placeData.category,
                            address: placeData.address,
                            latitude: placeData.latitude,
                            longitude: placeData.longitude,
                            description: placeData.description.trim() || null,
                            website: placeData.website.trim() || null,
                            is_pet_friendly: placeData.is_pet_friendly,
                            images: imageUrls.length > 0 ? imageUrls : [],
                            created_by: user.id,
                            city: placeData.city || null,
                            country: placeData.country || null,
                        })
                        .select('id')
                        .single()

                    if (placeError) {
                        console.error('Error creating place:', placeError)
                    } else if (insertedPlace) {
                        postData.place_id = insertedPlace.id
                    }
                } catch (placeError) {
                    console.error('Error creating place:', placeError)
                }
            }

            // Add location data if user chose to share
            if (shareLocation && locationData) {
                if (locationData.city) postData.location_city = locationData.city
                if (locationData.region) postData.location_region = locationData.region
            }

            // Only add images field if we have images to avoid database errors
            if (imageUrls.length > 0) {
                postData.images = imageUrls
            }

            // Only add videos field if we have videos
            if (videoUrls.length > 0) {
                postData.video_urls = videoUrls
            }

            // Extract hashtags and mentions before creating post
            const hashtags = extractHashtags(content)
            const mentions = extractMentions(content)

            // Resolve mentions to user IDs
            let mentionedUserIds: string[] = []
            if (mentions.length > 0) {
                mentionedUserIds = await resolveUsernames(mentions)
                if (mentionedUserIds.length > 0) {
                    postData.mentioned_users = mentionedUserIds
                }
            }

            const {data: createdPost, error: dbError} = await supabase
                .from('posts')
                .insert(postData)
                .select('id')
                .single()

            if (dbError) {
                console.error('Database error:', dbError)
                throw new Error(dbError.message || 'Failed to create post')
            }

            if (!createdPost) {
                throw new Error('Post created but ID not returned')
            }

            // Process hashtags via API endpoint (uses service role)
            if (hashtags.length > 0) {
                try {
                    const response = await fetch('/api/posts/hashtags', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            postId: createdPost.id,
                            hashtags: hashtags
                        })
                    })

                    if (!response.ok) {
                        const errorData = await response.json()
                        console.error('[Hashtags] API error:', errorData)
                    } else {
                        const result = await response.json()
                        console.log('[Hashtags] Successfully processed:', result)
                    }
                } catch (hashtagError) {
                    console.error('[Hashtags] Error processing hashtags:', hashtagError)
                    // Don't fail the post creation if hashtag processing fails
                }
            }

            // Send notifications to mentioned users
            if (mentionedUserIds.length > 0) {
                try {
                    for (const mentionedUserId of mentionedUserIds) {
                        // Don't notify if user mentioned themselves
                        if (mentionedUserId !== user.id) {
                            await fetch('/api/notifications/create', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    userId: mentionedUserId,
                                    type: 'mention',
                                    entityType: 'post',
                                    entityId: createdPost.id,
                                }),
                            })
                        }
                    }
                } catch (notifError) {
                    console.error('Error sending mention notifications:', notifError)
                    // Don't fail the post creation if notification fails
                }
            }

            // Reset form only on success
            setTitle('')
            setContent('')
            setCharCount(0)
            setPrivacy('public')
            setCategory('general')
            setSecondaryTags([])
            setTagInput('')
            setRecipeData({})
            setEventData({})
            setProductData({})
            setPlaceData({
                name: '',
                category: 'eat',
                address: '',
                latitude: 0,
                longitude: 0,
                description: '',
                website: '',
                is_pet_friendly: false
            })
            setImageUrls([])
            setVideoUrls([])
            setShowImageUploader(false)
            setShowVideoUploader(false)
            setShowLinkPreview(true)
            setShareLocation(false)
            setLocationData(null)
            setAnalyzedMetadata(null)
            setGptAnalysis(null)
            setIsGptAnalyzing(false)
            setError(null)
            clearDraft()

            // Show success message
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000) // Hide after 3 seconds

            onPostCreated()
        } catch (err) {
            console.error('Error creating post:', err)
            setError(err instanceof Error ? err.message : 'Failed to create post. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow p-6">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-on-surface mb-2">
                        Join the conversation!
                    </h3>
                    <p className="text-on-surface-variant mb-4">
                        Sign up or log in to start sharing your vegan journey with the community.
                    </p>
                    <div className="flex justify-center space-x-3">
                        <Link
                            href="/auth"
                            className="silk-gradient hover:opacity-90 text-white px-4 py-2 rounded-md font-medium transition-colors"
                        >
                            Sign Up - Free Forever
                        </Link>
                        <Link
                            href="/auth"
                            className="bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2 rounded-md font-medium transition-colors"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow p-4">
            <form onSubmit={handleSubmit}>
                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 bg-surface-container-low ghost-border rounded-lg">
                        <p className="text-sm text-primary font-medium">✅ Post created successfully! Check your
                            feed.</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div className="flex space-x-3">
                    <div className="flex-1 min-w-0 overflow-hidden">
                        {/* Optional title for SEO */}
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title (optional, improves SEO)"
                            maxLength={200}
                            className="w-full px-3 py-2 mb-2 bg-surface-container-low border-0 rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border placeholder:text-outline"
                        />
                        <div className="relative pr-[16px]">
              <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Share your vegan journey..."
                  className="w-full p-3 bg-surface-container-low border-0 rounded-lg resize-y focus:ring-1 focus:ring-primary/40 focus:outline-none ghost-border text-sm"
                  rows={5}
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

                        {/* Category Selector */}
                        <div className="mt-3">
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    {slug: 'general', icon: 'article', label: 'General'},
                                    {slug: 'recipe', icon: 'restaurant_menu', label: 'Recipe'},
                                    {slug: 'place', icon: 'location_on', label: 'Place'},
                                    {slug: 'event', icon: 'event', label: 'Event'},
                                    {slug: 'lifestyle', icon: 'self_improvement', label: 'Lifestyle'},
                                    {slug: 'activism', icon: 'campaign', label: 'Activism'},
                                    {slug: 'question', icon: 'help', label: 'Question'},
                                    {slug: 'product', icon: 'shopping_bag', label: 'Product'},
                                    {slug: 'hotel', icon: 'hotel', label: 'Stay'},
                                    {slug: 'organisation', icon: 'corporate_fare', label: 'Organisation'},
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
                                        <span className="material-symbols-outlined text-sm"
                                              style={{fontSize: '14px'}}>{cat.icon}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Secondary Tags */}
                        <div className="mt-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                                {secondaryTags.map((tag, i) => (
                                    <span key={i}
                                          className="flex items-center gap-1 bg-secondary-container text-on-surface text-xs px-2 py-0.5 rounded-full">
                                {tag}
                                        <button type="button"
                                                onClick={() => setSecondaryTags(prev => prev.filter((_, idx) => idx !== i))}
                                                className="hover:text-error">
                                  <X className="h-3 w-3"/>
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

                                {/* Meal type (primary category) */}
                                <select value={recipeData.meal_type || ''} onChange={(e) => setRecipeData(prev => ({ ...prev, meal_type: e.target.value as RecipeData['meal_type'] }))}
                                        className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none">
                                    <option value="">Meal type...</option>
                                    <option value="breakfast">Breakfast & Brunch</option>
                                    <option value="lunch">Lunch</option>
                                    <option value="dinner">Dinner</option>
                                    <option value="snacks">Snacks & Appetizers</option>
                                    <option value="desserts">Desserts & Sweets</option>
                                    <option value="drinks">Drinks & Smoothies</option>
                                </select>

                                {/* Tags: cooking style + diet (clickable chips) */}
                                <div className="overflow-x-auto">
                                    <p className="text-xs text-on-surface-variant mb-1.5">Tags (select all that apply)</p>
                                    <div className="flex flex-wrap gap-1.5 max-w-full">
                                        {[
                                            { group: 'Style', tags: ['Quick & Easy', 'One-Pot', 'Meal Prep', 'Raw', 'No-Bake', 'Baking', 'Comfort Food', 'Fermented'] },
                                            { group: 'Diet', tags: ['Gluten-Free', 'Nut-Free', 'Soy-Free', 'Oil-Free', 'High-Protein', 'Low-Carb', 'Whole Foods'] },
                                            { group: 'Other', tags: ['Budget-Friendly', 'Kid-Friendly', 'Batch Cooking', 'Holiday', 'BBQ & Grill'] },
                                        ].map(group => group.tags.map(tag => {
                                            const isSelected = secondaryTags.includes(tag.toLowerCase());
                                            return (
                                                <button key={tag} type="button"
                                                    onClick={() => {
                                                        const lower = tag.toLowerCase();
                                                        if (isSelected) setSecondaryTags(prev => prev.filter(t => t !== lower));
                                                        else setSecondaryTags(prev => [...prev, lower]);
                                                    }}
                                                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant ghost-border hover:bg-surface-container'
                                                    }`}>
                                                    {tag}
                                                </button>
                                            );
                                        }))}
                                    </div>
                                </div>

                                <textarea
                                    value={recipeData.ingredients?.join('\n') || ''}
                                    onChange={(e) => setRecipeData(prev => ({
                                        ...prev,
                                        ingredients: e.target.value.split('\n').filter(Boolean)
                                    }))}
                                    placeholder={"Ingredients (one per line)\ne.g.\n200g tofu\n1 tbsp soy sauce\n2 cloves garlic"}
                                    className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border resize-y focus:ring-1 focus:ring-primary/40 focus:outline-none"
                                    rows={6}
                                />
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Prep (min)" value={recipeData.prep_time_min || ''}
                                           onChange={(e) => setRecipeData(prev => ({
                                               ...prev,
                                               prep_time_min: Number(e.target.value)
                                           }))}
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                    <input type="number" placeholder="Cook (min)" value={recipeData.cook_time_min || ''}
                                           onChange={(e) => setRecipeData(prev => ({
                                               ...prev,
                                               cook_time_min: Number(e.target.value)
                                           }))}
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                    <input type="number" placeholder="Servings" value={recipeData.servings || ''}
                                           onChange={(e) => setRecipeData(prev => ({
                                               ...prev,
                                               servings: Number(e.target.value)
                                           }))}
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                </div>
                                <div className="flex gap-2">
                                    <select value={recipeData.difficulty || ''} onChange={(e) => setRecipeData(prev => ({
                                        ...prev,
                                        difficulty: e.target.value as RecipeData['difficulty']
                                    }))}
                                            className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none">
                                        <option value="">Difficulty...</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                    <input type="text" placeholder="Cuisine (e.g. Italian)" value={recipeData.cuisine || ''}
                                           onChange={(e) => setRecipeData(prev => ({ ...prev, cuisine: e.target.value }))}
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                </div>

                                {/* Nutrition (optional, collapsible) */}
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-on-surface-variant hover:text-on-surface transition-colors py-1">
                                        Nutrition info (optional)
                                    </summary>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <input type="text" placeholder="Calories" value={recipeData.nutrition?.calories || ''}
                                               onChange={(e) => setRecipeData(prev => ({ ...prev, nutrition: { ...prev.nutrition, calories: e.target.value } }))}
                                               className="p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                        <input type="text" placeholder="Protein (g)" value={recipeData.nutrition?.protein || ''}
                                               onChange={(e) => setRecipeData(prev => ({ ...prev, nutrition: { ...prev.nutrition, protein: e.target.value } }))}
                                               className="p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                        <input type="text" placeholder="Carbs (g)" value={recipeData.nutrition?.carbs || ''}
                                               onChange={(e) => setRecipeData(prev => ({ ...prev, nutrition: { ...prev.nutrition, carbs: e.target.value } }))}
                                               className="p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                        <input type="text" placeholder="Fat (g)" value={recipeData.nutrition?.fat || ''}
                                               onChange={(e) => setRecipeData(prev => ({ ...prev, nutrition: { ...prev.nutrition, fat: e.target.value } }))}
                                               className="p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                        <input type="text" placeholder="Fiber (g)" value={recipeData.nutrition?.fiber || ''}
                                               onChange={(e) => setRecipeData(prev => ({ ...prev, nutrition: { ...prev.nutrition, fiber: e.target.value } }))}
                                               className="p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                    </div>
                                </details>

                                <input type="text" placeholder="Source / attribution (optional)" value={recipeData.source_attribution || ''}
                                       onChange={(e) => setRecipeData(prev => ({ ...prev, source_attribution: e.target.value }))}
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                            </div>
                        )}

                        {category === 'event' && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Event Details</p>

                                {/* Event type */}
                                <select value={secondaryTags.find(t => ['festival','market','workshop','activism','community','screening','sports','sanctuary','talk'].includes(t)) || ''}
                                        onChange={(e) => {
                                            const eventTypes = ['festival','market','workshop','activism','community','screening','sports','sanctuary','talk'];
                                            const filtered = secondaryTags.filter(t => !eventTypes.includes(t));
                                            if (e.target.value) filtered.push(e.target.value);
                                            setSecondaryTags(filtered);
                                        }}
                                        className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none">
                                    <option value="">Event type...</option>
                                    <option value="festival">Vegan Festival / Fair</option>
                                    <option value="market">Vegan Market / Pop-Up</option>
                                    <option value="workshop">Cooking Class / Workshop</option>
                                    <option value="activism">Activism & Outreach</option>
                                    <option value="community">Community Meetup / Potluck</option>
                                    <option value="screening">Documentary Screening</option>
                                    <option value="sanctuary">Farm Sanctuary Visit</option>
                                    <option value="talk">Health & Nutrition Talk</option>
                                    <option value="sports">Vegan Run / Sports Event</option>
                                </select>

                                <div className="flex gap-2">
                                    <input type="datetime-local" value={eventData.start_time || ''}
                                           onChange={(e) => setEventData(prev => ({ ...prev, start_time: e.target.value }))}
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                    <input type="datetime-local" value={eventData.end_time || ''}
                                           onChange={(e) => setEventData(prev => ({...prev, end_time: e.target.value}))}
                                           placeholder="End time"
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                </div>
                                <input type="text" value={eventData.location || ''}
                                       onChange={(e) => setEventData(prev => ({...prev, location: e.target.value}))}
                                       placeholder="Event location"
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                <input type="url" value={eventData.ticket_url || ''}
                                       onChange={(e) => setEventData(prev => ({...prev, ticket_url: e.target.value}))}
                                       placeholder="Ticket URL (optional)"
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                            </div>
                        )}

                        {category === 'product' && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Product
                                    Details</p>
                                <input type="text" value={productData.brand || ''}
                                       onChange={(e) => setProductData(prev => ({...prev, brand: e.target.value}))}
                                       placeholder="Brand name"
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                <div className="flex gap-2">
                                    <input type="text" value={productData.price_range || ''}
                                           onChange={(e) => setProductData(prev => ({
                                               ...prev,
                                               price_range: e.target.value
                                           }))} placeholder="Price range (e.g. $5-10)"
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                    <input type="text" value={productData.where_to_buy || ''}
                                           onChange={(e) => setProductData(prev => ({
                                               ...prev,
                                               where_to_buy: e.target.value
                                           }))} placeholder="Where to buy"
                                           className="flex-1 p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                </div>
                            </div>
                        )}

                        {category === 'hotel' && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Stay Details</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Vegan Breakfast', 'Fully Vegan', 'Eco-Friendly', 'Pet-Friendly', 'City Center', 'Nature/Rural', 'Kitchen Available', 'Pool/Spa'].map(tag => {
                                        const isSelected = secondaryTags.includes(tag.toLowerCase());
                                        return (
                                            <button key={tag} type="button"
                                                onClick={() => {
                                                    const lower = tag.toLowerCase();
                                                    if (isSelected) setSecondaryTags(prev => prev.filter(t => t !== lower));
                                                    else setSecondaryTags(prev => [...prev, lower]);
                                                }}
                                                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                    isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant ghost-border hover:bg-surface-container'
                                                }`}>
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                                <input type="url" placeholder="Booking URL (optional)" value="" onChange={() => {}}
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                <input type="text" placeholder="Price range (e.g. €50-100/night)" value="" onChange={() => {}}
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                            </div>
                        )}

                        {category === 'organisation' && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Organisation Details</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Animal Sanctuary', 'Vegan Non-Profit', 'Advocacy Group', 'Food Bank', 'Community Kitchen', 'Education', 'Health & Wellness', 'Environmental'].map(tag => {
                                        const isSelected = secondaryTags.includes(tag.toLowerCase());
                                        return (
                                            <button key={tag} type="button"
                                                onClick={() => {
                                                    const lower = tag.toLowerCase();
                                                    if (isSelected) setSecondaryTags(prev => prev.filter(t => t !== lower));
                                                    else setSecondaryTags(prev => [...prev, lower]);
                                                }}
                                                className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                    isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant ghost-border hover:bg-surface-container'
                                                }`}>
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                                <input type="url" placeholder="Website URL" value="" onChange={() => {}}
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                                <input type="text" placeholder="Location / region" value="" onChange={() => {}}
                                       className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"/>
                            </div>
                        )}

                        {category === 'place' && (
                            <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-2">
                                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Place Details</p>
                                <input
                                    type="text"
                                    value={placeData.name}
                                    onChange={(e) => setPlaceData(prev => ({...prev, name: e.target.value}))}
                                    placeholder="Place name *"
                                    className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"
                                />
                                <select
                                    value={placeData.category}
                                    onChange={(e) => setPlaceData(prev => ({...prev, category: e.target.value}))}
                                    className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"
                                >
                                    <option value="eat">Eat</option>
                                    <option value="hotel">Stay</option>
                                    <option value="store">Store</option>
                                    <option value="event">Event</option>
                                    <option value="organisation">Organisation</option>
                                    <option value="other">Other</option>
                                </select>
                                <AddressSearch
                                    value=""
                                    selectedAddress={placeData.address}
                                    onSelect={(result) => setPlaceData(prev => ({
                                        ...prev,
                                        address: result.address,
                                        latitude: result.latitude,
                                        longitude: result.longitude,
                                        city: result.city,
                                        country: result.country,
                                    }))}
                                    placeholder="Search address *"
                                    required
                                />
                                <textarea
                                    value={placeData.description}
                                    onChange={(e) => setPlaceData(prev => ({...prev, description: e.target.value}))}
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border resize-none focus:ring-1 focus:ring-primary/40 focus:outline-none"
                                />
                                <input
                                    type="url"
                                    value={placeData.website}
                                    onChange={(e) => setPlaceData(prev => ({...prev, website: e.target.value}))}
                                    placeholder="Website (optional)"
                                    className="w-full p-2 bg-surface-container-lowest rounded text-sm border-0 ghost-border focus:ring-1 focus:ring-primary/40 focus:outline-none"
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={placeData.is_pet_friendly}
                                        onChange={(e) => setPlaceData(prev => ({
                                            ...prev,
                                            is_pet_friendly: e.target.checked
                                        }))}
                                        className="h-4 w-4 text-primary focus:ring-primary border-outline-variant/15 rounded"
                                    />
                                    <span className="text-sm text-on-surface-variant">Pet Friendly</span>
                                </label>
                            </div>
                        )}

                        {/* Image Preview */}
                        {imageUrls.length > 0 && (
                            <div className="mt-3 relative">
                                <button
                                    type="button"
                                    onClick={removeAllImages}
                                    className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                            </div>
                        )}

                        {/* Image Uploader */}
                        {showImageUploader && (
                            <div className="mt-3">
                                <ImageUploader
                                    onImagesChange={handleImagesChange}
                                    maxImages={subscription ? SUBSCRIPTION_TIERS[subscription.tier].maxImages : 3}
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

                        {/* Content Analysis Preview */}
                        {(gptAnalysis || isGptAnalyzing) && (
                            <div className="mt-3">
                                {/* Analyzing indicator */}
                                {isGptAnalyzing && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                            <span className="text-sm text-blue-800">Checking content...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Block Warning */}
                                {gptAnalysis && gptAnalysis.shouldBlock && !isGptAnalyzing && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-red-600 text-lg">🚫</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-red-800">Cannot post this
                                                    content</p>
                                                <p className="text-xs text-red-700 mt-1">{gptAnalysis.reasoning}</p>
                                                {gptAnalysis.antiVeganReason && (
                                                    <p className="text-xs text-red-600 mt-1 italic">{gptAnalysis.antiVeganReason}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Warning (flagged but not blocking) */}
                                {gptAnalysis && gptAnalysis.isAntiVegan && !gptAnalysis.shouldBlock && !isGptAnalyzing && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-yellow-600 text-lg">⚠️</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-yellow-800">Content flagged</p>
                                                <p className="text-xs text-yellow-700 mt-1">{gptAnalysis.antiVeganReason || gptAnalysis.reasoning}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Positive Feedback */}
                                {gptAnalysis && !gptAnalysis.shouldBlock && !gptAnalysis.isAntiVegan && !isGptAnalyzing && (
                                    <div className="p-3 bg-surface-container-low ghost-border rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-primary text-lg">✅</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-primary">
                                                    {gptAnalysis.sentiment === 'positive' && 'Great content!'}
                                                    {gptAnalysis.sentiment === 'transformation' && 'Inspiring journey!'}
                                                    {gptAnalysis.sentiment === 'question' && 'Great question!'}
                                                    {gptAnalysis.sentiment === 'educational' && 'Educational content!'}
                                                    {gptAnalysis.sentiment === 'neutral' && 'Ready to post'}
                                                </p>
                                                {gptAnalysis.tags && gptAnalysis.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {gptAnalysis.tags.slice(0, 5).map((tag, index) => (
                                                            <span key={index}
                                                                  className="text-xs bg-surface-container-low text-primary px-2 py-1 rounded-full">
                                #{tag}
                              </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Location Preview */}
                        {shareLocation && locationData && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border">
                                <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-blue-600"/>
                                    <span className="text-sm text-blue-800">
                    Sharing location: {locationData.city && locationData.region
                                        ? `${locationData.city}, ${locationData.region}`
                                        : locationData.city || locationData.region || 'Current location'
                                    }
                  </span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowImageUploader(!showImageUploader)}
                                    className={`flex items-center space-x-1 hover:text-primary transition-colors ${
                                        showImageUploader || imageUrls.length > 0
                                            ? 'text-primary'
                                            : 'text-outline'
                                    }`}
                                >
                                    <ImageIcon className="h-5 w-5"/>
                                    <span className="text-sm">Photo</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowVideoUploader(!showVideoUploader)}
                                    className={`flex items-center space-x-1 hover:text-purple-600 transition-colors ${
                                        showVideoUploader || videoUrls.length > 0
                                            ? 'text-purple-600'
                                            : 'text-outline'
                                    }`}
                                >
                                    <Video className="h-5 w-5"/>
                                    <span className="text-sm">Video</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleLocationToggle}
                                    className={`flex items-center space-x-1 hover:text-blue-600 transition-colors ${
                                        shareLocation
                                            ? 'text-blue-600'
                                            : 'text-outline'
                                    }`}
                                >
                                    <MapPin className="h-5 w-5"/>
                                    <span className="text-sm">Location</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="public"
                                        checked={privacy === 'public'}
                                        onChange={(e) => setPrivacy(e.target.value as 'public' | 'friends')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <Globe className="h-4 w-4 text-outline"/>
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
                                    <Users className="h-4 w-4 text-outline"/>
                                    <span className="text-sm text-on-surface-variant">Friends</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-2 mt-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    type="submit"
                                    disabled={
                                        (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) ||
                                        loading ||
                                        (maxChars !== -1 && charCount > maxChars) ||
                                        isGptAnalyzing ||
                                        (gptAnalysis?.shouldBlock === true) ||
                                        // Disable if content has text but hasn't been analyzed yet (or analysis pending)
                                        (content.trim().length >= 10 && !gptAnalysis)
                                    }
                                    className="flex items-center space-x-1 silk-gradient hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
                                >
                                    <Send className="h-4 w-4"/>
                                    <span>
                        {loading ? 'Posting...' :
                            isGptAnalyzing ? 'Checking...' :
                                gptAnalysis?.shouldBlock ? 'Blocked' :
                                    (content.trim().length >= 10 && !gptAnalysis) ? 'Checking...' :
                                        'Post'}
                      </span>
                                </button>
                                <div className="flex items-center space-x-2">
                    <span
                        className={`text-sm ${maxChars !== -1 && charCount > maxChars * 0.9 ? 'text-red-500' : 'text-outline'}`}>
                      {charCount}{maxChars === -1 ? '' : `/${maxChars}`}
                    </span>
                                </div>
                            </div>

                            {/* Support note for free tier users */}
                            {(!subscription || subscription.tier === 'free') && (
                                <p className="text-xs text-on-surface-variant">
                                    Enjoying PlantsPack? Consider{' '}
                                    <Link
                                        href="/support"
                                        className="text-primary hover:text-primary-container underline font-medium"
                                    >
                                        supporting us
                                    </Link>
                                </p>
                            )}
                        </div>

                    </div>
                </div>
            </form>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <LocationPicker
                    onSelect={handleLocationSelect}
                    onClose={() => setShowLocationPicker(false)}
                    currentLocation={locationData}
                />
            )}
        </div>
    )
}