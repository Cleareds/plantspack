/**
 * Content Moderation Utilities
 * Uses OpenAI Moderation API to check for sensitive content
 * Also checks for anti-vegan content specific to this vegan platform
 */

export interface ModerationResult {
  flagged: boolean
  warnings: string[]
  categories?: Record<string, boolean>
  categoryScores?: Record<string, number>
  recommendation?: 'allow' | 'content_warning' | 'block'
  antiVeganContent?: boolean
  antiVeganMatches?: string[]
}

/**
 * Anti-vegan keywords and phrases that should be blocked or flagged
 * These patterns detect content promoting or celebrating animal products
 */
const ANTI_VEGAN_PATTERNS = {
  // Direct mentions of eating/liking animal products
  directMeat: [
    /\b(eat|ate|eating|love|loved|loving|like|liked|liking|enjoy|enjoyed|enjoying|craving|crave|craved|miss|missed|missing|want|wanted|wanting)\s+(some\s+)?(meat|beef|pork|chicken|lamb|veal|steak|bacon|ham|sausage|turkey|duck|fish|seafood|shrimp|lobster|crab|salmon|tuna)\b/gi,
    /\b(meat|beef|pork|chicken|lamb|veal|steak|bacon|ham|sausage|turkey|duck|fish|seafood|shrimp|lobster|crab|salmon|tuna)\s+(is|was|tastes?|taste)\s+(good|great|amazing|delicious|tasty|yummy|the best)\b/gi,
    /\b(had|have|got)\s+(some\s+)?(meat|beef|pork|chicken|lamb|veal|steak|bacon|ham|sausage|turkey|duck|fish|seafood|shrimp|lobster|crab|salmon|tuna)\b/gi,
  ],

  // Dairy and eggs
  dairy: [
    /\b(eat|ate|eating|love|loved|loving|like|liked|liking|enjoy|enjoyed|enjoying|drink|drank|drinking|miss|missed|missing)\s+(some\s+)?(milk|cheese|butter|cream|yogurt|eggs?|dairy)\b/gi,
    /\b(milk|cheese|butter|cream|yogurt|eggs?|dairy)\s+(is|was|tastes?|taste)\s+(good|great|amazing|delicious|tasty|yummy|the best)\b/gi,
    /\breal\s+(milk|cheese|butter|cream|yogurt|eggs?|dairy)\b/gi,
  ],

  // Anti-vegan statements
  antiVeganStatements: [
    /\bvegan(s|ism)?\s+(is|are|was|were)\s+(bad|wrong|unhealthy|stupid|dumb|annoying|extreme)\b/gi,
    /\b(hate|dislike|don't like)\s+vegan(s|ism)?\b/gi,
    /\bvegan(s)?\s+(are|is)\s+(pushy|preachy|annoying|cult)\b/gi,
    /\b(can't|cannot)\s+be\s+vegan\b/gi,
    /\bvegan(ism)?\s+(doesn't|does not|won't)\s+work\b/gi,
  ],

  // Animal exploitation celebration
  animalExploitation: [
    /\b(went|going|went to)\s+(hunting|fishing)\b/gi,
    /\b(killed|shot|caught)\s+(a|an|some|the)?\s*(deer|fish|duck|turkey|rabbit|animal)\b/gi,
    /\bfur\s+(coat|jacket|clothing)\s+(is|looks|feels)\b/gi,
  ],

  // Common typos/variations - treat these as meat references
  meatTypos: [
    /\b(eat|ate|eating|love|loved|loving|like|liked|liking|enjoy|enjoyed|enjoying|craving|crave|craved|miss|missed|missing|want|wanted|wanting)\s+meet\b/gi, // "meet" instead of "meat"
    /\b(love|like|enjoy|miss)\s+(stake|baccon|checken)\b/gi, // common misspellings
  ]
}

/**
 * Check if content contains anti-vegan material
 * @param content Text content to check
 * @returns Object with detection results
 */
export function detectAntiVeganContent(content: string): {
  detected: boolean
  matches: string[]
  severity: 'none' | 'low' | 'medium' | 'high'
} {
  const matches: string[] = []
  const lowerContent = content.toLowerCase()

  // Check all pattern categories
  Object.entries(ANTI_VEGAN_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      const foundMatches = content.match(pattern)
      if (foundMatches && foundMatches.length > 0) {
        foundMatches.forEach(match => {
          if (!matches.includes(match)) {
            matches.push(match)
          }
        })
      }
    })
  })

  // Determine severity based on number and type of matches
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none'

  if (matches.length > 0) {
    // High severity: Direct anti-vegan statements or multiple violations
    if (matches.length >= 3 ||
        ANTI_VEGAN_PATTERNS.antiVeganStatements.some(p => content.match(p)) ||
        ANTI_VEGAN_PATTERNS.animalExploitation.some(p => content.match(p))) {
      severity = 'high'
    }
    // Medium severity: Direct meat/dairy consumption or meat typos
    else if (ANTI_VEGAN_PATTERNS.directMeat.some(p => content.match(p)) ||
             ANTI_VEGAN_PATTERNS.dairy.some(p => content.match(p)) ||
             ANTI_VEGAN_PATTERNS.meatTypos.some(p => content.match(p))) {
      severity = 'medium'
    }
    // Low severity: Possible typos or edge cases
    else {
      severity = 'low'
    }
  }

  return {
    detected: matches.length > 0,
    matches,
    severity
  }
}

/**
 * Check content for sensitive material
 * Combines OpenAI moderation API with platform-specific anti-vegan content detection
 * @param content Text content to check
 * @param imageUrl Optional image URL to check
 * @returns Moderation result
 */
export async function moderateContent(
  content: string,
  imageUrl?: string
): Promise<ModerationResult> {
  try {
    // First, check for anti-vegan content locally
    const antiVeganCheck = detectAntiVeganContent(content)

    // Then call the API for general moderation (OpenAI)
    const response = await fetch('/api/moderation/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        imageUrl,
        antiVeganDetection: antiVeganCheck, // Pass local detection to API
      }),
    })

    if (!response.ok) {
      throw new Error('Moderation check failed')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error moderating content:', error)
    // Even if API fails, we can still check anti-vegan content locally
    const antiVeganCheck = detectAntiVeganContent(content)

    if (antiVeganCheck.detected) {
      return {
        flagged: true,
        warnings: ['anti-vegan content'],
        recommendation: antiVeganCheck.severity === 'high' || antiVeganCheck.severity === 'medium' ? 'block' : 'content_warning',
        antiVeganContent: true,
        antiVeganMatches: antiVeganCheck.matches,
      }
    }

    // Fail open - allow content if moderation service is unavailable and no anti-vegan content
    return {
      flagged: false,
      warnings: [],
      recommendation: 'allow',
    }
  }
}

/**
 * Check if content should be blocked
 * @param result Moderation result
 * @returns True if content should be blocked
 */
export function shouldBlockContent(result: ModerationResult): boolean {
  // Block if recommendation is explicitly 'block'
  if (result.recommendation === 'block') {
    return true
  }

  // Define high-risk categories that should be blocked
  const blockCategories = ['violence/graphic', 'self-harm', 'sexual/minors']

  if (result.categories) {
    const hasBlockedCategory = blockCategories.some(category => result.categories?.[category])
    if (hasBlockedCategory) return true
  }

  // Block anti-vegan content (already handled by recommendation, but double-check)
  if (result.antiVeganContent) {
    return true
  }

  return false
}

/**
 * Get user-friendly warning message
 * @param warnings Array of warning categories
 * @returns User-friendly message
 */
export function getWarningMessage(warnings: string[]): string {
  if (warnings.length === 0) return ''

  if (warnings.length === 1) {
    return `This content may contain ${warnings[0]}.`
  }

  const last = warnings[warnings.length - 1]
  const others = warnings.slice(0, -1).join(', ')

  return `This content may contain ${others} and ${last}.`
}
