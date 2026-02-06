'use client'

import { useAuth } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import { Bell, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { NotificationPreferences } from '@/types/notifications'

export default function NotificationPreferencesPage() {
  const params = useParams()
  const username = params.username as string
  const { user, profile, authReady } = useAuth()
  const router = useRouter()

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authReady && !user) {
      router.push('/auth')
    }

    // Check if viewing own profile
    if (authReady && profile && profile.username !== username) {
      router.push(`/profile/${username}`)
    }
  }, [user, profile, authReady, router, username])

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          // Create default preferences if they don't exist
          const { data: newPrefs, error: insertError } = await supabase
            .from('notification_preferences')
            .insert({ user_id: user.id })
            .select()
            .single()

          if (insertError) throw insertError
          setPreferences(newPrefs)
        } else {
          setPreferences(data)
        }
      } catch (error) {
        console.error('Error fetching preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [user])

  const handleSave = async () => {
    if (!user || !preferences) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          likes: preferences.likes,
          comments: preferences.comments,
          follows: preferences.follows,
          mentions: preferences.mentions,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      alert('Notification preferences saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (!authReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !preferences) return null

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <ProfileSidebar username={username} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
            <p className="text-gray-600 mt-1">
              Manage how and when you receive notifications.
            </p>
          </div>

          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Likes</p>
                    <p className="text-sm text-gray-500">Get notified when someone likes your post</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.likes}
                      onChange={(e) => updatePreference('likes', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Comments</p>
                    <p className="text-sm text-gray-500">Get notified when someone comments on your post</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.comments}
                      onChange={(e) => updatePreference('comments', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">New Followers</p>
                    <p className="text-sm text-gray-500">Get notified when someone follows you</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.follows}
                      onChange={(e) => updatePreference('follows', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Mentions</p>
                    <p className="text-sm text-gray-500">Get notified when someone mentions you</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.mentions}
                      onChange={(e) => updatePreference('mentions', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
