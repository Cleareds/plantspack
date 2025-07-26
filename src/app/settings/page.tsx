'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Save, User, Mail } from 'lucide-react'
import SimpleAvatarUpload from '@/components/ui/SimpleAvatarUpload'
import FollowingList from '@/components/profile/FollowingList'

export default function SettingsPage() {
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  
  const { user, profile, updateProfile, authReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authReady) {
      return
    }

    if (!user) {
      router.push('/auth')
      return
    }

    // Always update data when profile changes, not just on first load
    if (profile) {
      setUsername(profile.username || '')
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || null)
      setInitialDataLoaded(true)
    } else if (user && !initialDataLoaded) {
      // Fallback to user metadata if profile isn't loaded yet
      const metadata = user.user_metadata
      setUsername(metadata?.username || '')
      setFirstName(metadata?.first_name || '')
      setLastName(metadata?.last_name || '')
      setBio('') // Bio won't be in metadata
      setAvatarUrl(null)
      setInitialDataLoaded(true)
    }
  }, [user, profile, authReady, router, initialDataLoaded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const result = await updateProfile({
      username,
      first_name: firstName,
      last_name: lastName,
      bio,
    })

    if (result.error) {
      console.error('Profile update error:', result.error)
      setMessage(`Error updating profile: ${result.error.message || 'Please try again.'}`)
    } else {
      setMessage('Profile updated successfully!')
    }
    
    setSaving(false)
  }

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl)
    setMessage('Avatar updated successfully!')
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }


  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.includes('Error') 
              ? 'bg-red-100 border border-red-400 text-red-700'
              : 'bg-green-100 border border-green-400 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              <SimpleAvatarUpload
                currentAvatar={avatarUrl}
                onAvatarUpdate={handleAvatarUpdate}
              />
              <div className="text-sm text-gray-600">
                <p>Click to upload a new profile picture</p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 2MB. Image will be cropped to 500x500 pixels.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Tell others about yourself and your vegan journey..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
        </div>

        {/* Following List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <FollowingList />
        </div>
      </div>
    </div>
  )
}