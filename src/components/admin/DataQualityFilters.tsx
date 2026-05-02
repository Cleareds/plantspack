'use client'

import { useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const VEGAN_LEVELS = [
  { value: '', label: 'All levels' },
  { value: 'fully_vegan', label: '100% Vegan' },
  { value: 'mostly_vegan', label: 'Mostly' },
  { value: 'vegan_friendly', label: 'Friendly' },
  { value: 'vegan_options', label: 'Options' },
]

const VERIFICATIONS = [
  { value: '', label: 'Any' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'verified', label: '✓ Verified only' },
]

const FLAGS = [
  { key: 'no_website', label: 'No website' },
  { key: 'no_image', label: 'No image' },
  { key: 'thin_desc', label: 'Thin description' },
  { key: 'audit_flagged', label: 'Audit-flagged' },  // any place whose admin_notes begins with "audit-"
  { key: 'suspect_fv', label: 'Suspect fully-vegan' },  // fully_vegan + ai_verified, no admin sign-off
]

export default function DataQualityFilters() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const set = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(sp?.toString() || '')
    if (!value) params.delete(key); else params.set(key, value)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }, [sp, router, pathname])
  const vl = sp?.get('vl') || ''
  const verif = sp?.get('verif') || ''
  const flag = sp?.get('flag') || ''
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-surface-container-low">
      <span className="text-xs text-on-surface-variant font-medium">Filter:</span>
      <div className="flex gap-1">
        {VEGAN_LEVELS.map(l => (
          <button key={l.value} onClick={() => set('vl', l.value || null)}
            className={`px-2 py-1 rounded text-[11px] font-medium ${vl === l.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container hover:bg-surface-container-high'}`}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="w-px h-5 bg-outline-variant/40" />
      <div className="flex gap-1">
        {VERIFICATIONS.map(v => (
          <button key={v.value} onClick={() => set('verif', v.value || null)}
            className={`px-2 py-1 rounded text-[11px] font-medium ${verif === v.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container hover:bg-surface-container-high'}`}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="w-px h-5 bg-outline-variant/40" />
      <div className="flex gap-1">
        {FLAGS.map(f => (
          <button key={f.key} onClick={() => set('flag', flag === f.key ? null : f.key)}
            className={`px-2 py-1 rounded text-[11px] font-medium ${flag === f.key ? 'bg-amber-500 text-white' : 'bg-surface-container hover:bg-surface-container-high'}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
