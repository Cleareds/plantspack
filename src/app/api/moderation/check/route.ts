import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// OpenAI Moderation API
async function checkContentModeration(content: string) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, skipping moderation')
    return { flagged: false, categories: {} }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: content
      })
    })

    if (!response.ok) {
      throw new Error('Moderation API request failed')
    }

    const data = await response.json()
    const result = data.results[0]

    return {
      flagged: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores
    }
  } catch (error) {
    console.error('Error checking content moderation:', error)
    return { flagged: false, categories: {}, error: true }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, imageUrl } = await request.json()

    // Get user session
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check text content
    let textModeration: any = { flagged: false, categories: {} }
    if (content) {
      textModeration = await checkContentModeration(content)
    }

    // For images, we would need to use a vision API or image moderation service
    // OpenAI's moderation API doesn't directly support images yet
    // You could integrate with AWS Rekognition, Google Cloud Vision, etc.
    let imageModeration: any = { flagged: false }

    if (imageUrl && process.env.ENABLE_IMAGE_MODERATION === 'true') {
      // TODO: Implement image moderation
      // Example with AWS Rekognition or similar service
      imageModeration = { flagged: false, unsafe: false }
    }

    // Combine results
    const isFlagged = textModeration.flagged || imageModeration.flagged

    // Determine severity and warnings
    const warnings: string[] = []
    const categories = textModeration.categories || {}

    if (categories.sexual) warnings.push('sexual content')
    if (categories.hate) warnings.push('hate speech')
    if (categories.harassment) warnings.push('harassment')
    if (categories.violence) warnings.push('violence')
    if (categories['self-harm']) warnings.push('self-harm content')

    return NextResponse.json({
      flagged: isFlagged,
      warnings,
      categories: textModeration.categories,
      categoryScores: textModeration.categoryScores,
      recommendation: isFlagged ? 'content_warning' : 'allow',
      imageModeration
    })
  } catch (error) {
    console.error('Error in moderation check:', error)
    return NextResponse.json(
      { error: 'Failed to check content' },
      { status: 500 }
    )
  }
}
