'use client'

import React from 'react'

interface LinkifiedTextProps {
  text: string
  className?: string
}

export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g

  const linkifyText = (text: string) => {
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (!part) return null
      
      // Check if this part is a URL
      if (urlRegex.test(part)) {
        let url = part
        
        // Add protocol if missing
        if (!url.startsWith('http')) {
          url = `https://${url}`
        }
        
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            {part}
          </a>
        )
      }
      
      return <span key={index}>{part}</span>
    }).filter(Boolean)
  }

  return (
    <span className={className}>
      {linkifyText(text)}
    </span>
  )
}