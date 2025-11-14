'use client'

import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface ReportButtonProps {
  reportedType: 'post' | 'comment' | 'user' | 'place'
  reportedId: string
  className?: string
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'violence', label: 'Violence' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'nsfw', label: 'NSFW Content' },
  { value: 'off_topic', label: 'Off Topic' },
  { value: 'copyright', label: 'Copyright Violation' },
  { value: 'other', label: 'Other' }
]

export default function ReportButton({ reportedType, reportedId, className = '' }: ReportButtonProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !reason) return

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_type: reportedType,
          reported_id: reportedId,
          reason,
          description: description || null,
          status: 'pending'
        })

      if (error) throw error

      setSubmitted(true)
      setTimeout(() => {
        setShowModal(false)
        setSubmitted(false)
        setReason('')
        setDescription('')
      }, 2000)
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center text-gray-600 hover:text-red-600 transition-colors ${className}`}
        title={`Report this ${reportedType}`}
      >
        <Flag className="h-4 w-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Report {reportedType.charAt(0).toUpperCase() + reportedType.slice(1)}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <Flag className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-gray-900 font-medium mb-1">Report Submitted</p>
                <p className="text-sm text-gray-600">
                  Thank you for helping keep our community safe.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for reporting
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a reason...</option>
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Provide more context if needed..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={submitting || !reason}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
