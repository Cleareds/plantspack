'use client'

import { useState } from 'react'
import { X, Send, Loader2, Building2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { ClaimFormData } from '@/types/place-claims'

interface ClaimBusinessModalProps {
  isOpen: boolean
  onClose: () => void
  placeId: string
  placeName: string
  onSuccess: () => void
}

export default function ClaimBusinessModal({
  isOpen,
  onClose,
  placeId,
  placeName,
  onSuccess
}: ClaimBusinessModalProps) {
  const { user, profile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<ClaimFormData>({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: user?.email || '',
    proof_description: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (formData.first_name.trim().length < 1 || formData.first_name.trim().length > 100) {
      setError('First name must be between 1 and 100 characters')
      return
    }

    if (formData.last_name.trim().length < 1 || formData.last_name.trim().length > 100) {
      setError('Last name must be between 1 and 100 characters')
      return
    }

    if (!formData.email.trim() || formData.email.trim().length > 254) {
      setError('Please enter a valid email address')
      return
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email format')
      return
    }

    if (formData.proof_description.trim().length < 10) {
      setError('Proof description must be at least 10 characters')
      return
    }

    if (formData.proof_description.trim().length > 1000) {
      setError('Proof description cannot exceed 1000 characters')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/places/${placeId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim')
      }

      onSuccess()
      onClose()

      // Reset form
      setFormData({
        ...formData,
        proof_description: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Claim Business</h2>
                <p className="text-sm text-gray-600">{placeName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> You'll need to provide proof of ownership.
                After submission, our team will review your claim and contact you via email.
              </p>
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                required
                maxLength={100}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Your first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="last_name"
                required
                maxLength={100}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Your last name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                maxLength={254}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll use this email to contact you about your claim
              </p>
            </div>

            {/* Proof of Ownership */}
            <div>
              <label htmlFor="proof_description" className="block text-sm font-medium text-gray-700 mb-2">
                Proof of Ownership <span className="text-red-500">*</span>
              </label>
              <textarea
                id="proof_description"
                required
                rows={6}
                minLength={10}
                maxLength={1000}
                value={formData.proof_description}
                onChange={(e) => setFormData({ ...formData, proof_description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Please describe your relationship to this business and provide details that prove your ownership. For example: business registration number, tax ID, official documents, social media accounts, website ownership, etc."
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Minimum 10 characters, maximum 1000
                </p>
                <span className={`text-xs ${formData.proof_description.length > 950 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.proof_description.length}/1000
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Submit Claim</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
