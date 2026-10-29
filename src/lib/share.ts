// One way to share a PlantsPack link, the same on the web and in the apps
// (mobileapp/src/lib/share.ts): the phone's own share sheet when the browser
// has one (navigator.share), otherwise a short list of link targets.
// Repost (share inside PlantsPack) is a separate button: post_reposts.
//
// Instagram takes photos and stories only, not links, so it is not a target.

export function shareText(title?: string | null, body?: string | null): string {
  const t = (title || '').trim()
  if (t) return t
  const b = (body || '').replace(/\s+/g, ' ').trim()
  return b.length > 120 ? `${b.slice(0, 117).trimEnd()}...` : b
}

export interface ShareTarget {
  key: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'linkedin' | 'email'
  label: string
  href: string
}

export function shareTargets(url: string, text: string): ShareTarget[] {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(text)
  const tu = encodeURIComponent(text ? `${text}\n${url}` : url)
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${tu}` },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'x', label: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${tu}` },
  ]
}

// Absolute URL for a site path (works on the server and in the browser).
export function absoluteUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.plantspack.com'
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
