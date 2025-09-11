'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Clock, User, Tag, MessageSquare, RefreshCw } from 'lucide-react'

interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
}

export default function ContactAdminPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved' | 'closed'>('all')

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: ContactSubmission['status']) => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === id ? { ...sub, status } : sub
      ))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Submissions</h1>
            <p className="text-gray-600 mt-2">Manage contact form submissions</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          {['all', 'new', 'in_progress', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Submissions */}
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No contact submissions found</p>
            </div>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{submission.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                          {submission.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${submission.email}`} className="hover:text-green-600">
                            {submission.email}
                          </a>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDistanceToNow(new Date(submission.created_at))} ago</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 mb-3">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{submission.subject}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Actions */}
                  <div className="flex space-x-2">
                    <select
                      value={submission.status}
                      onChange={(e) => updateStatus(submission.id, e.target.value as ContactSubmission['status'])}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-1 mb-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Message:</span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-line">{submission.message}</p>
                </div>

                {/* Quick Reply */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <a
                    href={`mailto:${submission.email}?subject=Re: ${submission.subject}&body=Hi ${submission.name},%0D%0A%0D%0AThank you for contacting us.%0D%0A%0D%0ABest regards,%0D%0AVegan Social Team`}
                    className="inline-flex items-center space-x-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Quick Reply</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}