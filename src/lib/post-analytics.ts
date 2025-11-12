// Post Analytics and Content Intelligence Utilities

export interface LocationData {
  city?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
}

export interface PostMetadata {
  tags: string[]
  contentType: 'recipe' | 'restaurant_review' | 'lifestyle' | 'activism' | 'general' | 'question'
  mood: 'positive' | 'educational' | 'question' | 'celebration' | 'neutral'
  location?: LocationData
  detectedLanguage: string
}

// Content analysis keywords and patterns
const CONTENT_PATTERNS = {
  recipe: [
    'recipe', 'cook', 'bake', 'ingredient', 'dish', 'meal', 'food', 'preparation',
    'mix', 'blend', 'chop', 'sauté', 'roast', 'steam', 'boil', 'fry', 'grill',
    'tablespoon', 'teaspoon', 'cup', 'ounce', 'gram', 'minute', 'hour', 'serve'
  ],
  restaurant_review: [
    'restaurant', 'cafe', 'diner', 'eatery', 'menu', 'review', 'service',
    'atmosphere', 'ambiance', 'staff', 'price', 'expensive', 'cheap', 'worth',
    'recommend', 'visit', 'tried', 'ordered', 'tasted'
  ],
  health: [
    'health', 'healthy', 'nutrition', 'vitamin', 'protein', 'fitness', 'wellness',
    'energy', 'nutrients', 'mineral', 'antioxidant', 'superfood', 'diet', 'weight'
  ],
  environment: [
    'environment', 'eco', 'sustainable', 'climate', 'planet', 'green', 'carbon',
    'footprint', 'renewable', 'organic', 'local', 'seasonal', 'zero-waste'
  ],
  activism: [
    'activism', 'rights', 'ethical', 'justice', 'campaign', 'awareness', 'protest',
    'movement', 'change', 'advocate', 'support', 'fight', 'stand', 'voice'
  ],
  lifestyle: [
    'lifestyle', 'living', 'daily', 'routine', 'journey', 'experience', 'life',
    'personal', 'story', 'sharing', 'inspiration', 'motivation', 'habit'
  ],
  community: [
    'community', 'group', 'meet', 'event', 'gathering', 'social', 'friends',
    'together', 'join', 'participate', 'connect', 'network', 'local'
  ]
}

const MOOD_PATTERNS = {
  positive: [
    'love', 'amazing', 'great', 'awesome', 'happy', 'excited', 'wonderful',
    'fantastic', 'incredible', 'delicious', 'perfect', 'beautiful', 'brilliant'
  ],
  educational: [
    'learn', 'tip', 'advice', 'information', 'guide', 'tutorial', 'how-to',
    'explain', 'teach', 'share', 'knowledge', 'fact', 'research', 'study'
  ],
  question: [
    'question', 'help', 'advice', 'how', 'what', 'where', 'when', 'why',
    'anyone', 'recommend', 'suggest', 'know', 'think', 'opinion'
  ],
  celebration: [
    'achievement', 'success', 'milestone', 'proud', 'accomplished', 'celebrate',
    'victory', 'won', 'completed', 'finished', 'reached', 'goal'
  ]
}

/**
 * Analyzes post content and extracts metadata
 */
export function analyzePostContent(content: string): Pick<PostMetadata, 'tags' | 'contentType' | 'mood'> {
  const lowerContent = content.toLowerCase()
  const tags: string[] = []
  let contentType: PostMetadata['contentType'] = 'general'
  let mood: PostMetadata['mood'] = 'neutral'
  
  // Extract tags based on content patterns
  Object.entries(CONTENT_PATTERNS).forEach(([category, keywords]) => {
    const matches = keywords.filter(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    ).length
    
    if (matches > 0) {
      tags.push(category)
      
      // Determine primary content type based on strongest match
      if (matches > 2 && contentType === 'general') {
        contentType = category as PostMetadata['contentType']
      }
    }
  })
  
  // Determine mood based on content
  Object.entries(MOOD_PATTERNS).forEach(([moodType, keywords]) => {
    const matches = keywords.filter(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    ).length
    
    if (matches > 0 && mood === 'neutral') {
      mood = moodType as PostMetadata['mood']
    }
  })
  
  // Check for question marks or question words
  if (content.includes('?') || MOOD_PATTERNS.question.some(word => lowerContent.includes(word))) {
    mood = 'question'
    if (contentType === 'general') {
      contentType = 'question'
    }
  }
  
  return { tags, contentType, mood }
}

/**
 * Gets user's current location (with permission)
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    
    const timeoutId = setTimeout(() => {
      resolve(null)
    }, 10000) // 10 second timeout
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeoutId)
        const { latitude, longitude } = position.coords
        
        try {
          // Reverse geocoding to get city/region
          const locationData = await reverseGeocode(latitude, longitude)
          resolve({
            latitude,
            longitude,
            ...locationData
          })
        } catch {
          // Return coordinates even if reverse geocoding fails
          resolve({ latitude, longitude })
        }
      },
      (err) => {
        clearTimeout(timeoutId)
        console.log('Location access denied or failed:', err.message)
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000 // 5 minutes
      }
    )
  })
}

/**
 * Reverse geocoding to get location details from coordinates
 */
async function reverseGeocode(lat: number, lon: number): Promise<Partial<LocationData>> {
  try {
    // Using OpenStreetMap Nominatim (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VeganSocialApp/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Geocoding failed')
    }
    
    const data = await response.json()
    const address = data.address || {}
    
    return {
      city: address.city || address.town || address.village || address.municipality,
      region: address.state || address.region || address.province,
      country: address.country
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
    return {}
  }
}

/**
 * Detects the primary language of the content
 */
export function detectLanguage(content: string): string {
  // Simple language detection - in a real app you might use a proper library
  const text = content.toLowerCase()
  
  // Common words in different languages
  const languagePatterns = {
    en: ['the', 'and', 'is', 'a', 'to', 'of', 'in', 'it', 'you', 'that', 'he', 'was', 'for'],
    es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le'],
    fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour'],
    de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf'],
    it: ['il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'non', 'una', 'su', 'con']
  }
  
  let maxScore = 0
  let detectedLang = 'en' // default to English
  
  Object.entries(languagePatterns).forEach(([lang, words]) => {
    const score = words.reduce((count, word) => {
      return count + (text.includes(` ${word} `) ? 1 : 0)
    }, 0)
    
    if (score > maxScore) {
      maxScore = score
      detectedLang = lang
    }
  })
  
  return detectedLang
}

/**
 * Records user interaction with a post for analytics
 */
export async function recordPostInteraction(
  postId: string,
  eventType: 'view' | 'click' | 'share' | 'save' | 'report',
  metadata: Record<string, any> = {},
  durationSeconds?: number
) {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    const analyticsData: any = {
      post_id: postId,
      event_type: eventType,
      metadata: metadata,
      user_agent: navigator.userAgent
    }
    
    if (durationSeconds) {
      analyticsData.duration_seconds = durationSeconds
    }
    
    const { error } = await supabase
      .from('post_analytics')
      .insert(analyticsData)
    
    if (error && error.code !== '23503') { // Ignore foreign key violations (user not logged in)
      console.warn('Failed to record interaction:', error)
    }
  } catch (error) {
    console.warn('Analytics recording failed:', error)
  }
}

/**
 * Updates user interaction patterns based on post engagement
 */
export async function updateUserInteractionPatterns(
  interactionType: 'like' | 'comment' | 'share' | 'view',
  postTags: string[],
  postContentType: string,
  postAuthorId: string,
  interactionStrength: number = 1.0
) {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Call the database function to update patterns
    const { error } = await supabase.rpc('update_user_interaction_patterns', {
      target_user_id: user.id,
      interaction_type: interactionType,
      content_tags: postTags,
      content_type: postContentType,
      author_id: postAuthorId,
      interaction_strength: interactionStrength
    })
    
    if (error) {
      console.warn('Failed to update interaction patterns:', error)
    }
  } catch (error) {
    console.warn('Interaction pattern update failed:', error)
  }
}