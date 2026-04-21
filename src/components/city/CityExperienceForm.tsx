'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import StarRating from '@/components/places/StarRating'

export interface CityExperienceDraft {
  overall_rating: number
  eating_out_rating: number | null
  grocery_rating: number | null
  summary: string
  tips: string[]
  best_neighborhoods: string | null
  visited_period: string | null
}

interface CityExperienceFormProps {
  countrySlug: string
  citySlug: string
  cityName: string
  initial?: Partial<CityExperienceDraft>
  onSaved?: (wasUpdate: boolean) => void
  onCancel?: () => void
}

export default function CityExperienceForm({
  countrySlug, citySlug, cityName, initial, onSaved, onCancel,
}: CityExperienceFormProps) {
  const [overall, setOverall] = useState(initial?.overall_rating || 0)
  const [eatingOut, setEatingOut] = useState(initial?.eating_out_rating ?? 0)
  const [grocery, setGrocery] = useState(initial?.grocery_rating ?? 0)
  const [summary, setSummary] = useState(initial?.summary || '')
  const [tips, setTips] = useState<string[]>(initial?.tips || [])
  const [tipDraft, setTipDraft] = useState('')
  const [neighborhoods, setNeighborhoods] = useState(initial?.best_neighborhoods || '')
  const [visited, setVisited] = useState(initial?.visited_period || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = overall >= 1 && summary.trim().length >= 30 && !saving

  const addTip = () => {
    const t = tipDraft.trim().slice(0, 200)
    if (!t || tips.length >= 5) return
    setTips([...tips, t])
    setTipDraft('')
  }

  const removeTip = (i: number) => setTips(tips.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/cities/${countrySlug}/${citySlug}/experiences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_rating: overall,
          eating_out_rating: eatingOut > 0 ? eatingOut : null,
          grocery_rating: grocery > 0 ? grocery : null,
          summary: summary.trim(),
          tips,
          best_neighborhoods: neighborhoods.trim() || null,
          visited_period: visited.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || data?.error || 'Save failed')
      onSaved?.(Boolean(data?.updated))
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg ghost-border p-4 sm:p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-on-surface">Share your experience in {cityName}</h3>
        <p className="text-sm text-on-surface-variant mt-1">Help fellow vegans plan their trip. Be specific — what worked, what didn't.</p>
      </div>

      {/* Overall */}
      <div>
        <label className="text-sm font-medium text-on-surface">
          How vegan-friendly is this city? <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex items-center gap-3">
          <StarRating rating={overall} editable onChange={setOverall} size="lg" />
          <span className="text-sm text-on-surface-variant">
            {overall === 0 ? 'Tap to rate' : `${overall} / 5`}
          </span>
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-on-surface">Easy to find vegan food out?</label>
          <div className="mt-1 flex items-center gap-3">
            <StarRating rating={eatingOut} editable onChange={setEatingOut} size="md" />
            <span className="text-xs text-on-surface-variant">{eatingOut === 0 ? 'Optional' : `${eatingOut} / 5`}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface">Easy to find vegan groceries?</label>
          <div className="mt-1 flex items-center gap-3">
            <StarRating rating={grocery} editable onChange={setGrocery} size="md" />
            <span className="text-xs text-on-surface-variant">{grocery === 0 ? 'Optional' : `${grocery} / 5`}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-sm font-medium text-on-surface">
          Your experience <span className="text-red-500">*</span>
          <span className="text-xs text-on-surface-variant ml-1">(30–1200 chars)</span>
        </label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value.slice(0, 1200))}
          placeholder="I spent 3 weeks in this city. The central area has tons of fully-vegan cafés, especially around the Mitte district. Found it harder to eat in the suburbs. Groceries were easy at any Rewe or Bio Company."
          rows={5}
          className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="text-xs text-on-surface-variant text-right mt-1">{summary.length} / 1200</div>
      </div>

      {/* Tips */}
      <div>
        <label className="text-sm font-medium text-on-surface">
          Tips for fellow vegans <span className="text-xs text-on-surface-variant">(up to 5)</span>
        </label>
        <div className="mt-1 space-y-2">
          {tips.map((t, i) => (
            <div key={i} className="flex items-start gap-2 bg-emerald-50 text-emerald-900 rounded-lg px-3 py-2 text-sm">
              <span className="flex-1">{t}</span>
              <button onClick={() => removeTip(i)} className="text-emerald-700 hover:text-emerald-900" aria-label="Remove tip">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tips.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tipDraft}
                onChange={e => setTipDraft(e.target.value.slice(0, 200))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTip() } }}
                placeholder="e.g. Ask for 'vegano' at taco stands — most will drop the crema."
                className="flex-1 rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={addTip}
                disabled={!tipDraft.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-on-primary-btn text-sm font-medium disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-on-surface">Best neighborhoods <span className="text-xs text-on-surface-variant">(optional)</span></label>
          <input
            type="text"
            value={neighborhoods}
            onChange={e => setNeighborhoods(e.target.value.slice(0, 200))}
            placeholder="Mitte, Kreuzberg, Friedrichshain"
            className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface">When were you there?<span className="text-xs text-on-surface-variant ml-1">(optional)</span></label>
          <input
            type="text"
            value={visited}
            onChange={e => setVisited(e.target.value.slice(0, 80))}
            placeholder="Visited Mar 2026 / Lived 2 years"
            className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
            Cancel
          </button>
        )}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary-btn text-sm font-semibold disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Share experience
        </button>
      </div>
    </div>
  )
}
