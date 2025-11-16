/**
 * Content Moderation Utilities
 * Uses OpenAI Moderation API to check for sensitive content
 */

export interface ModerationResult {
  flagged: boolean
  warnings: string[]
  categories?: Record<string, boolean>
  categoryScores?: Record<string, number>
  recommendation?: 'allow' | 'content_warning' | 'block'
}

/**
 * Check content for sensitive material
 * @param content Text content to check
 * @param imageUrl Optional image URL to check
 * @returns Moderation result
 */
export async function moderateContent(
  content: string,
  imageUrl?: string
): Promise<ModerationResult> {
  try {
    const response = await fetch('/api/moderation/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        imageUrl,
      }),
    })

    if (!response.ok) {
      throw new Error('Moderation check failed')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error moderating content:', error)
    // Fail open - allow content if moderation service is unavailable
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
  // Define high-risk categories that should be blocked
  const blockCategories = ['violence/graphic', 'self-harm', 'sexual/minors']

  if (!result.categories) return false

  return blockCategories.some(category => result.categories?.[category])
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
