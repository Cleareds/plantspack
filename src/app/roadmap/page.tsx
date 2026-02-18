'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { Crown, Vote, Send, CheckCircle, Lock } from 'lucide-react'

type ColumnKey = 'now' | 'next' | 'later'
type StatusKey = 'in-development' | 'ongoing' | 'planned' | 'exploring'

interface RoadmapFeature {
  id: string
  label: string
  description: string
  status: StatusKey
  quarter: string
  column: ColumnKey
}

const ROADMAP_FEATURES: RoadmapFeature[] = [
  // Now — Shipped / In Progress
  {
    id: 'mobile-app',
    label: 'iOS & Android App',
    description: 'Native mobile applications for iPhone, iPad, and Android devices',
    status: 'in-development',
    quarter: 'Q1 2026',
    column: 'now',
  },
  {
    id: 'fixes-stability',
    label: 'Bug Fixes & Stability',
    description: 'Continuous improvements to platform reliability and performance',
    status: 'ongoing',
    quarter: 'Ongoing',
    column: 'now',
  },

  // Next — Q2–Q3 2026
  {
    id: 'push-notifications',
    label: 'Push Notifications',
    description: 'Mobile and web alerts for activity, mentions, and updates',
    status: 'planned',
    quarter: 'Q2 2026',
    column: 'next',
  },
  {
    id: 'better-packs',
    label: 'Better Pack Management',
    description: 'Richer tools for organizing, discovering, and managing packs',
    status: 'planned',
    quarter: 'Q2 2026',
    column: 'next',
  },
  {
    id: 'internal-messaging',
    label: 'Direct Messaging',
    description: 'Private conversations between users within PlantsPack',
    status: 'planned',
    quarter: 'Q3 2026',
    column: 'next',
  },
  {
    id: 'search',
    label: 'Smarter Search',
    description: 'Better relevance, filters by category, location, and date — plus improved hashtag and user discovery',
    status: 'planned',
    quarter: 'Q3 2026',
    column: 'next',
  },
  {
    id: 'places-improvements',
    label: 'Places Improvements',
    description: 'Richer place profiles, user reviews, photos, opening hours, and better vegan-friendly tagging',
    status: 'planned',
    quarter: 'Q2–Q3 2026',
    column: 'next',
  },

  // Later — Q4 2026+
  {
    id: 'veg-points',
    label: 'Veg Points',
    description: 'Reward system for engagement and contributions to the community',
    status: 'exploring',
    quarter: 'Q4 2026',
    column: 'later',
  },
  {
    id: 'improve-ai',
    label: 'Smarter Content Moderation',
    description: 'Fewer false positives and improved accuracy in AI content review',
    status: 'exploring',
    quarter: 'Q4 2026',
    column: 'later',
  },
  {
    id: 'community-events',
    label: 'Community Events',
    description: 'Vegan meetups, challenges, and shared goals within PlantsPack',
    status: 'exploring',
    quarter: 'Q4 2026+',
    column: 'later',
  },
  {
    id: 'profile-badges',
    label: 'Profile Badges & Achievements',
    description: 'Milestone rewards for activity and contributions',
    status: 'exploring',
    quarter: 'Q4 2026+',
    column: 'later',
  },
]

const STATUS_CONFIG: Record<StatusKey, { label: string; bg: string; text: string; dot: string }> = {
  'in-development': {
    label: 'In Development',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  'ongoing': {
    label: 'Ongoing',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  'planned': {
    label: 'Planned',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  'exploring': {
    label: 'Exploring',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
}

const COLUMNS: { key: ColumnKey; title: string; subtitle: string; headerBg: string; headerText: string }[] = [
  {
    key: 'now',
    title: 'Now',
    subtitle: 'Shipped & In Progress',
    headerBg: 'bg-green-600',
    headerText: 'text-white',
  },
  {
    key: 'next',
    title: 'Next',
    subtitle: 'Q2–Q3 2026',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
  },
  {
    key: 'later',
    title: 'Later',
    subtitle: 'Q4 2026 and beyond',
    headerBg: 'bg-gray-500',
    headerText: 'text-white',
  },
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Roadmap</h1>
          <p className="text-xl text-gray-600 mb-3">
            Help shape the future of PlantsPack by voting for features you'd like to see next.
          </p>
          <p className="text-base text-gray-500 mb-2">
            <strong>Voting is available for Support and Premium members.</strong> All users can view current results and submit suggestions.
          </p>
          <p className="text-sm text-gray-400 italic">
            Estimated dates are indicative and may shift based on community votes and priorities.
          </p>
        </div>

        {/* Voting Access Info */}
        {!user ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-900">
              <Link href="/auth" className="font-semibold underline hover:text-blue-700">
                Sign in
              </Link>{' '}
              and upgrade to Support or Premium to vote for features and help shape PlantsPack's future.
            </p>
          </div>
        ) : !canVote ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
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

        {/* 3-Column Timeline */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <p className="text-gray-600">Loading votes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {COLUMNS.map(col => {
              const features = ROADMAP_FEATURES.filter(f => f.column === col.key)
              return (
                <div key={col.key} className="flex flex-col">
                  {/* Column header */}
                  <div className={`${col.headerBg} rounded-t-lg px-4 py-3`}>
                    <h2 className={`text-lg font-bold ${col.headerText}`}>{col.title}</h2>
                    <p className={`text-sm ${col.headerText} opacity-80`}>{col.subtitle}</p>
                  </div>

                  {/* Feature cards */}
                  <div className="flex flex-col gap-3 p-3 bg-gray-100 rounded-b-lg flex-1">
                    {features.map(feature => {
                      const voteCount = votes[feature.id] || 0
                      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                      const isSelected = selectedFeatures.includes(feature.id)
                      const statusConf = STATUS_CONFIG[feature.status]

                      return (
                        <div
                          key={feature.id}
                          className={`bg-white rounded-lg border p-4 transition-all ${
                            canVote && !hasVoted
                              ? 'border-gray-200 hover:border-green-300 cursor-pointer'
                              : 'border-gray-200'
                          } ${isSelected ? 'border-green-400 ring-1 ring-green-400' : ''}`}
                          onClick={() => canVote && !hasVoted && toggleFeature(feature.id)}
                        >
                          {/* Card top row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {/* Checkbox / Lock */}
                              {canVote ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleFeature(feature.id)}
                                  disabled={hasVoted}
                                  onClick={e => e.stopPropagation()}
                                  className="mt-0.5 h-4 w-4 text-green-600 rounded focus:ring-green-500 disabled:opacity-50 flex-shrink-0"
                                />
                              ) : (
                                <div className="group relative flex-shrink-0 mt-0.5">
                                  <Lock className="h-4 w-4 text-gray-300" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                    <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                      Support or Premium required
                                    </div>
                                  </div>
                                </div>
                              )}
                              <span className="font-semibold text-gray-900 text-sm leading-tight">{feature.label}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 mb-3 ml-6">{feature.description}</p>

                          {/* Status badge + quarter */}
                          <div className="flex items-center gap-2 mb-3 ml-6 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConf.bg} ${statusConf.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                              {statusConf.label}
                            </span>
                            <span className="text-xs text-gray-400">{feature.quarter}</span>
                          </div>

                          {/* Vote bar */}
                          <div className="ml-6">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                              <span className="text-gray-400">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Submit Vote / Already Voted */}
        {!loading && canVote && (
          <div className="mb-6">
            {!hasVoted ? (
              <button
                onClick={handleVote}
                disabled={submitting || selectedFeatures.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Vote className="h-4 w-4" />
                {submitting ? 'Submitting...' : `Submit Vote${selectedFeatures.length > 0 ? ` (${selectedFeatures.length} selected)` : ''}`}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-green-800">You've already voted! Thank you for your input.</p>
              </div>
            )}
          </div>
        )}

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
