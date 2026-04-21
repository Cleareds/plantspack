'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BadgeChip, { BadgeCode } from './BadgeChip'

interface ProfileBadgesProps {
  userId: string
  className?: string
  size?: 'xs' | 'sm' | 'md'
}

export default function ProfileBadges({ userId, className = '', size = 'sm' }: ProfileBadgesProps) {
  const [codes, setCodes] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data } = await supabase
        .from('user_badges')
        .select('badge_code')
        .eq('user_id', userId)
      if (cancelled) return
      const uniq = Array.from(new Set((data || []).map(r => r.badge_code))).sort()
      setCodes(uniq)
    }
    run()
    return () => { cancelled = true }
  }, [userId])

  if (codes.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {codes.map(c => (
        <BadgeChip key={c} code={c as BadgeCode} size={size} />
      ))}
    </div>
  )
}
