'use client'

/**
 * Admin-only modal for attaching a published blog article to a pack.
 * Backed by the existing POST /api/packs/[id]/posts endpoint - that route
 * already enforces admin/moderator role and that the post is public, so
 * the modal only needs to surface the right candidates and call it.
 */

import { useEffect, useState } from 'react'
import { X, Search, FileText, Plus, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Article = {
  id: string
  slug: string | null
  title: string | null
  content: string
  image_url: string | null
  created_at: string
  privacy: string
}

interface AddArticleToPackModalProps {
  packId: string
  alreadyAttachedIds: string[]
  onClose: () => void
  onArticleAdded: () => void
}

function excerpt(text: string, max = 140) {
  const clean = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > max ? clean.slice(0, max - 1) + '...' : clean
}

export default function AddArticleToPackModal({ packId, alreadyAttachedIds, onClose, onArticleAdded }: AddArticleToPackModalProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Fetch all public articles once. Articles are a small set (dozens, not
  // thousands), so we can load + client-filter without paging.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('id, slug, title, content, image_url, created_at, privacy')
        .eq('category', 'article')
        .eq('privacy', 'public')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      if (error) {
        setErr(error.message)
      } else {
        setArticles((data as Article[]) || [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onClose])

  const filtered = searchQuery.trim().length === 0
    ? articles
    : articles.filter(a => {
        const q = searchQuery.toLowerCase()
        return (a.title || '').toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      })

  async function handleAdd(postId: string) {
    setAdding(postId)
    setErr(null)
    try {
      const res = await fetch(`/api/packs/${packId}/posts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data?.error || `Failed to add article (HTTP ${res.status})`)
      } else {
        onArticleAdded()
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to add article')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/15">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Add article to pack</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Only published articles are listed. Drafts cannot be attached.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-outline-variant/15">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
            <input
              type="text"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant/30 rounded-xl bg-surface-container-low focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>

        {err && (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {err}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading articles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-outline mb-2" />
              <p className="text-on-surface-variant text-sm">
                {articles.length === 0 ? 'No published articles yet.' : 'No articles match your search.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(article => {
                const isAttached = alreadyAttachedIds.includes(article.id)
                const isAdding = adding === article.id
                return (
                  <li key={article.id} className="bg-surface-container-low rounded-xl p-3 flex gap-3 items-start">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title || ''}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-surface-container flex-shrink-0 flex items-center justify-center text-outline">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm text-on-surface line-clamp-2">
                            {article.title || excerpt(article.content, 80)}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                            {excerpt(article.content)}
                          </p>
                          <Link
                            href={`/blog/${article.slug || article.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                          >
                            Preview <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <button
                          onClick={() => handleAdd(article.id)}
                          disabled={isAttached || isAdding}
                          className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-on-primary hover:opacity-90"
                          title={isAttached ? 'Already in this pack' : 'Add to pack'}
                        >
                          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          {isAttached ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
