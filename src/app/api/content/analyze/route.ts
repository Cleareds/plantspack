import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const SYSTEM_PROMPT = `You are a content analyzer for PlantsPack, a vegan social media platform.

Your role is to analyze user posts and provide:
1. Sentiment analysis (positive/negative/neutral/question/educational/celebration)
2. Content tags (recipe/restaurant_review/health/environment/activism/product_review/lifestyle)
3. Detection of anti-vegan content (content promoting or celebrating animal products)

CRITICAL RULES FOR VEGAN PLATFORM:
- Posts promoting meat, dairy, eggs, fish, leather, fur = ANTI-VEGAN
- Posts saying "I love/like/enjoy meat/cheese/eggs" = ANTI-VEGAN
- Posts criticizing veganism = ANTI-VEGAN
- Posts about hunting/fishing for sport = ANTI-VEGAN
- Even if someone says "I love X" where X is an animal product, the sentiment is NEGATIVE for this platform

SENTIMENT RULES:
- "I love tofu" = positive
- "I love meat" = negative (anti-vegan on vegan platform)
- "I hate vegans" = negative (anti-vegan)
- Questions about vegan alternatives = neutral/question
- Educational vegan content = educational/positive

RESPONSE FORMAT (JSON only):
{
  "sentiment": "positive" | "negative" | "neutral" | "question" | "educational" | "celebration",
  "tags": ["recipe", "health", "environment", etc.],
  "isAntiVegan": true/false,
  "antiVeganReason": "explanation if isAntiVegan is true",
  "shouldBlock": true/false,
  "reasoning": "brief explanation of analysis"
}

ALWAYS respond with valid JSON only, no other text.`

// Rate limiting: max 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(userId)

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }) // 1 minute
    return true
  }

  if (limit.count >= 10) {
    return false
  }

  limit.count++
  return true
}

async function analyzeWithGPT(content: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Analyze this post:\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error('GPT analysis failed')
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    return result
  } catch (error) {
    console.error('Error analyzing with GPT:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Get user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before analyzing again.' },
        { status: 429 }
      )
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured, using fallback analysis')

      // Fallback to simple rule-based analysis
      const lowerContent = content.toLowerCase()
      const isPositive = ['love', 'amazing', 'great', 'awesome', 'happy'].some(w => lowerContent.includes(w))
      const hasQuestion = content.includes('?') || lowerContent.includes('how') || lowerContent.includes('what')

      return NextResponse.json({
        sentiment: hasQuestion ? 'question' : (isPositive ? 'positive' : 'neutral'),
        tags: [],
        isAntiVegan: false,
        shouldBlock: false,
        reasoning: 'Fallback analysis (OpenAI not configured)',
        fallback: true
      })
    }

    // Analyze with GPT
    const analysis = await analyzeWithGPT(content)

    // Log analysis for monitoring
    console.log('Content analysis:', {
      userId: session.user.id,
      contentLength: content.length,
      sentiment: analysis.sentiment,
      isAntiVegan: analysis.isAntiVegan,
      shouldBlock: analysis.shouldBlock
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error in content analysis:', error)

    // Return neutral fallback if API fails
    return NextResponse.json({
      sentiment: 'neutral',
      tags: [],
      isAntiVegan: false,
      shouldBlock: false,
      reasoning: 'Analysis unavailable',
      error: true
    })
  }
}
