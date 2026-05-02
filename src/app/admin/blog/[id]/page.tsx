'use client'

// Minimal blog editor for admins. No image uploader, no WYSIWYG - just the
// fields that matter: title, slug, privacy, content (markdown). Deliberately
// boring and reliable.
//
// Slug handling note: the posts.slug trigger regenerates slug from title on
// UPDATE whenever title changes, even if a slug is supplied in the same
// statement. To keep slug under user control, we save title/content/privacy
// first, then write slug as a second update.

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ArrowLeft, Save, Loader2, AlertCircle, ExternalLink, Upload, X, Image as ImageIcon } from 'lucide-react'

interface Article {
  id: string
  slug: string | null
  title: string | null
  content: string
  privacy: string
  category: string
  image_url: string | null
  updated_at: string | null
  created_at: string
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default function AdminBlogEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [privacy, setPrivacy] = useState('draft')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [originalSlug, setOriginalSlug] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('id, slug, title, content, privacy, category, image_url, updated_at, created_at')
        .eq('id', id)
        .maybeSingle()
      if (!active) return
      if (error || !data) {
        setErr(error?.message || 'Article not found')
        setLoading(false)
        return
      }
      if (data.category !== 'article') {
        setErr('This post is not an article and cannot be edited here.')
        setLoading(false)
        return
      }
      setArticle(data as Article)
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setOriginalSlug(data.slug || null)
      setPrivacy(data.privacy || 'draft')
      setContent(data.content || '')
      setImageUrl((data as Article).image_url || '')
      setLoading(false)
    })()
    return () => { active = false }
  }, [id])

  function validate(): string | null {
    if (!title.trim()) return 'Title is required.'
    if (!slug.trim()) return 'Slug is required.'
    if (!SLUG_RE.test(slug.trim())) return 'Slug must be lowercase letters, digits, and hyphens only (no spaces, no leading/trailing hyphen).'
    if (!content.trim()) return 'Content is required.'
    return null
  }

  async function save() {
    const v = validate()
    if (v) { setErr(v); setOkMsg(null); return }
    setErr(null); setOkMsg(null); setSaving(true)

    // Step 1: write title/content/privacy/image_url. The slug trigger may
    // auto-regenerate the slug here if title changed.
    const { error: e1 } = await supabase
      .from('posts')
      .update({
        title: title.trim(),
        content,
        privacy,
        image_url: imageUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (e1) { setErr(e1.message); setSaving(false); return }

    // Step 2: explicitly set slug to whatever the user wanted, overriding any
    // trigger-regenerated slug from step 1.
    const desiredSlug = slug.trim()
    const { error: e2 } = await supabase
      .from('posts')
      .update({ slug: desiredSlug })
      .eq('id', id)
    if (e2) { setErr(`Saved title/content but slug update failed: ${e2.message}`); setSaving(false); return }

    // Bust caches: index always, the new slug always, the old slug if it changed.
    const paths = new Set<string>(['/blog', `/blog/${desiredSlug}`])
    if (originalSlug && originalSlug !== desiredSlug) paths.add(`/blog/${originalSlug}`)
    await Promise.all([...paths].map(p =>
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: p }),
      }).catch(() => {})
    ))

    setOriginalSlug(desiredSlug)
    setOkMsg('Saved.')
    setSaving(false)
  }

  // Upload a thumbnail directly to Supabase Storage post-images bucket
  // and set imageUrl to the resulting public URL. Auto-saves immediately
  // so closing the page without clicking Save still keeps the new image.
  async function uploadThumbnail(file: File) {
    if (!user) { setErr('You must be signed in to upload.'); return }
    setUploading(true); setErr(null); setOkMsg(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/blog-${id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('post-images')
        .upload(path, file, { cacheControl: 'public, max-age=2592000, immutable', upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      // Persist immediately so the post pages can use it without clicking Save
      const { error: dbErr } = await supabase.from('posts').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', id)
      if (dbErr) throw dbErr
      setImageUrl(publicUrl)
      setOkMsg('Thumbnail uploaded and saved.')
      // Bust caches so /blog and the post page show the new image
      const paths = ['/blog', originalSlug ? `/blog/${originalSlug}` : null].filter(Boolean) as string[]
      await Promise.all(paths.map(p => fetch('/api/revalidate', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p })
      }).catch(() => {})))
    } catch (e: any) {
      setErr(`Upload failed: ${e?.message || e}`)
    } finally {
      setUploading(false)
    }
  }
  async function clearThumbnail() {
    setImageUrl('')
    const { error } = await supabase.from('posts').update({ image_url: null, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setErr(error.message); return }
    setOkMsg('Thumbnail cleared.')
    const paths = ['/blog', originalSlug ? `/blog/${originalSlug}` : null].filter(Boolean) as string[]
    await Promise.all(paths.map(p => fetch('/api/revalidate', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p })
    }).catch(() => {})))
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-on-surface-variant flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading article…</div>
  }

  if (err && !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4"><ArrowLeft className="h-4 w-4" />Back to articles</Link>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{err}</div>
      </div>
    )
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const charCount = content.length
  const isPublic = privacy === 'public'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary">
          <ArrowLeft className="h-4 w-4" />Back to articles
        </Link>
        {originalSlug && (
          <Link
            href={`/blog/${originalSlug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
          >
            View live <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-on-surface mb-1">Edit article</h1>
      <p className="text-xs text-on-surface-variant mb-6">
        Last updated {article?.updated_at ? new Date(article.updated_at).toLocaleString() : '—'} · {wordCount} words · {charCount} chars · current status: <span className={`font-medium ${isPublic ? 'text-emerald-600' : 'text-amber-600'}`}>{privacy}</span>
      </p>

      {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{err}</div>}
      {okMsg && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{okMsg}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            URL: <code>/blog/{slug || '<slug>'}</code>. Lowercase, digits, and hyphens only. The DB trigger regenerates slug from title on save - this field overrides that.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Visibility</label>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="privacy" value="draft" checked={privacy === 'draft'} onChange={() => setPrivacy('draft')} />
              <span>Draft (admin-only)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="privacy" value="public" checked={privacy === 'public'} onChange={() => setPrivacy('public')} />
              <span>Public (visible on /blog)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Thumbnail / hero image</label>
          <div className="flex items-start gap-4">
            <div className="w-40 h-28 rounded-lg bg-surface-container-low ghost-border flex items-center justify-center flex-shrink-0 overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="thumbnail preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-on-surface-variant/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Paste image URL, or upload below"
                className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f) }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Upload file'}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={clearThumbnail}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-700 hover:bg-red-50 text-sm"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Shown on <code>/blog</code> index card and at the top of the post. Upload saves immediately. URL field also accepts external links.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-1">Content (Markdown)</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            spellCheck
            className="w-full min-h-[60vh] px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Plain Markdown. Headings (<code>##</code>), <strong>**bold**</strong>, lists, and <code>[links](url)</code> all work. Rendered server-side via <code>marked</code>.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href="/admin/blog" className="text-sm text-on-surface-variant hover:text-primary">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
