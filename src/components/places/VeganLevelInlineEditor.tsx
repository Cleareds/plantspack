'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

type VeganLevel = 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'

const LABELS: Record<VeganLevel, { text: string; cls: string }> = {
  fully_vegan:    { text: '🌿 100% Vegan',        cls: 'bg-emerald-100 text-emerald-700' },
  mostly_vegan:   { text: '🌿 Mostly Vegan',      cls: 'bg-teal-100 text-teal-700' },
  vegan_friendly: { text: '🌿 Vegan-Friendly',    cls: 'bg-amber-100 text-amber-700' },
  vegan_options:  { text: '🌿 Has Vegan Options', cls: 'bg-stone-100 text-stone-600' },
}

interface Props {
  placeId: string
  initialLevel: VeganLevel | string | null
}

export default function VeganLevelInlineEditor({ placeId, initialLevel }: Props) {
  const { profile } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [level, setLevel] = useState<VeganLevel>((initialLevel as VeganLevel) || 'vegan_friendly')

  const isAdmin = (profile as any)?.role === 'admin'
  if (!isAdmin) {
    const lab = LABELS[level]
    return lab ? <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${lab.cls}`}>{lab.text}</span> : null
  }

  const save = async (next: VeganLevel) => {
    if (next === level) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vegan_level: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to update vegan level')
        return
      }
      setLevel(next)
      setEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    const lab = LABELS[level]
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Admin: change vegan level"
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${lab?.cls ?? 'bg-stone-100 text-stone-600'} hover:opacity-80 transition-opacity`}
      >
        {lab?.text ?? 'Set vegan level'}
        <Pencil className="h-3 w-3 opacity-60" />
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <select
        autoFocus
        disabled={saving}
        value={level}
        onChange={(e) => save(e.target.value as VeganLevel)}
        className="px-2 py-1 rounded-full text-xs font-bold bg-surface-container-low ghost-border focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        <option value="fully_vegan">100% Vegan</option>
        <option value="mostly_vegan">Mostly Vegan</option>
        <option value="vegan_friendly">Vegan-Friendly</option>
        <option value="vegan_options">Has Vegan Options</option>
      </select>
      {saving ? (
        <Check className="h-4 w-4 text-emerald-600 animate-pulse" />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </span>
  )
}
