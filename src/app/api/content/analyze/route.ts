import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are a content moderation system for PlantsPack, a vegan social media platform focused on positive community building.

PRIORITY ORDER (Most important to least):

1️⃣ HIGHEST PRIORITY - ALWAYS ALLOW Personal Transformation Stories:
   - Stories that START with non-vegan past but END with vegan-positive present = ALWAYS ALLOW
   - Past tense references to animal products in a journey context = ALLOW
   - Examples:
     ✅ "I used to love meat but now I'm vegan and feel amazing"
     ✅ "I hated vegans before, but after learning more I became one"
     ✅ "I ate dairy for years, going vegan was my best decision"
     ✅ "I used to think vegans were extreme, now I understand"

   KEY: If the post reflects PERSONAL GROWTH ending in vegan-positive, ALLOW it regardless of past-tense negative words.

2️⃣ SECOND PRIORITY - Block Current/Present Promotion of Animal Products:
   - PRESENT tense celebration of animal products = BLOCK
   - Examples:
     ❌ "I love meat" (present tense, no context)
     ❌ "Bacon is the best" (celebration)
     ❌ "Going to eat steak tonight" (current action)

   BUT if context shows this is a QUOTE from the past in a transformation story, ALLOW:
     ✅ "I used to say 'I love meat' but now I realize..."

3️⃣ THIRD PRIORITY - Block Hate Speech:
   - PRESENT tense hate against any group = BLOCK
   - Examples:
     ❌ "I hate vegans" (present tense hate)
     ❌ "Meat eaters are stupid" (attacking others)

   BUT if this describes PAST beliefs in a growth story, ALLOW:
     ✅ "I used to hate vegans, but now I am one and I get it"

ANALYSIS APPROACH:
1. First, check if this is a PERSONAL JOURNEY/TRANSFORMATION story
   - Look for: "used to", "before", "was", "had", "thought", "believed" + vegan-positive ending
   - If YES → ALLOW (even if it mentions negative past behaviors/attitudes)

2. If NOT a personal journey, check PRESENT TENSE:
   - Is it promoting animal products NOW? → BLOCK
   - Is it expressing hate NOW? → BLOCK
   - Is it asking questions or being educational? → ALLOW

CLEAR EXAMPLES:

Personal Journey (ALLOW):
✅ "I used to love meat but now I'm vegan" - transformation story
✅ "I hated vegans before but I learned better" - personal growth
✅ "I thought vegans were crazy until I became one" - journey
✅ "I ate meat for 30 years before going vegan" - reflection

Current Promotion (BLOCK):
❌ "I love meat" - present celebration
❌ "Cheese is amazing" - promoting dairy
❌ "Going hunting this weekend" - current action

Current Hate (BLOCK):
❌ "I hate vegans" - present hate
❌ "Meat eaters are idiots" - attacking group

Questions & Education (ALLOW):
✅ "Why do people eat meat?" - genuine question
✅ "What are protein sources?" - educational
✅ "How did you transition?" - seeking help

RESPONSE FORMAT (JSON only):
{
  "sentiment": "positive" | "negative" | "neutral" | "question" | "educational" | "transformation",
  "tags": ["recipe", "health", "environment", "personal-journey", etc.],
  "isAntiVegan": true/false,
  "antiVeganReason": "explanation if isAntiVegan is true",
  "shouldBlock": true/false,
  "reasoning": "brief explanation emphasizing whether this is a transformation story or current promotion"
}

CRITICAL: Transformation stories with past negative experiences ending vegan-positive should have "sentiment": "transformation" or "positive" and "shouldBlock": false.

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

    // IP-based rate limiting (First line of defense)
    const clientIp = getClientIp(request)
    const ipRateLimit = rateLimit({
      identifier: `content-analysis-ip:${clientIp}`,
      limit: 30, // Max 30 requests per minute per IP
      windowMs: 60 * 1000
    })

    if (!ipRateLimit.success) {
      console.warn(`[SECURITY] IP rate limit exceeded: ${clientIp}`)
      return NextResponse.json(
        {
          error: 'Too many requests from this IP. Please try again later.',
          resetIn: Math.ceil(ipRateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    // Get user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // User-based rate limiting (Second line of defense)
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

    // Log analysis for monitoring and cost tracking
    console.log('[OPENAI_USAGE] Content analysis:', {
      userId: session.user.id,
      userEmail: session.user.email,
      clientIp,
      contentLength: content.length,
      sentiment: analysis.sentiment,
      isAntiVegan: analysis.isAntiVegan,
      shouldBlock: analysis.shouldBlock,
      estimatedCost: 0.00015,
      timestamp: new Date().toISOString()
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
