'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, FileText, MessageSquare, MapPin, Flag, Mail, TrendingUp, AlertCircle } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalPosts: number
  totalComments: number
  totalPlaces: number
  pendingReports: number
  pendingContacts: number
  todayUsers: number
  todayPosts: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalPlaces: 0,
    pendingReports: 0,
    pendingContacts: 0,
    todayUsers: 0,
    todayPosts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get all stats in parallel
      const [
        { count: totalUsers },
        { count: totalPosts },
        { count: totalComments },
        { count: totalPlaces },
        { count: pendingReports },
        { count: pendingContacts },
        { count: todayUsers },
        { count: todayPosts },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('places').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      ])

      setStats({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalComments: totalComments || 0,
        totalPlaces: totalPlaces || 0,
        pendingReports: pendingReports || 0,
        pendingContacts: pendingContacts || 0,
        todayUsers: todayUsers || 0,
        todayPosts: todayPosts || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      change: `+${stats.todayUsers} today`,
    },
    {
      name: 'Total Posts',
      value: stats.totalPosts,
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-100',
      change: `+${stats.todayPosts} today`,
    },
    {
      name: 'Total Comments',
      value: stats.totalComments,
      icon: MessageSquare,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      name: 'Total Places',
      value: stats.totalPlaces,
      icon: MapPin,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      name: 'Pending Reports',
      value: stats.pendingReports,
      icon: Flag,
      color: 'text-red-600',
      bg: 'bg-red-100',
      alert: stats.pendingReports > 0,
    },
    {
      name: 'Pending Contacts',
      value: stats.pendingContacts,
      icon: Mail,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      alert: stats.pendingContacts > 0,
    },
  ]

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                  {stat.change && (
                    <p className="mt-1 text-sm text-gray-500 flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{stat.change}</span>
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              {stat.alert && (
                <div className="mt-4 flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Requires attention</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/reports"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors text-center"
          >
            <Flag className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <span className="text-sm font-medium">Review Reports</span>
            {stats.pendingReports > 0 && (
              <span className="block mt-1 text-xs text-red-600">
                {stats.pendingReports} pending
              </span>
            )}
          </a>
          <a
            href="/admin/contact"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors text-center"
          >
            <Mail className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <span className="text-sm font-medium">Contact Forms</span>
            {stats.pendingContacts > 0 && (
              <span className="block mt-1 text-xs text-yellow-600">
                {stats.pendingContacts} pending
              </span>
            )}
          </a>
          <a
            href="/admin/users"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors text-center"
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <span className="text-sm font-medium">Manage Users</span>
          </a>
          <a
            href="/admin/posts"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors text-center"
          >
            <FileText className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <span className="text-sm font-medium">Manage Posts</span>
          </a>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Health</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database Connection</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Healthy
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Moderation Queue</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              stats.pendingReports > 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {stats.pendingReports > 10 ? 'Needs Attention' : 'Under Control'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">User Growth (Today)</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              +{stats.todayUsers} users
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
