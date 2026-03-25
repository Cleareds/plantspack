'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { PackCategory, PackWithStats } from '@/types/packs'
import SimpleAvatarUpload from '@/components/ui/SimpleAvatarUpload'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [pack, setPack] = useState<PackWithStats | null>(null)

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

  const categories: { value: PackCategory; label: string; icon: string }[] = [
    { value: 'recipes', label: 'Recipes', icon: '🍽️' },
    { value: 'places', label: 'Places', icon: '📍' },
    { value: 'traveling', label: 'Travel Guides', icon: '✈️' },
    { value: 'meal-prep', label: 'Meal Prep', icon: '🥗' },
    { value: 'products', label: 'Products', icon: '🛍️' },
    { value: 'activism', label: 'Activism', icon: '✊' },
    { value: 'lifestyle', label: 'Lifestyle', icon: '🌱' },
    { value: 'other', label: 'Other', icon: '📦' }
  ]

  const toggleCategory = (value: PackCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter(c => c !== value)
        : [...prev.categories, value]
    }))
  }

  useEffect(() => {
    const fetchPack = async () => {
      try {
        const response = await fetch(`/api/packs/${id}`)
        const data = await response.json()

        if (response.ok) {
          setPack(data.pack)
          setFormData({
            title: data.pack.title,
            description: data.pack.description || '',
            banner_url: data.pack.banner_url || '',
            website_url: data.pack.website_url || '',
            facebook_url: data.pack.facebook_url || '',
            twitter_url: data.pack.twitter_url || '',
            instagram_url: data.pack.instagram_url || '',
            tiktok_url: data.pack.tiktok_url || '',
            categories: data.pack.categories || (data.pack.category ? [data.pack.category] : [])
          })
        } else {
          router.push('/packs')
        }
      } catch (error) {
        console.error('Error fetching pack:', error)
        router.push('/packs')
      } finally {
        setLoading(false)
      }
    }

    fetchPack()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/packs/${id}`, {
        method: 'PATCH',
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
        router.push(`/packs/${id}`)
      } else {
        setError(data.error || 'Failed to update pack')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this pack? This action cannot be undone.')) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/packs/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/packs')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete pack')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p className="text-on-surface-variant">Loading pack...</p>
        </div>
      </div>
    )
  }

  if (!pack || pack.user_role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant mb-4">You don&apos;t have permission to edit this pack</p>
          <Link
            href={`/packs/${id}`}
            className="inline-block silk-gradient hover:opacity-90 text-on-primary px-6 py-2 rounded-md font-medium"
          >
            Back to Pack
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
            href={`/packs/${id}`}
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Pack</span>
          </Link>
          <h1 className="text-3xl font-bold text-on-surface">Edit Pack</h1>
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
              className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
              className="w-full px-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Categories (multi-select) */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Categories</label>
            <p className="text-sm text-outline mb-3">Select one or more categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    formData.categories.includes(cat.value)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Banner Image</label>
            <SimpleAvatarUpload
              currentAvatar={formData.banner_url}
              onAvatarUpdate={(url) => setFormData({ ...formData, banner_url: url })}
            />
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-medium text-on-surface-variant mb-3">Social Links</h3>
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

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-error hover:opacity-90 font-medium disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleting ? 'Deleting...' : 'Delete Pack'}</span>
            </button>

            <div className="flex gap-3">
              <Link
                href={`/packs/${id}`}
                className="px-6 py-2 ghost-border rounded-md font-medium text-on-surface-variant hover:bg-surface-container-low"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary px-6 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
