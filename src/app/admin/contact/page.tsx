'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  Search,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  user_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  created_at: string
  users: {
    username: string
  } | null
}

const CONTACTS_PER_PAGE = 20

export default function ContactAdminPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [totalContacts, setTotalContacts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadContacts()
  }, [currentPage, searchQuery, filterStatus])

  const loadContacts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('contact_submissions')
        .select('*, users(username)', { count: 'exact' })

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const from = (currentPage - 1) * CONTACTS_PER_PAGE
      const to = from + CONTACTS_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      setContacts(data as any || [])
      setTotalContacts(count || 0)
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (contactId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', contactId)

      if (error) throw error

      loadContacts()
      if (selectedContact?.id === contactId) {
        setSelectedContact(null)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedContact) return

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedContact.id)

      if (error) throw error

      alert('Notes saved successfully')
      loadContacts()
      setSelectedContact(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    }
  }

  const totalPages = Math.ceil(totalContacts / CONTACTS_PER_PAGE)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Mail className="h-3 w-3 mr-1" />
            New
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contact Forms</h1>
        <p className="text-gray-600 mt-1">Manage contact form submissions</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or subject..."
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
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {contacts.length} of {totalContacts} submissions
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
      ) : contacts.length === 0 && !searchQuery && filterStatus === 'all' ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <Mail className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">No contact submissions yet</p>
          <p className="text-sm text-gray-500 mt-2">Contact form submissions will appear here</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">No contact submissions found matching your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {contact.subject}
                    </h3>
                    {getStatusBadge(contact.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="font-medium">{contact.name}</span>
                    <span>{contact.email}</span>
                    {contact.users && (
                      <span className="text-gray-500">
                        (User: {contact.users.username})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted {new Date(contact.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {contact.message}
                </p>
              </div>

              {contact.admin_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Notes:</p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {contact.admin_notes}
                  </p>
                </div>
              )}

              {selectedContact?.id === contact.id ? (
                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Add notes about this submission..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Save Notes
                    </button>
                    <button
                      onClick={() => {
                        setSelectedContact(null)
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
                    onClick={() => handleUpdateStatus(contact.id, 'in_progress')}
                    disabled={contact.status === 'in_progress'}
                    className="inline-flex items-center px-3 py-1.5 border border-yellow-300 rounded-md text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 disabled:opacity-50"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(contact.id, 'resolved')}
                    disabled={contact.status === 'resolved'}
                    className="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(contact.id, 'closed')}
                    disabled={contact.status === 'closed'}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedContact(contact)
                      setAdminNotes(contact.admin_notes || '')
                    }}
                    className="ml-auto inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    Add Notes
                  </button>
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