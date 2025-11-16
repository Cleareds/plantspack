'use client'

import React from 'react'
import Link from 'next/link'

interface LinkifiedTextProps {
  text: string
  className?: string
}

export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  if (!text) return null

  const parseText = () => {
    const segments: React.ReactNode[] = []

    // Combined regex for hashtags, mentions, and URLs
    const combinedRegex = /(#[a-zA-Z0-9_]{2,50}\b)|(@[a-zA-Z0-9_]{2,30}\b)|(https?:\/\/[^\s]+)/g

    let lastIndex = 0
    let match
    let segmentIndex = 0

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        segments.push(
          <span key={`text-${segmentIndex++}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        )
      }

      // Add the match (hashtag, mention, or URL)
      if (match[1]) {
        // Hashtag
        const tag = match[1].substring(1) // Remove #
        segments.push(
          <Link
            key={`hashtag-${segmentIndex++}`}
            href={`/hashtag/${tag.toLowerCase()}`}
            onClick={(e) => e.stopPropagation()}
            className="text-green-600 hover:text-green-700 hover:underline font-medium"
          >
            {match[1]}
          </Link>
        )
      } else if (match[2]) {
        // Mention
        const username = match[2].substring(1) // Remove @
        segments.push(
          <Link
            key={`mention-${segmentIndex++}`}
            href={`/user/${username.toLowerCase()}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
          >
            {match[2]}
          </Link>
        )
      } else if (match[3]) {
        // URL
        segments.push(
          <a
            key={`url-${segmentIndex++}`}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            {match[3]}
          </a>
        )
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(
        <span key={`text-${segmentIndex++}`}>
          {text.substring(lastIndex)}
        </span>
      )
    }

    return segments
  }

  return (
    <span className={className}>
      {parseText()}
    </span>
  )
}