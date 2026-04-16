'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, ExternalLink, Loader2, Trash2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Review {
  id: string
  place_id: string
  user_id: string
  rating: number
  content: string | null
  created_at: string
  places: { id: string; name: string; slug: string; city: string; country: string }
  users: { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 30

  useEffect(() => {
    fetchReviews()
  }, [page])

  const fetchReviews = async () => {
    setLoading(true)
    const offset = (page - 1) * limit
    const { data, count } = await supabase
      .from('place_reviews')
      .select(`
        id, place_id, user_id, rating, content, created_at,
        places:place_id (id, name, slug, city, country),
        users:user_id (id, username, first_name, last_name, avatar_url)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    setReviews((data || []) as unknown as Review[])
    setTotal(count || 0)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return
    const { error } = await supabase
      .from('place_reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Place Reviews</h1>
          <p className="text-gray-400 text-sm mt-1">{total} total reviews</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Place info */}
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/place/${r.places?.slug || r.place_id}`}
                      target="_blank"
                      className="font-medium text-white hover:text-emerald-400 inline-flex items-center gap-1 truncate"
                    >
                      {r.places?.name || 'Unknown Place'}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </Link>
                    <span className="text-xs text-gray-500">{r.places?.city}, {r.places?.country}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 text-sm tracking-wider">{stars(r.rating)}</span>
                    <span className="text-xs text-gray-500">{r.rating}/5</span>
                  </div>

                  {/* Content */}
                  {r.content && (
                    <p className="text-sm text-gray-300 mb-2">{r.content}</p>
                  )}

                  {/* User + date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span className="text-gray-400">{r.users?.username || 'Anonymous'}</span>
                    {r.users?.first_name && (
                      <span>({r.users.first_name} {r.users.last_name || ''})</span>
                    )}
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-shrink-0 p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  title="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
