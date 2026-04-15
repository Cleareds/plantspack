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
  const [resendingEmail, setResendingEmail] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

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

  const handleResendConfirmation = async () => {
    if (!user?.email) return

    setResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (error) throw error

      alert('Confirmation email sent! Please check your inbox.')
    } catch (error) {
      console.error('Error resending confirmation email:', error)
      alert('Failed to resend confirmation email. Please try again.')
    } finally {
      setResendingEmail(false)
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

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long'
    if (!/[A-Z]/.test(pwd)) return 'Must contain at least one uppercase letter'
    if (!/[a-z]/.test(pwd)) return 'Must contain at least one lowercase letter'
    if (!/[0-9]/.test(pwd)) return 'Must contain at least one number'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Must contain at least one special character'
    return null
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    const validationError = validatePassword(newPassword)
    if (validationError) {
      setPasswordError(validationError)
      return
    }

    setPasswordLoading(true)
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('Current password is incorrect')
        setPasswordLoading(false)
        return
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPasswordMessage('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading...</p>
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
            <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
            <p className="text-on-surface-variant mt-1">
              Manage your account settings and preferences.
            </p>
          </div>

          {/* Email Verification Banner */}
          {user && !user.email_confirmed_at && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                ⚠️ Please verify your email address. Check your inbox for a confirmation link.
                <button
                  onClick={handleResendConfirmation}
                  disabled={resendingEmail}
                  className="ml-2 underline hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingEmail ? 'Sending...' : 'Resend confirmation email'}
                </button>
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Notifications Settings */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Notifications</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">Enable Notifications</p>
                    <p className="text-sm text-outline">
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
                    <div className="w-11 h-6 bg-surface-container peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-outline-variant/15">
                  <a
                    href={`/profile/${username}/notifications`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    Advanced notification settings
                  </a>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Change Password</h2>
              </div>

              {passwordMessage && (
                <div className="mb-4 p-3 rounded bg-surface-container-low border border-primary/15 text-primary text-sm">
                  {passwordMessage}
                </div>
              )}
              {passwordError && (
                <div className="mb-4 p-3 rounded bg-error/5 border border-error/15 text-error text-sm">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-outline mt-1">
                    Min 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex items-center gap-2 silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary-btn font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>{passwordLoading ? 'Changing...' : 'Change Password'}</span>
                  </button>
                  <a
                    href="/auth/reset-password"
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Forgot current password?
                  </a>
                </div>
              </form>
            </div>

            {/* Privacy Settings */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Privacy</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-on-surface">Private Profile</p>
                    <p className="text-sm text-outline">Only followers can see your posts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-container peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-on-surface">Show Activity Status</p>
                    <p className="text-sm text-outline">Let others see when you&apos;re online</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-surface-container peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Language & Region</h2>
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
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Language
                  </label>
                  <select
                    className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                    disabled
                  >
                    <option>English</option>
                    <option disabled>Ukrainian (Coming Soon)</option>
                    <option disabled>Spanish (Coming Soon)</option>
                    <option disabled>French (Coming Soon)</option>
                    <option disabled>German (Coming Soon)</option>
                  </select>
                  <p className="text-xs text-outline mt-1">Language selection will be enabled once translations are complete</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Time Zone
                  </label>
                  <select
                    disabled
                    className="w-full px-4 py-2 ghost-border rounded-md bg-surface-container-low cursor-not-allowed opacity-60"
                  >
                    <option>UTC-08:00 Pacific Time (US & Canada)</option>
                    <option>UTC-05:00 Eastern Time (US & Canada)</option>
                    <option>UTC+00:00 London</option>
                    <option>UTC+01:00 Paris, Berlin</option>
                    <option>UTC+02:00 Kyiv, Athens, Istanbul</option>
                  </select>
                  <p className="text-xs text-outline mt-1">Timezone selection coming soon</p>
                </div>
              </div>
            </div>

            {/* Blocked & Muted Users */}
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Ban className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Blocked & Muted Users</h2>
              </div>

              <div className="space-y-6">
                {/* Blocked Users */}
                <div>
                  <h3 className="text-sm font-medium text-on-surface mb-3">Blocked Users ({blockedUsers.length})</h3>
                  {loadingBlocked ? (
                    <div className="text-sm text-outline">Loading...</div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="text-sm text-outline bg-surface-container-low rounded-lg p-4">
                      You haven&apos;t blocked anyone yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map((block) => (
                        <div key={block.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                          <div className="flex items-center space-x-3">
                            {block.blocked_user?.avatar_url ? (
                              <img
                                src={block.blocked_user.avatar_url}
                                alt={block.blocked_user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-surface-container flex items-center justify-center">
                                <User className="h-5 w-5 text-outline" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-on-surface">
                                {block.blocked_user?.first_name && block.blocked_user?.last_name
                                  ? `${block.blocked_user.first_name} ${block.blocked_user.last_name}`
                                  : block.blocked_user?.username}
                              </p>
                              <p className="text-sm text-outline">@{block.blocked_user?.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(block.blocked_id)}
                            className="px-3 py-1 text-sm font-medium text-error hover:text-error hover:bg-error/5 rounded-md transition-colors"
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
                  <h3 className="text-sm font-medium text-on-surface mb-3">Muted Users ({mutedUsers.length})</h3>
                  {loadingMuted ? (
                    <div className="text-sm text-outline">Loading...</div>
                  ) : mutedUsers.length === 0 ? (
                    <div className="text-sm text-outline bg-surface-container-low rounded-lg p-4">
                      You haven&apos;t muted anyone yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mutedUsers.map((mute) => (
                        <div key={mute.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                          <div className="flex items-center space-x-3">
                            {mute.muted_user?.avatar_url ? (
                              <img
                                src={mute.muted_user.avatar_url}
                                alt={mute.muted_user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-surface-container flex items-center justify-center">
                                <User className="h-5 w-5 text-outline" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-on-surface">
                                {mute.muted_user?.first_name && mute.muted_user?.last_name
                                  ? `${mute.muted_user.first_name} ${mute.muted_user.last_name}`
                                  : mute.muted_user?.username}
                              </p>
                              <p className="text-sm text-outline">@{mute.muted_user?.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnmute(mute.muted_id)}
                            className="px-3 py-1 text-sm font-medium text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container rounded-md transition-colors"
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
            <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-on-surface">Privacy & Data</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">GDPR Compliance:</span> You have the right to access, export, and delete your personal data at any time.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-on-surface mb-2">Export Your Data</h3>
                  <p className="text-sm text-on-surface-variant mb-3">
                    Download all your data including posts, comments, likes, and profile information in JSON format.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={exporting}
                    className="inline-flex items-center px-4 py-2 border border-primary/15 rounded-md text-sm font-medium text-primary bg-surface-container-low hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export My Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow-sm border border-error/15 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Trash2 className="h-5 w-5 text-error" />
                <h2 className="text-lg font-semibold text-error">Danger Zone</h2>
              </div>

              <div className="space-y-4">
                {!showDeleteConfirm ? (
                  <div>
                    <p className="text-sm text-on-surface-variant mb-3">
                      Once you delete your account, there is no going back. All your data will be permanently deleted.
                    </p>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-error hover:opacity-90 text-white rounded-md font-medium transition-colors"
                    >
                      Delete Account
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div className="bg-error/5 border border-error/15 rounded-lg p-4">
                      <p className="text-sm text-error font-semibold mb-2">
                        ⚠️ Warning: This action is permanent and cannot be undone!
                      </p>
                      <ul className="text-sm text-error/80 space-y-1 list-disc list-inside">
                        <li>All your posts will be soft-deleted</li>
                        <li>Your comments, likes, and interactions will be removed</li>
                        <li>Your profile will be anonymized</li>
                        <li>You will be logged out immediately</li>
                      </ul>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">
                        Enter your password to confirm deletion:
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        required
                        className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-error/40 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={deleting}
                        className="px-4 py-2 bg-error hover:opacity-90 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeletePassword('')
                        }}
                        className="px-4 py-2 ghost-border rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low"
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
