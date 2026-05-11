'use client'

import React from 'react'
import Link from 'next/link'

interface LinkifiedTextProps {
  text: string
  className?: string
}

// Inline regex catches hashtags, mentions, URLs, and **bold** / *italic*.
// Order in the alternation matters: bold (**) must come before italic (*) so
// the longer match wins.
const INLINE_REGEX = /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|(#[a-zA-Z0-9_-]{2,50}\b)|(@[a-zA-Z0-9_.]{2,30}\b)|(https?:\/\/[^\s]+)/g

function renderInline(text: string, lineKey: string): React.ReactNode[] {
  if (!text) return []
  const out: React.ReactNode[] = []
  let lastIndex = 0
  let segIdx = 0
  let match: RegExpExecArray | null
  INLINE_REGEX.lastIndex = 0
  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        <span key={`${lineKey}-t-${segIdx++}`}>{text.substring(lastIndex, match.index)}</span>
      )
    }
    if (match[1]) {
      // **bold**
      out.push(
        <strong key={`${lineKey}-b-${segIdx++}`} className="font-semibold">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      // *italic*
      out.push(
        <em key={`${lineKey}-i-${segIdx++}`} className="italic">
          {match[4]}
        </em>
      )
    } else if (match[5]) {
      const tag = match[5].substring(1)
      out.push(
        <Link
          key={`${lineKey}-h-${segIdx++}`}
          href={`/hashtag/${tag.toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:text-primary hover:underline font-medium"
        >
          {match[5]}
        </Link>
      )
    } else if (match[6]) {
      const username = match[6].substring(1)
      out.push(
        <Link
          key={`${lineKey}-m-${segIdx++}`}
          href={`/profile/${username.toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
        >
          {match[6]}
        </Link>
      )
    } else if (match[7]) {
      out.push(
        <a
          key={`${lineKey}-u-${segIdx++}`}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 hover:underline break-all"
        >
          {match[7]}
        </a>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    out.push(<span key={`${lineKey}-t-${segIdx++}`}>{text.substring(lastIndex)}</span>)
  }
  return out
}

// Block-level renderer: splits on newlines and emits headings for lines
// starting with `## ` / `### `. Other lines become inline spans separated
// by <br /> so the original whitespace-pre-wrap behaviour is preserved.
export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  if (!text) return null
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  lines.forEach((line, idx) => {
    const key = `l-${idx}`
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key} className="text-xl font-semibold mt-3 mb-2">
          {renderInline(line.slice(3), key)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key} className="text-lg font-semibold mt-2 mb-1">
          {renderInline(line.slice(4), key)}
        </h3>
      )
    } else {
      blocks.push(
        <React.Fragment key={key}>
          {renderInline(line, key)}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      )
    }
  })
  return <span className={className}>{blocks}</span>
}
