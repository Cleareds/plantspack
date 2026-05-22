'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, ChevronDown } from 'lucide-react'

export const COMMON_ALLERGENS = [
  'gluten',
  'soy',
  'nuts',
  'peanuts',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'sulphites',
  'corn',
  'nightshades',
  'coconut',
] as const

const ALLERGEN_LABEL: Record<string, string> = {
  gluten: 'Gluten / wheat',
  soy: 'Soy',
  nuts: 'Tree nuts',
  peanuts: 'Peanuts',
  sesame: 'Sesame',
  mustard: 'Mustard',
  celery: 'Celery',
  lupin: 'Lupin',
  sulphites: 'Sulphites',
  corn: 'Corn',
  nightshades: 'Nightshades',
  coconut: 'Coconut',
}

export default function AllergenSelector({
  value,
  onChange,
  savedRemote,
  onPersist,
  compact = false,
}: {
  value: string[]
  onChange: (next: string[]) => void
  savedRemote?: boolean
  onPersist?: (next: string[]) => Promise<void>
  compact?: boolean
}) {
  const [customText, setCustomText] = useState('')
  const [open, setOpen] = useState(!compact)
  const [saving, setSaving] = useState(false)

  // Custom field shows everything not in the common set.
  useEffect(() => {
    const custom = value.filter((v) => !COMMON_ALLERGENS.includes(v as (typeof COMMON_ALLERGENS)[number]))
    setCustomText(custom.join(', '))
  }, [value])

  function toggleCommon(key: string) {
    const next = value.includes(key) ? value.filter((v) => v !== key) : [...value, key]
    onChange(next)
  }

  function commitCustom(text: string) {
    const custom = text
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !COMMON_ALLERGENS.includes(s as (typeof COMMON_ALLERGENS)[number]))
    const commons = value.filter((v) => COMMON_ALLERGENS.includes(v as (typeof COMMON_ALLERGENS)[number]))
    onChange([...commons, ...custom])
  }

  async function persistNow() {
    if (!onPersist) return
    setSaving(true)
    try {
      await onPersist(value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl ghost-border bg-surface-container-lowest overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-on-surface">
          <ShieldAlert className="h-4 w-4 text-on-surface-variant" />
          <span className="font-semibold text-sm">Allergies &amp; intolerances</span>
          {value.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              {value.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-4 pt-0 border-t border-on-surface/10">
          <div className="flex flex-wrap gap-2 mb-3 mt-3">
            {COMMON_ALLERGENS.map((key) => {
              const active = value.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleCommon(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    active
                      ? 'bg-primary text-on-primary'
                      : 'ghost-border bg-surface text-on-surface hover:border-primary/30'
                  }`}
                >
                  {ALLERGEN_LABEL[key]}
                </button>
              )
            })}
          </div>

          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Other (comma-separated)</label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onBlur={(e) => commitCustom(e.target.value)}
            placeholder="shellfish, kiwi, garlic"
            className="w-full px-3 py-2 rounded-lg ghost-border bg-surface text-on-surface text-sm focus:outline-none focus:border-primary"
          />

          {onPersist && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-on-surface-variant">
                {savedRemote ? 'Saved to your profile' : 'Saved on this device only'}
              </span>
              <button
                onClick={persistNow}
                disabled={saving}
                className="px-3 py-1.5 rounded-full ghost-border bg-surface text-on-surface text-xs font-semibold hover:border-primary/30 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save to profile'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
