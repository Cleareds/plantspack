'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/map', label: 'Map', icon: 'explore' },
  { href: '/vegan-places', label: 'Places', icon: 'place' },
  { href: '/vegan-score', label: 'Score', icon: 'leaderboard' },
  { href: '/recipes', label: 'Recipes', icon: 'restaurant_menu' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const username = profile?.username || user?.user_metadata?.username

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-end px-1 pb-[env(safe-area-inset-bottom,8px)] h-20 bg-surface/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(45,47,44,0.06)]">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-1 py-2 ${
              isActive ? 'text-primary scale-110' : 'text-on-surface-variant opacity-60'
            } transition-all`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{item.label}</span>
          </Link>
        )
      })}
      {user && username ? (
        <Link
          href={`/profile/${username}`}
          className={`flex flex-col items-center justify-center px-1 py-2 ${
            pathname?.startsWith('/profile') ? 'text-primary scale-110' : 'text-on-surface-variant opacity-60'
          } transition-all`}
        >
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Profile</span>
        </Link>
      ) : (
        <Link
          href="/auth"
          className="flex flex-col items-center justify-center px-1 py-2 text-on-surface-variant opacity-60 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">login</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Sign In</span>
        </Link>
      )}
    </nav>
  )
}
