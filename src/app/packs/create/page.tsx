'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { PackCategory } from '@/types/packs'
import SimpleAvatarUpload from '@/components/ui/SimpleAvatarUpload'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreatePackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    banner_url: '',
    website_url: '',
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    tiktok_url: '',
    categories: [] as PackCategory[]
  })

  const categories: { value: PackCategory; label: string; icon: string; description: string }[] = [
    { value: 'recipes', label: 'Recipes', icon: '🍽️', description: 'Collections of vegan recipes' },
    { value: 'places', label: 'Places', icon: '📍', description: 'Curated vegan restaurants, shops, stays' },
    { value: 'traveling', label: 'Travel Guides', icon: '✈️', description: 'City guides and travel itineraries' },
    { value: 'meal-prep', label: 'Meal Prep', icon: '🥗', description: 'Meal prep plans and batch cooking' },
    { value: 'products', label: 'Products', icon: '🛍️', description: 'Product reviews and recommendations' },
    { value: 'activism', label: 'Activism', icon: '✊', description: 'Activism resources and campaigns' },
    { value: 'lifestyle', label: 'Lifestyle', icon: '🌱', description: 'Lifestyle tips and inspiration' },
    { value: 'other', label: 'Other', icon: '📦', description: 'Other types of content' }
  ]

  const toggleCategory = (value: PackCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter(c => c !== value)
        : [...prev.categories, value]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          categories: formData.categories
        })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/packs/${data.pack.id}`)
      } else {
        setError(data.error || 'Failed to create pack')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">Please sign in to create a pack</p>
          <Link
            href="/auth"
            className="inline-block silk-gradient hover:opacity-90 text-on-primary px-6 py-2 rounded-md font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-container-low py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/packs"
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Packs</span>
          </Link>
          <h1 className="text-3xl font-bold text-on-surface">Create a Pack</h1>
          <p className="text-on-surface-variant mt-2">
            Curate a collection of vegan posts around a theme
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-on-surface-variant mb-2">
              Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Best Vegan Desserts"
              className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-sm text-outline mt-1">{formData.title.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-on-surface-variant mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this pack is about..."
              className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-sm text-outline mt-1">{formData.description.length}/500</p>
          </div>

          {/* Categories (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Categories
            </label>
            <p className="text-sm text-outline mb-3">Select one or more categories</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.categories.includes(cat.value)
                      ? 'border-primary bg-surface-container-low'
                      : 'border-outline-variant/15 hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="font-medium text-on-surface">{cat.label}</div>
                      <div className="text-sm text-on-surface-variant">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Banner Image
            </label>
            <SimpleAvatarUpload
              currentAvatar={formData.banner_url}
              onAvatarUpdate={(url) => setFormData({ ...formData, banner_url: url })}
            />
            <p className="text-sm text-outline mt-1">Recommended: 1200x400px</p>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-medium text-on-surface-variant mb-3">Social Links (Optional)</h3>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="Website URL"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Facebook URL"
                value={formData.facebook_url}
                onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Twitter/X URL"
                value={formData.twitter_url}
                onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Instagram URL"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="url"
                placeholder="TikTok URL"
                value={formData.tiktok_url}
                onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>


          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 silk-gradient hover:opacity-90 text-on-primary px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Pack'}</span>
            </button>
            <Link
              href="/packs"
              className="px-6 py-3 ghost-border rounded-md font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
