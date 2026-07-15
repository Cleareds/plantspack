'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

// Curated rotating placeholders. Each teaches the user what kind of query
// the search engine handles well: cuisine + city, place name + city,
// type of venue + city. Updated cycle is 3s; pauses while the input is
// focused so the user isn't distracted while typing.
const PLACEHOLDERS = [
  'Find vegan ramen in Tokyo',
  'Bakery in Berlin',
  'Bodhi Leuven',
  '100% vegan Barcelona',
  'écru Rome',
  'Vegan sushi Lisbon',
  'Fully vegan ice cream Paris',
  'Sanctuary near me',
]

export default function HeroSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [phIndex, setPhIndex] = useState(0)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (focused) return
    const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [focused])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative mx-auto max-w-2xl"
      role="search"
      aria-label="Search Plants Pack"
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant" />
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={PLACEHOLDERS[phIndex]}
        className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-surface-container-low ghost-border text-base text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
        aria-label="Search vegan places, cities, recipes"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Search
      </button>
    </form>
  )
}
