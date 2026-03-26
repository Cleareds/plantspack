'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, BadgeCheck, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, images, is_verified, created_at, recipe_data, secondary_tags, users(username)')
      .eq('category', 'recipe')
      .order('created_at', { ascending: false })
      .limit(500)
    setRecipes(data || [])
    setLoading(false)
  }

  const toggleVerified = async (id: string, current: boolean) => {
    await supabase.from('posts').update({ is_verified: !current }).eq('id', id)
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, is_verified: !current } : r))
  }

  const deleteRecipe = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await supabase.from('posts').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const filtered = recipes.filter(r =>
    !search || (r.title || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Recipes ({recipes.length})</h1>
        <span className="text-sm text-on-surface-variant">{recipes.filter(r => r.is_verified).length} verified</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
        <input type="text" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg ghost-border bg-surface-container-lowest focus:ring-1 focus:ring-primary/40 focus:outline-none" />
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const rd = r.recipe_data as any
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg ghost-border">
                {r.images?.[0] ? (
                  <img src={r.images[0]} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded bg-surface-container-low flex items-center justify-center flex-shrink-0 text-outline">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-on-surface truncate">{r.title}</span>
                    {r.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span>{rd?.meal_type || '—'}</span>
                    <span>•</span>
                    <span>{rd?.difficulty || '—'}</span>
                    <span>•</span>
                    <span>by @{r.users?.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleVerified(r.id, r.is_verified)}
                    className={`p-1.5 rounded transition-colors ${r.is_verified ? 'text-primary bg-primary/10' : 'text-outline hover:text-primary'}`}
                    title={r.is_verified ? 'Remove verified' : 'Mark as verified'}>
                    <BadgeCheck className="h-4 w-4" />
                  </button>
                  <Link href={`/recipe/${r.slug || r.id}`} target="_blank" className="p-1.5 rounded text-outline hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button onClick={() => deleteRecipe(r.id, r.title)} className="p-1.5 rounded text-outline hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
