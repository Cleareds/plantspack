'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { Crown, Vote, Send, CheckCircle } from 'lucide-react'

const ROADMAP_FEATURES = [
  { id: 'ios-app', label: 'iOS Mobile App', description: 'Native iOS application for iPhone and iPad' },
  { id: 'android-app', label: 'Android Mobile App', description: 'Native Android application' },
  { id: 'better-packs', label: 'Better Packs Management', description: 'Enhanced tools for organizing and managing packs' },
  { id: 'internal-messaging', label: 'Internal Messaging', description: 'Direct messaging between users' },
  { id: 'fixes-stability', label: 'Focus on Fixes and Stability', description: 'Prioritize bug fixes and platform stability' },
  { id: 'remove-ai', label: 'Remove AI Validation', description: 'Disable AI content moderation' },
  { id: 'improve-ai', label: 'Improve AI Validation', description: 'Enhance AI content moderation accuracy' },
  { id: 'improve-notifications', label: 'Improve Notifications System', description: 'Better notification management and delivery' },
]

export default function RoadmapPage() {
  const { user, profile } = useAuth()
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [hasVoted, setHasVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  // Suggestion form state
  const [suggestion, setSuggestion] = useState('')
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false)
  const [suggestionSuccess, setSuggestionSuccess] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')

  const canVote = (profile as any)?.subscription_tier === 'medium' || (profile as any)?.subscription_tier === 'premium'

  useEffect(() => {
    fetchVotes()
  }, [])

  const fetchVotes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roadmap/votes')
      const data = await response.json()

      if (response.ok) {
        setVotes(data.votes || {})
        setHasVoted(data.hasVoted || false)
      }
    } catch (error) {
      console.error('Error fetching votes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!canVote || selectedFeatures.length === 0) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/roadmap/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: selectedFeatures })
      })

      if (response.ok) {
        await fetchVotes()
        setSelectedFeatures([])
      }
    } catch (error) {
      console.error('Error submitting votes:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuggestion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!suggestion.trim()) return

    try {
      setSubmittingSuggestion(true)
      setSuggestionError('')
      setSuggestionSuccess(false)

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.username || 'Anonymous',
          email: user?.email || 'no-email@provided.com',
          subject: 'Roadmap Suggestion',
          message: suggestion
        })
      })

      if (response.ok) {
        setSuggestionSuccess(true)
        setSuggestion('')
      } else {
        setSuggestionError('Failed to send suggestion. Please try again.')
      }
    } catch (error) {
      setSuggestionError('An error occurred. Please try again.')
    } finally {
      setSubmittingSuggestion(false)
    }
  }

  const toggleFeature = (featureId: string) => {
    if (!canVote) return

    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Roadmap</h1>
          <p className="text-xl text-gray-600 mb-3">
            Help shape the future of PlantsPack by voting for features you'd like to see next.
          </p>
          <p className="text-base text-gray-500">
            <strong>Voting is available for Support and Premium members.</strong> All users can view current results and submit suggestions.
          </p>
        </div>

        {/* Voting Access Info */}
        {!user ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-900">
              <Link href="/auth" className="font-semibold underline hover:text-blue-700">
                Sign in
              </Link>{' '}
              and upgrade to Support or Premium to vote for features and help shape PlantsPack's future.
            </p>
          </div>
        ) : !canVote ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <Crown className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-900 font-semibold mb-2">
                  Voting is available for Support and Premium members
                </p>
                <p className="text-yellow-800 mb-3">
                  Upgrade your subscription to participate in shaping PlantsPack's future.
                </p>
                <Link
                  href="/settings/subscription"
                  className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Crown className="h-4 w-4" />
                  Upgrade Now
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Voting Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Vote className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {canVote ? 'Vote for Features' : 'Feature Voting Results'}
            </h2>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading votes...</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {ROADMAP_FEATURES.map(feature => {
                  const voteCount = votes[feature.id] || 0
                  const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                  const isSelected = selectedFeatures.includes(feature.id)

                  return (
                    <div key={feature.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        {/* Only show checkbox for Support/Premium users */}
                        {canVote && (
                          <input
                            type="checkbox"
                            id={feature.id}
                            checked={isSelected}
                            onChange={() => toggleFeature(feature.id)}
                            disabled={hasVoted}
                            className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500 disabled:opacity-50"
                          />
                        )}
                        <div className="flex-1">
                          <label
                            htmlFor={feature.id}
                            className={`font-semibold text-gray-900 ${canVote && !hasVoted ? 'cursor-pointer' : ''}`}
                          >
                            {feature.label}
                          </label>
                          <p className="text-sm text-gray-600 mt-1">{feature.description}</p>

                          {/* Vote Progress - visible to everyone */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">{voteCount} votes</span>
                              <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>

                {canVote && !hasVoted && (
                  <button
                    onClick={handleVote}
                    disabled={submitting || selectedFeatures.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : `Submit Vote${selectedFeatures.length > 0 ? ` (${selectedFeatures.length})` : ''}`}
                  </button>
                )}

                {canVote && hasVoted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800">You've already voted! Thank you for your input.</p>
                  </div>
                )}
              </>
            )}
        </div>

        {/* Suggestions Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Send className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Suggest Other Improvements</h2>
          </div>

          {suggestionSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">Thank you! Your suggestion has been sent to our team.</p>
            </div>
          )}

          {suggestionError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{suggestionError}</p>
            </div>
          )}

          <form onSubmit={handleSuggestion} className="space-y-4">
            <div>
              <label htmlFor="suggestion" className="block text-sm font-medium text-gray-700 mb-2">
                Your Suggestion
              </label>
              <textarea
                id="suggestion"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Share your ideas for improving PlantsPack..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingSuggestion || !suggestion.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {submittingSuggestion ? 'Sending...' : 'Send Suggestion'}
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600">
            Your suggestion will be sent to{' '}
            <a href="mailto:hello@cleareds.com" className="text-green-600 hover:text-green-700 font-semibold">
              hello@cleareds.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
