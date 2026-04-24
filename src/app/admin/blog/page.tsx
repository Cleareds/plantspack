'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Globe, FileText, Eye, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Article {
  id: string
  slug: string | null
  title: string | null
  content: string
  privacy: string
  image_url: string | null
  created_at: string
  updated_at: string | null
  users: { username: string; first_name: string | null; last_name: string | null }
}

export default function AdminBlog() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => { loadArticles() }, [])

  async function loadArticles() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, slug, title, content, privacy, image_url, created_at, updated_at, users(username, first_name, last_name)')
      .eq('category', 'article')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setArticles((data as any[]) || [])
    setLoading(false)
  }

  async function setPrivacy(id: string, privacy: string) {
    setActioning(id)
    await supabase.from('posts').update({ privacy }).eq('id', id)
    await loadArticles()
    setActioning(null)
  }

  function excerpt(text: string, max = 160) {
    const clean = text.replace(/#+\s[^\n]+\n?/g, '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
    return clean.length > max ? clean.slice(0, max - 1) + '...' : clean
  }

  const published = articles.filter(a => a.privacy === 'public')
  const drafts = articles.filter(a => a.privacy !== 'public')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Blog</h1>
          <p className="text-on-surface-variant mt-1">{published.length} published, {drafts.length} draft</p>
        </div>
        <Link href="/blog" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container rounded-lg text-sm text-on-surface-variant hover:text-primary transition-colors">
          <ExternalLink className="h-4 w-4" /> View blog
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow text-on-surface-variant">No articles yet.</div>
      ) : (
        <div className="space-y-3">
          {articles.map(a => {
            const user = Array.isArray(a.users) ? (a.users as any[])[0] : a.users
            const authorName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : `@${user?.username}`
            const isPublished = a.privacy === 'public'
            const isActing = actioning === a.id
            const blogUrl = `/blog/${a.slug || a.id}`
            return (
              <div key={a.id} className="bg-white rounded-lg shadow p-5 flex gap-4 items-start">
                {a.image_url && (
                  <img src={a.image_url} alt="" className="w-24 h-16 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary-container/30 text-primary">
                            <Globe className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            <FileText className="h-3 w-3" /> Draft
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant">{new Date(a.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-on-surface-variant">by {authorName}</span>
                      </div>
                      <h3 className="font-semibold text-on-surface line-clamp-1">{a.title || excerpt(a.content, 80)}</h3>
                      <p className="text-sm text-on-surface-variant mt-0.5 line-clamp-2">{excerpt(a.content)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={blogUrl} target="_blank" className="p-1.5 text-outline hover:text-on-surface-variant hover:bg-surface-container rounded" title="Preview">
                        <Eye className="h-4 w-4" />
                      </a>
                      {isPublished ? (
                        <button
                          onClick={() => setPrivacy(a.id, 'draft')}
                          disabled={isActing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg text-xs font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          Unpublish
                        </button>
                      ) : (
                        <button
                          onClick={() => setPrivacy(a.id, 'public')}
                          disabled={isActing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
