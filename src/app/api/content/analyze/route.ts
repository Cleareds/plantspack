import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimit, checkRateLimit, getClientIp } from '@/lib/rate-limit-db'

const SYSTEM_PROMPT = `You are a content moderation system for PlantsPack, a vegan social media platform focused on positive community building.

⭐ CRITICAL: VEGAN/PLANT-BASED ALTERNATIVES ARE ALWAYS ALLOWED ⭐

ALWAYS ALLOW these vegan alternatives (they are NOT animal products):
✅ "vegan meat", "vegan cheese", "vegan milk", "vegan butter"
✅ "plant-based meat", "plant-based cheese", "plant-based dairy"
✅ "mock meat", "faux meat", "meat alternative", "dairy alternative"
✅ "seitan", "tofu", "tempeh", "nutritional yeast"
✅ "oat milk", "almond milk", "soy milk", "coconut milk"
✅ "cashew cheese", "vegan bacon", "beyond burger", "impossible burger"

IF the post mentions "vegan" or "plant-based" with ANY food term → ALWAYS ALLOW
Example: "Vegan meat is amazing!" = ALLOW (it's a vegan alternative)
Example: "I love plant-based cheese!" = ALLOW (it's vegan)

PRIORITY ORDER (Most important to least):

1️⃣ HIGHEST PRIORITY - ALWAYS ALLOW Vegan Alternatives:
   - ANY food prefixed with "vegan", "plant-based", "mock", "faux" = ALLOW
   - Examples:
     ✅ "Vegan meat is 100% better!"
     ✅ "I love vegan cheese"
     ✅ "Plant-based bacon is delicious"
     ✅ "This mock chicken is amazing"

2️⃣ SECOND PRIORITY - ALWAYS ALLOW Personal Transformation Stories:
   - Stories that START with non-vegan past but END with vegan-positive present = ALWAYS ALLOW
   - Past tense references to animal products in a journey context = ALLOW
   - Examples:
     ✅ "I used to love meat but now I'm vegan and feel amazing"
     ✅ "I hated vegans before, but after learning more I became one"
     ✅ "I ate dairy for years, going vegan was my best decision"
     ✅ "I used to think vegans were extreme, now I understand"

   KEY: If the post reflects PERSONAL GROWTH ending in vegan-positive, ALLOW it regardless of past-tense negative words.

3️⃣ THIRD PRIORITY - Block Current/Present Promotion of Animal Products:
   - PRESENT tense celebration of ACTUAL animal products = BLOCK
   - BUT CHECK: If it says "vegan X" or "plant-based X", it's ALLOWED
   - Examples:
     ❌ "I love meat" (real animal meat - BLOCK)
     ✅ "I love vegan meat" (plant-based - ALLOW)
     ❌ "Bacon is the best" (real bacon - BLOCK)
     ✅ "Vegan bacon is the best" (plant-based - ALLOW)
     ❌ "Going to eat steak tonight" (real steak - BLOCK)
     ✅ "Going to try a vegan steak" (plant-based - ALLOW)

   BUT if context shows this is a QUOTE from the past in a transformation story, ALLOW:
     ✅ "I used to say 'I love meat' but now I realize..."

4️⃣ FOURTH PRIORITY - Block Hate Speech:
   - PRESENT tense hate against any group = BLOCK
   - Examples:
     ❌ "I hate vegans" (present tense hate)
     ❌ "Meat eaters are stupid" (attacking others)

   BUT if this describes PAST beliefs in a growth story, ALLOW:
     ✅ "I used to hate vegans, but now I am one and I get it"

ANALYSIS APPROACH:
1. FIRST, check for vegan/plant-based keywords:
   - Does it mention "vegan", "plant-based", "mock", "faux" with food terms? → ALLOW
   - Examples: "vegan cheese", "plant-based meat", "mock chicken" → ALL ALLOWED

2. SECOND, check if this is a PERSONAL JOURNEY/TRANSFORMATION story:
   - Look for: "used to", "before", "was", "had", "thought", "believed" + vegan-positive ending
   - If YES → ALLOW (even if it mentions negative past behaviors/attitudes)

3. THIRD, check PRESENT TENSE (only if NOT vegan alternatives and NOT personal journey):
   - Is it promoting ACTUAL animal products NOW? → BLOCK
   - Is it expressing hate NOW? → BLOCK
   - Is it asking questions or being educational? → ALLOW

CLEAR EXAMPLES:

Vegan Alternatives (ALWAYS ALLOW - HIGHEST PRIORITY):
✅ "Vegan meat is 100% better!" - vegan alternative
✅ "I love vegan cheese" - plant-based alternative
✅ "Plant-based bacon is delicious" - vegan alternative
✅ "This mock chicken tastes great" - vegan alternative
✅ "Beyond burger is amazing" - vegan product
✅ "Cashew cheese is the best" - vegan alternative
✅ "Oat milk > dairy milk" - vegan alternative comparison

Personal Journey (ALLOW):
✅ "I used to love meat but now I'm vegan" - transformation story
✅ "I hated vegans before but I learned better" - personal growth
✅ "I thought vegans were crazy until I became one" - journey
✅ "I ate meat for 30 years before going vegan" - reflection

Current Promotion of ACTUAL Animal Products (BLOCK):
❌ "I love meat" - real animal meat, present celebration
❌ "Cheese is amazing" - real dairy, promoting animal products
❌ "Going hunting this weekend" - current harmful action
❌ "Bacon tastes the best" - real animal product celebration

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

CRITICAL REMINDERS:
- Vegan/plant-based alternatives (vegan meat, vegan cheese, etc.) should ALWAYS be "shouldBlock": false
- Transformation stories with past negative experiences ending vegan-positive should have "sentiment": "transformation" or "positive" and "shouldBlock": false
- When in doubt about "vegan X" or "plant-based X", ALWAYS ALLOW - these are vegan alternatives, not animal products

ALWAYS respond with valid JSON only, no other text.`

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
    const ipRateLimit = await rateLimit({
      identifier: `content-analysis-ip:${clientIp}`,
      action: 'content_analysis_ip',
      limit: 30, // Max 30 requests per minute
      windowSeconds: 60
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
    const userRateLimit = await checkRateLimit(
      session.user.id,
      'content_analysis_user',
      10, // Max 10 requests per minute
      60
    )

    if (!userRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment before analyzing again.',
          resetIn: Math.ceil(userRateLimit.resetIn / 1000)
        },
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
