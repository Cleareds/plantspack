'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlogHeading } from '@/lib/blog-renderer'

interface Props {
  headings: BlogHeading[]
}

/**
 * Sticky in-article section navigation for long blog posts.
 * Shows the h2 headings as horizontally scrolling pills, highlights the section
 * currently in view (IntersectionObserver on the h2 elements the renderer
 * wrote ids onto), and keeps the active pill scrolled into view on small
 * screens. Renders nothing for short posts (< 3 sections).
 */
export default function BlogSectionNav({ headings }: Props) {
  const sections = headings.filter((h) => h.depth === 2)
  const [active, setActive] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (sections.length < 3) return
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el)
    if (els.length === 0) return

    // Track which heading was most recently scrolled past the top band of the
    // viewport. Simpler and steadier than "largest visible ratio" for long
    // sections that fill several screens.
    const update = () => {
      const line = 140 // px below viewport top; matches scroll-margin-top in CSS
      let current: string | null = els[0].id
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) current = el.id
        else break
      }
      setActive(current)
    }
    update()
    const io = new IntersectionObserver(update, { rootMargin: '-140px 0px -60% 0px', threshold: [0, 1] })
    els.forEach((el) => io.observe(el))
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', update)
    }
    // sections derives from a server prop; its identity is stable per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings])

  // Keep the active pill visible inside the horizontally scrolling bar.
  useEffect(() => {
    if (!active || !barRef.current) return
    const pill = barRef.current.querySelector<HTMLElement>(`[data-id="${active}"]`)
    pill?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  if (sections.length < 3) return null

  return (
    <nav
      aria-label="Article sections"
      className="sticky top-16 z-30 -mx-4 md:-mx-6 mb-8 bg-surface/85 backdrop-blur-lg border-b border-outline-variant/15"
    >
      <div ref={barRef} className="flex gap-2 overflow-x-auto px-4 md:px-6 py-2.5 scrollbar-none">
        {sections.map((s) => {
          const isActive = s.id === active
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-id={s.id}
              aria-current={isActive ? 'location' : undefined}
              className={[
                'flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              ].join(' ')}
            >
              {s.text}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
