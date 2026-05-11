'use client'

import { RefObject } from 'react'
import { Bold, Italic, Heading2, Heading3 } from 'lucide-react'
import EmojiPickerButton from './EmojiPickerButton'

interface EditorToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
  className?: string
}

type Wrap = { before: string; after: string }
type LinePrefix = { prefix: string }

// Lightweight markdown toolbar for the post composer. Inserts conventional
// markers around the current selection (bold/italic) or at the start of the
// current line (h2/h3). Pairs with LinkifiedText's inline-markdown renderer.
export default function EditorToolbar({
  textareaRef,
  value,
  onChange,
  className = '',
}: EditorToolbarProps) {
  const applyWrap = ({ before, after }: Wrap) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      // If the user had a selection, leave it covering the wrapped text so
      // they can immediately un-wrap. Otherwise, place the caret between
      // the markers.
      const newStart = selected ? start + before.length : start + before.length
      const newEnd = selected ? end + before.length : start + before.length
      textareaRef.current.selectionStart = newStart
      textareaRef.current.selectionEnd = newEnd
      textareaRef.current.focus()
    })
  }

  const applyLinePrefix = ({ prefix }: LinePrefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? 0
    // Find the beginning of the current line.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const rest = value.slice(lineStart)
    // If the line already starts with the same prefix, strip it (toggle).
    if (rest.startsWith(prefix)) {
      const next = value.slice(0, lineStart) + rest.slice(prefix.length)
      onChange(next)
      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        const newPos = Math.max(lineStart, start - prefix.length)
        textareaRef.current.selectionStart = newPos
        textareaRef.current.selectionEnd = newPos
        textareaRef.current.focus()
      })
      return
    }
    // Strip any *other* heading prefix on this line before applying the new one.
    let stripped = rest
    for (const p of ['### ', '## ']) {
      if (stripped.startsWith(p)) {
        stripped = stripped.slice(p.length)
        break
      }
    }
    const next = value.slice(0, lineStart) + prefix + stripped
    onChange(next)
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      const delta = (prefix.length) - (rest.length - stripped.length)
      const newPos = start + delta
      textareaRef.current.selectionStart = newPos
      textareaRef.current.selectionEnd = newPos
      textareaRef.current.focus()
    })
  }

  const btnClass =
    'flex items-center justify-center rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors'

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      // preventDefault on mousedown keeps the textarea focused so the
      // selection survives the toolbar click.
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => applyWrap({ before: '**', after: '**' })}
        className={btnClass}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyWrap({ before: '*', after: '*' })}
        className={btnClass}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyLinePrefix({ prefix: '## ' })}
        className={btnClass}
        title="Heading 2"
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => applyLinePrefix({ prefix: '### ' })}
        className={btnClass}
        title="Heading 3"
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>
      <span className="mx-1 h-4 w-px bg-outline-variant/40" aria-hidden />
      <EmojiPickerButton
        textareaRef={textareaRef}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
