'use client'

import { useAuth } from '@/lib/auth'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import { Bell, Lock, Globe, Trash2, Ban, VolumeX, User, Download, Shield, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfileSettingsPage() {
  const params = useParams()
  const username = params.username as string
  const { user, profile, authReady } = useAuth()
  const router = useRouter()

  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [mutedUsers, setMutedUsers] = useState<any[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(true)
  const [loadingMuted, setLoadingMuted] = useState(true)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [savingNotifications, setSavingNotifications] = useState(false)

  useEffect(() => {
    if (authReady && !user) {
      router.push('/auth')
    }

    // Check if viewing own profile
    if (authReady && profile && profile.username !== username) {
      router.push(`/profile/${username}`)
    }
  }, [user, profile, authReady, router, username])

  // Fetch blocked users
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) {
        setLoadingBlocked(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_blocks')
          .select(`
            *,
            blocked_user:users!user_blocks_blocked_id_fkey (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('blocker_id', user.id)

        if (error) throw error
        setBlockedUsers(data || [])
      } catch (error) {
        console.error('Error fetching blocked users:', error)
      } finally {
        setLoadingBlocked(false)
      }
    }

    fetchBlockedUsers()
  }, [user])

  // Fetch muted users
  useEffect(() => {
    const fetchMutedUsers = async () => {
      if (!user) {
        setLoadingMuted(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_mutes')
          .select(`
            *,
            muted_user:users!user_mutes_muted_id_fkey (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('muter_id', user.id)

        if (error) throw error
        setMutedUsers(data || [])
      } catch (error) {
        console.error('Error fetching muted users:', error)
      } finally {
        setLoadingMuted(false)
      }
    }

    fetchMutedUsers()
  }, [user])

  // Fetch notification preferences
  useEffect(() => {
    const fetchNotificationPrefs = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error

        // If preferences exist, check if all notification types are enabled
        if (data) {
          const allEnabled = data.likes && data.comments && data.follows && data.mentions
          setNotificationsEnabled(allEnabled)
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error)
      }
    }

    fetchNotificationPrefs()
  }, [user])

  const handleUnblock = async (userId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)

      if (error) throw error

      // Remove from state
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== userId))
    } catch (error) {
      console.error('Error unblocking user:', error)
      alert('Failed to unblock user')
    }
  }

  const handleUnmute = async (userId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_mutes')
        .delete()
        .eq('muter_id', user.id)
        .eq('muted_id', userId)

      if (error) throw error

      // Remove from state
      setMutedUsers(prev => prev.filter(m => m.muted_id !== userId))
    } catch (error) {
      console.error('Error unmuting user:', error)
      alert('Failed to unmute user')
    }
  }

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return

    setSavingNotifications(true)
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          likes: enabled,
          comments: enabled,
          follows: enabled,
          mentions: enabled
        })

      if (error) throw error

      setNotificationsEnabled(enabled)
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      alert('Failed to update notification preferences')
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/account/export')

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plantspack_data_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('Your data has been exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deletePassword) {
      alert('Please enter your password to confirm deletion')
      return
    }

    const finalConfirm = confirm(
      'Are you absolutely sure? This action CANNOT be undone. All your posts, comments, and data will be permanently deleted.'
    )

    if (!finalConfirm) return

    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <ProfileSidebar username={username} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account settings and preferences.
            </p>
          </div>

          <div className="space-y-6">
            {/* Notifications Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Enable Notifications</p>
                    <p className="text-sm text-gray-500">
                      Get notified about likes, comments, follows, and mentions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationsEnabled}
                      onChange={(e) => handleToggleNotifications(e.target.checked)}
                      disabled={savingNotifications}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <a
                    href={`/profile/${username}/notifications`}
                    className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    Advanced notification settings
                  </a>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Privacy</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Private Profile</p>
                    <p className="text-sm text-gray-500">Only followers can see your posts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Show Activity Status</p>
                    <p className="text-sm text-gray-500">Let others see when you&apos;re online</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Globe className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Language & Region</h2>
              </div>

              <div className="space-y-4">
                {/* Translation Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">ℹ️ Note:</span> PlantsPack currently works only in English.
                    Multi-language support is in progress and will be available soon.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled
                  >
                    <option>English</option>
                    <option disabled>Ukrainian (Coming Soon)</option>
                    <option disabled>Spanish (Coming Soon)</option>
                    <option disabled>French (Coming Soon)</option>
                    <option disabled>German (Coming Soon)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Language selection will be enabled once translations are complete</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Zone
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option>UTC-08:00 Pacific Time (US & Canada)</option>
                    <option>UTC-05:00 Eastern Time (US & Canada)</option>
                    <option>UTC+00:00 London</option>
                    <option>UTC+01:00 Paris, Berlin</option>
                    <option>UTC+02:00 Kyiv, Athens, Istanbul</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Blocked & Muted Users */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Ban className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Blocked & Muted Users</h2>
              </div>

              <div className="space-y-6">
                {/* Blocked Users */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Blocked Users ({blockedUsers.length})</h3>
                  {loadingBlocked ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                      You haven&apos;t blocked anyone yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map((block) => (
                        <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {block.blocked_user?.avatar_url ? (
                              <img
                                src={block.blocked_user.avatar_url}
                                alt={block.blocked_user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {block.blocked_user?.first_name && block.blocked_user?.last_name
                                  ? `${block.blocked_user.first_name} ${block.blocked_user.last_name}`
                                  : block.blocked_user?.username}
                              </p>
                              <p className="text-sm text-gray-500">@{block.blocked_user?.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(block.blocked_id)}
                            className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Muted Users */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Muted Users ({mutedUsers.length})</h3>
                  {loadingMuted ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : mutedUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                      You haven&apos;t muted anyone yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mutedUsers.map((mute) => (
                        <div key={mute.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {mute.muted_user?.avatar_url ? (
                              <img
                                src={mute.muted_user.avatar_url}
                                alt={mute.muted_user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {mute.muted_user?.first_name && mute.muted_user?.last_name
                                  ? `${mute.muted_user.first_name} ${mute.muted_user.last_name}`
                                  : mute.muted_user?.username}
                              </p>
                              <p className="text-sm text-gray-500">@{mute.muted_user?.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnmute(mute.muted_id)}
                            className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Unmute
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GDPR & Privacy Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Privacy & Data</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">GDPR Compliance:</span> You have the right to access, export, and delete your personal data at any time.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Export Your Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Download all your data including posts, comments, likes, and profile information in JSON format.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export My Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Trash2 className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
              </div>

              <div className="space-y-4">
                {!showDeleteConfirm ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Once you delete your account, there is no going back. All your data will be permanently deleted.
                    </p>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                    >
                      Delete Account
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800 font-semibold mb-2">
                        ⚠️ Warning: This action is permanent and cannot be undone!
                      </p>
                      <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                        <li>All your posts will be soft-deleted</li>
                        <li>Your comments, likes, and interactions will be removed</li>
                        <li>Your profile will be anonymized</li>
                        <li>You will be logged out immediately</li>
                      </ul>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter your password to confirm deletion:
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeletePassword('')
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
