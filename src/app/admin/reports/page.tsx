'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Search,
  Flag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  XCircle,
  MessageSquare,
  FileText,
  User,
  MapPin
} from 'lucide-react'

interface Report {
  id: string
  reporter_id: string
  reported_type: string
  reported_id: string
  reason: string
  description: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  resolution: string | null
  admin_notes: string | null
  created_at: string
  users: {
    username: string
  }
}

const REPORTS_PER_PAGE = 20

export default function ReportsManagement() {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [totalReports, setTotalReports] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolution, setResolution] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadReports()
  }, [currentPage, searchQuery, filterStatus, filterType])

  const loadReports = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select('*, users!reports_reporter_id_fkey(username)', { count: 'exact' })

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%`)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (filterType !== 'all') {
        query = query.eq('reported_type', filterType)
      }

      const from = (currentPage - 1) * REPORTS_PER_PAGE
      const to = from + REPORTS_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      setReports(data as any || [])
      setTotalReports(count || 0)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          resolution: resolution || null,
          admin_notes: adminNotes || null
        })
        .eq('id', reportId)

      if (error) throw error

      loadReports()
      setSelectedReport(null)
      setResolution('')
      setAdminNotes('')
    } catch (error) {
      console.error('Error updating report:', error)
      alert('Failed to update report')
    }
  }

  const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Flag className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
      case 'reviewing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Eye className="h-3 w-3 mr-1" />
            Reviewing
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </span>
        )
      case 'dismissed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Dismissed
          </span>
        )
      default:
        return null
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="h-4 w-4" />
      case 'comment':
        return <MessageSquare className="h-4 w-4" />
      case 'user':
        return <User className="h-4 w-4" />
      case 'place':
        return <MapPin className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-orange-100 text-orange-800',
      harassment: 'bg-red-100 text-red-800',
      hate_speech: 'bg-red-100 text-red-800',
      violence: 'bg-red-100 text-red-800',
      misinformation: 'bg-yellow-100 text-yellow-800',
      nsfw: 'bg-purple-100 text-purple-800',
      off_topic: 'bg-blue-100 text-blue-800',
      copyright: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[reason] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports Moderation</h1>
        <p className="text-gray-600 mt-1">Review and moderate user reports</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description or reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="user">Users</option>
              <option value="place">Places</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {reports.length} of {totalReports} reports
          </p>
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(report.reported_type)}
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {report.reported_type}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getReasonBadge(report.reason)}`}>
                      {report.reason.replace('_', ' ')}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Reported by {report.users?.username || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {report.description && (
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {report.description}
                  </p>
                </div>
              )}

              {report.resolution && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-medium text-green-900 mb-1">Resolution:</p>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">
                    {report.resolution}
                  </p>
                </div>
              )}

              {report.admin_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Notes:</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {report.admin_notes}
                  </p>
                </div>
              )}

              {selectedReport?.id === report.id ? (
                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution
                    </label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Describe what action was taken..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Add internal notes..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Resolve Report
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(null)
                        setResolution('')
                        setAdminNotes('')
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 pt-3 border-t">
                  <button
                    onClick={() => {
                      const urls: Record<string, string> = {
                        post: `/post/${report.reported_id}`,
                        comment: `/post/${report.reported_id}`,
                        user: `/user/${report.reported_id}`,
                        place: `/places`
                      }
                      window.open(urls[report.reported_type] || '/', '_blank')
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Content
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReport(report)
                      setResolution(report.resolution || '')
                      setAdminNotes(report.admin_notes || '')
                    }}
                    disabled={report.status === 'resolved' || report.status === 'dismissed'}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                  >
                    Review Report
                  </button>
                  {report.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'reviewing')}
                      className="inline-flex items-center px-3 py-1.5 border border-yellow-300 rounded-md text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                    >
                      Mark Reviewing
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  )
}
