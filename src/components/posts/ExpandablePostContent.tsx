'use client'

import { useState, useMemo } from 'react'
import LinkifiedText from '../ui/LinkifiedText'

interface Props {
  text: string
  className?: string
  /** Max paragraphs to show before "Show more" appears. Default 2. */
  maxParagraphs?: number
  /** Char fallback for single-paragraph long posts. Default 400. */
  maxChars?: number
}

/**
 * Truncates a post body to the first N paragraphs (or a char fallback for
 * single-paragraph long posts) and shows a "Show more" / "Show less" toggle
 * inline so readers can expand without leaving the feed.
 */
export default function ExpandablePostContent({
  text,
  className = '',
  maxParagraphs = 2,
  maxChars = 400,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const { preview, isTruncated } = useMemo(() => {
    if (!text) return { preview: '', isTruncated: false }
    // Paragraphs split on blank lines. \r\n\r\n on Windows-typed input.
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

    if (paragraphs.length > maxParagraphs) {
      return { preview: paragraphs.slice(0, maxParagraphs).join('\n\n'), isTruncated: true }
    }
    // Single (or few) paragraphs — fall back to char-length truncation if
    // the post is still too long, cutting at the last whitespace before
    // maxChars to avoid mid-word breaks.
    if (text.length > maxChars) {
      const cut = text.slice(0, maxChars)
      const lastSpace = cut.lastIndexOf(' ')
      const safe = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut
      return { preview: safe.trim() + '…', isTruncated: true }
    }
    return { preview: text, isTruncated: false }
  }, [text, maxParagraphs, maxChars])

  const display = expanded ? text : preview

  return (
    <>
      <LinkifiedText text={display} className={className} />
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  )
}
