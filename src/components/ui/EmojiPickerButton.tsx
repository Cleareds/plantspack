'use client'

import { useEffect, useRef, useState, RefObject } from 'react'
import dynamic from 'next/dynamic'
import { Smile } from 'lucide-react'

// Dynamic import keeps the ~150KB picker out of the initial bundle.
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiPickerButtonProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  className?: string
}

// Floating emoji-picker trigger. Inserts the picked emoji at the textarea's
// caret position (not the end), keeps the keyboard open on mobile by
// preventing the default mousedown blur, and closes on outside-click + Escape.
export default function EmojiPickerButton({
  textareaRef,
  value,
  onChange,
  className = '',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange(value + emoji)
      return
    }
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    const next = value.slice(0, start) + emoji + value.slice(end)
    onChange(next)
    // Restore caret after React commits the new value.
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      const pos = start + emoji.length
      textareaRef.current.selectionStart = pos
      textareaRef.current.selectionEnd = pos
      textareaRef.current.focus()
    })
  }

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        // preventDefault on mousedown prevents the textarea from losing focus
        // (and on mobile, prevents the keyboard from dismissing).
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
        title="Insert emoji"
        aria-label="Insert emoji"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-0">
          <EmojiPicker
            onEmojiClick={(data) => insertEmoji(data.emoji)}
            lazyLoadEmojis
            width={320}
            height={400}
          />
        </div>
      )}
    </div>
  )
}
