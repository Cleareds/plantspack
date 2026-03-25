'use client'

import { useState, useEffect } from 'react'
import { Heart, FolderPlus, Share2, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Pack {
  id: string
  title: string
  already_added: boolean
}

export default function RecipeActions({ postId }: { postId: string }) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showPackModal, setShowPackModal] = useState(false)
  const [packs, setPacks] = useState<Pack[]>([])
  const [packsLoading, setPacksLoading] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Check if user has saved this recipe
  useEffect(() => {
    if (!user) return
    supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsSaved(!!data))
  }, [user, postId])

  const toggleSave = async () => {
    if (!user) return
    setSaveLoading(true)
    try {
      if (isSaved) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        setIsSaved(false)
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
        setIsSaved(true)
      }
    } catch {}
    setSaveLoading(false)
  }

  const fetchPacks = async () => {
    if (!user) return
    setPacksLoading(true)
    try {
      // Get user's packs where they are admin/moderator
      const { data: memberships } = await supabase
        .from('pack_members')
        .select('pack_id, role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'moderator'])

      if (!memberships?.length) { setPacks([]); setPacksLoading(false); return }

      const packIds = memberships.map(m => m.pack_id)
      const { data: userPacks } = await supabase
        .from('packs')
        .select('id, title')
        .in('id', packIds)

      // Check which packs already have this post
      const { data: existing } = await supabase
        .from('pack_posts')
        .select('pack_id')
        .eq('post_id', postId)
        .in('pack_id', packIds)

      const existingSet = new Set((existing || []).map(e => e.pack_id))

      setPacks((userPacks || []).map(p => ({
        ...p,
        already_added: existingSet.has(p.id),
      })))
    } catch {}
    setPacksLoading(false)
  }

  const addToPack = async (packId: string) => {
    if (!user) return
    setAddingTo(packId)
    try {
      await supabase.from('pack_posts').insert({
        pack_id: packId,
        post_id: postId,
        added_by_user_id: user.id,
      })
      setPacks(prev => prev.map(p => p.id === packId ? { ...p, already_added: true } : p))
    } catch {}
    setAddingTo(null)
  }

  const shareRecipe = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save / Favorite */}
      <button
        onClick={user ? toggleSave : undefined}
        disabled={saveLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isSaved
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'ghost-border text-on-surface-variant hover:bg-surface-container-low'
        }`}
        title={user ? (isSaved ? 'Unsave recipe' : 'Save recipe') : 'Sign in to save'}
      >
        <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </button>

      {/* Add to Pack */}
      {user && (
        <button
          onClick={() => { setShowPackModal(true); fetchPacks() }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ghost-border text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          Add to Pack
        </button>
      )}

      {/* Share */}
      <button
        onClick={shareRecipe}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ghost-border text-on-surface-variant hover:bg-surface-container-low transition-colors"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* Pack Modal */}
      {showPackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-surface-container-lowest rounded-xl p-5 w-full max-w-sm editorial-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-on-surface">Add to Pack</h3>
              <button onClick={() => setShowPackModal(false)} className="text-outline hover:text-on-surface">✕</button>
            </div>

            {!user ? (
              <p className="text-sm text-on-surface-variant">
                <Link href="/auth" className="text-primary hover:underline">Sign in</Link> to add recipes to packs.
              </p>
            ) : packsLoading ? (
              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : packs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-on-surface-variant mb-3">You don&apos;t have any packs yet.</p>
                <Link href="/packs/create" className="text-sm text-primary hover:underline font-medium">Create a pack</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {packs.map(pack => (
                  <div key={pack.id} className="flex items-center justify-between p-2 rounded-lg ghost-border">
                    <span className="text-sm text-on-surface font-medium truncate">{pack.title}</span>
                    {pack.already_added ? (
                      <span className="text-xs text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Added</span>
                    ) : (
                      <button
                        onClick={() => addToPack(pack.id)}
                        disabled={addingTo === pack.id}
                        className="text-xs px-2 py-1 silk-gradient text-on-primary-btn rounded-md font-medium"
                      >
                        {addingTo === pack.id ? '...' : 'Add'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
