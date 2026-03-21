'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PostCategory } from '@/lib/database.types'

const ALL_CATEGORIES: { slug: PostCategory; icon: string; label: string; description: string; color: string }[] = [
  { slug: 'recipe', icon: 'restaurant_menu', label: 'Recipes', description: 'Plant-based recipes and cooking tips', color: '#0a6a1d' },
  { slug: 'place', icon: 'location_on', label: 'Places', description: 'Vegan-friendly restaurants, cafes, and spots', color: '#72554b' },
  { slug: 'event', icon: 'event', label: 'Events', description: 'Vegan meetups, festivals, and happenings', color: '#a83206' },
  { slug: 'lifestyle', icon: 'self_improvement', label: 'Lifestyle', description: 'Plant-based living tips and wellness', color: '#0a6a1d' },
  { slug: 'activism', icon: 'campaign', label: 'Activism', description: 'Advocacy, awareness, and animal rights', color: '#a83206' },
  { slug: 'question', icon: 'help', label: 'Questions', description: 'Ask the community for help and advice', color: '#72554b' },
  { slug: 'product', icon: 'shopping_bag', label: 'Products', description: 'Vegan product reviews and recommendations', color: '#72554b' },
  { slug: 'general', icon: 'article', label: 'General', description: 'Everything else in the plant-based world', color: '#767773' },
]

const DEFAULT_CATEGORIES = ['recipe', 'place', 'event']

export default function EditFeedPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(DEFAULT_CATEGORIES)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    async function loadPreferences() {
      if (!user) return
      const { data } = await supabase
        .from('user_preferences')
        .select('feed_categories')
        .eq('user_id', user.id)
        .single()
      if (data?.feed_categories?.length) {
        setSelected(data.feed_categories)
      }
    }
    loadPreferences()
  }, [user])

  const toggleCategory = (slug: string) => {
    setSelected(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
  }

  const handleSave = async () => {
    if (!user || selected.length === 0) return
    setSaving(true)
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          feed_categories: selected,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      router.push('/')
    } catch (err) {
      console.error('Error saving preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Sign in to customize your feed</p>
          <Link href="/auth" className="silk-gradient text-on-primary-btn px-6 py-3 rounded-xl font-medium">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Back to Feed
          </Link>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">Edit Your Feed</h1>
          <p className="text-on-surface-variant mt-2">Choose the categories you want to see in your feed. Select at least one.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ALL_CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.slug)
            return (
              <button
                key={cat.slug}
                onClick={() => toggleCategory(cat.slug)}
                className={`p-5 rounded-2xl text-left transition-all ${
                  isSelected
                    ? 'bg-surface-container-lowest ring-2 ring-primary editorial-shadow'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{cat.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-on-surface text-sm">{cat.label}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{cat.description}</p>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>check_circle</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            {selected.length} categor{selected.length === 1 ? 'y' : 'ies'} selected
          </p>
          <button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="silk-gradient text-on-primary-btn px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
