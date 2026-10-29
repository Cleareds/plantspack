'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2, Link as LinkIcon, Check, Mail, Send, MessageCircle } from 'lucide-react'
import { Facebook, Twitter } from '@/components/ui/BrandIcons'
import { shareTargets, absoluteUrl, type ShareTarget } from '@/lib/share'
import { track as trackEvent } from '@/lib/analytics'

const ICONS: Record<ShareTarget['key'], React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4 text-green-600" />,
  telegram: <Send className="h-4 w-4 text-sky-500" />,
  facebook: <Facebook className="h-4 w-4 text-blue-600" />,
  x: <Twitter className="h-4 w-4" />,
  linkedin: <span className="h-4 w-4 text-[11px] font-bold leading-4 text-center text-blue-700">in</span>,
  email: <Mail className="h-4 w-4 text-on-surface-variant" />,
}

// Share button for posts, places, events and recipes. Phones get the system
// share sheet; desktop browsers get Copy link + the usual link targets.
export default function ShareMenu({
  path, text, label = 'Share', className = '', labelClassName = 'text-sm hidden sm:inline', kind = 'post', placement = 'up',
}: {
  path: string
  text: string
  label?: string | null
  className?: string
  labelClassName?: string
  kind?: string
  // 'up' for action bars at the bottom of a card, 'down' for page headers.
  placement?: 'up' | 'down'
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const url = absoluteUrl(path)

  const onClick = async () => {
    // Touch devices: the system sheet (WhatsApp, Messages, Instagram DMs...).
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    if (touch && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text || 'PlantsPack', text: text || undefined, url })
        track(kind, 'native')
      } catch { /* cancelled */ }
      return
    }
    setOpen((v) => !v)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      track(kind, 'copy')
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className || 'flex items-center space-x-1 px-2 py-1 rounded-md text-on-surface-variant hover:text-primary transition-colors'}
      >
        <Share2 className={className ? 'h-4 w-4' : 'h-5 w-5'} />
        {label && <span className={labelClassName}>{label}</span>}
      </button>
      {open && (
        <div role="menu" className={`absolute right-0 ${placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} z-40 w-52 rounded-xl bg-surface-container-lowest shadow-lg ring-1 ring-outline-variant/30 py-1`}>
          <button role="menuitem" type="button" onClick={copy} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4 text-on-surface-variant" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          {shareTargets(url, text).map((t) => (
            <a
              key={t.key}
              role="menuitem"
              href={t.href}
              target={t.key === 'email' ? undefined : '_blank'}
              rel="noopener noreferrer"
              onClick={() => { track(kind, t.key); setOpen(false) }}
              className="flex items-center gap-3 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low"
            >
              {ICONS[t.key]}
              {t.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// Same event name as the apps ("shared").
function track(kind: string, target: string) {
  trackEvent('shared', { kind, target })
}
