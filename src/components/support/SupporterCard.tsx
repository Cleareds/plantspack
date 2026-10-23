'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isActiveSupporter } from '@/lib/supporter'
import Wordmark from '@/components/brand/Wordmark'

/**
 * The card a supporter shows at a Partner venue for a supporters-only deal.
 * A live clock, today's date and a moving shine make a screenshot easy to
 * spot: staff can ask to see the seconds change.
 */
export default function SupporterCard() {
  const { user, profile, loading } = useAuth()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return <div className="flex items-center gap-2 text-on-surface-variant py-16 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Supporter card</h1>
        <p className="text-on-surface-variant mb-5">Sign in to show your card.</p>
        <Link href={`/auth?mode=signin&redirect=${encodeURIComponent('/supporter-card')}`} className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium">Sign in</Link>
      </div>
    )
  }

  const p = profile as any
  if (!isActiveSupporter(p)) {
    return (
      <div className="text-center py-10">
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">Supporter card</h1>
        <p className="text-on-surface-variant mb-5">
          Supporters get a card to show at vegan places that offer supporter deals on PlantsPack.
          Supporting costs €3 a month and keeps PlantsPack free for everyone.
        </p>
        <Link href="/support" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium"><Heart className="h-4 w-4" /> Become a supporter</Link>
      </div>
    )
  }

  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.username
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <style>{`
        @keyframes pp-shine { 0% { transform: translateX(-120%) rotate(18deg); } 100% { transform: translateX(320%) rotate(18deg); } }
        @keyframes pp-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .45; transform: scale(.8); } }
        @media (prefers-reduced-motion: reduce) { .pp-shine { animation-duration: 6s !important; } }
      `}</style>
      <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg" style={{ background: 'linear-gradient(145deg, #0A6A1D, #08361A)' }} aria-live="off">
        <span className="pp-shine pointer-events-none absolute top-[-40%] left-0 h-[180%] w-1/4 bg-white/15" style={{ animation: 'pp-shine 2.6s linear infinite' }} />
        <Wordmark color="#FFFFFF" className="h-5 w-auto" />
        <div className="mt-8 text-sm text-white/75">PlantsPack Supporter</div>
        <div className="text-2xl font-extrabold leading-tight">{name}</div>
        {p.username && <div className="text-sm text-white/75">@{p.username}</div>}
        <div className="mt-8 flex items-end justify-between">
          <div>
            <div className="text-xs text-white/70">{date}</div>
            <div className="text-3xl font-extrabold tabular-nums tracking-tight">{time}</div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#B9E36E]">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#B9E36E]" style={{ animation: 'pp-pulse 1.2s ease-in-out infinite' }} />
            Live
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm text-on-surface-variant text-center">
        Show this card at the counter for supporter deals. The clock and the moving shine show it is live, not a screenshot.
      </p>
      <p className="mt-2 text-sm text-center"><Link href="/support" className="text-primary font-medium hover:underline">Thank you for supporting PlantsPack</Link></p>
    </div>
  )
}
