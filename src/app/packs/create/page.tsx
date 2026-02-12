'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { PackCategory } from '@/types/packs'
import SimpleAvatarUpload from '@/components/ui/SimpleAvatarUpload'
import { ArrowLeft, Loader2, Crown } from 'lucide-react'
import Link from 'next/link'

export default function CreatePackPage() {
  const { user, profile } = useAuth()
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
    { value: 'traveling', label: 'Traveling', icon: '✈️', description: 'Travel guides, vegan restaurants, places' },
    { value: 'products', label: 'Products', icon: '🛍️', description: 'Product reviews and recommendations' },
    { value: 'resources', label: 'Resources', icon: '📚', description: 'Educational content and guides' },
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to create a pack</p>
          <Link
            href="/auth"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Check if user is on free tier
  const subscriptionTier = (profile as any)?.subscription_tier
  const isFreeTier = !subscriptionTier || subscriptionTier === 'free'

  if (isFreeTier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
            <p className="text-gray-600 mb-6">
              Creating packs is available for Mid and Premium tier subscribers. Upgrade your account to start curating amazing content collections!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/support"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                <Crown className="h-5 w-5" />
                <span>View Plans</span>
              </Link>
              <Link
                href="/packs"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-md font-medium transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Packs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/packs"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Packs</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create a Pack</h1>
          <p className="text-gray-600 mt-2">
            Curate a collection of vegan posts around a theme
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              maxLength={100}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Best Vegan Desserts"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">{formData.title.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this pack is about..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">{formData.description.length}/500</p>
          </div>

          {/* Categories (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categories
            </label>
            <p className="text-sm text-gray-500 mb-3">Select one or more categories</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    formData.categories.includes(cat.value)
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{cat.label}</div>
                      <div className="text-sm text-gray-600">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image
            </label>
            <SimpleAvatarUpload
              currentAvatar={formData.banner_url}
              onAvatarUpdate={(url) => setFormData({ ...formData, banner_url: url })}
            />
            <p className="text-sm text-gray-500 mt-1">Recommended: 1200x400px</p>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Social Links (Optional)</h3>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="Website URL"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Facebook URL"
                value={formData.facebook_url}
                onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Twitter/X URL"
                value={formData.twitter_url}
                onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="Instagram URL"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="url"
                placeholder="TikTok URL"
                value={formData.tiktok_url}
                onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>


          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Pack'}</span>
            </button>
            <Link
              href="/packs"
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
