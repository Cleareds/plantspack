'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import VeganToggle from '@/components/ui/VeganToggle'

const navItems = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/map', label: 'Map', icon: 'explore' },
  { href: '/vegan-places', label: 'Vegan Places', icon: 'location_on' },
  { href: '/recipes', label: 'Recipes', icon: 'restaurant_menu' },
  { href: '/city-ranks', label: 'City Ranks', icon: 'leaderboard' },
  { href: '/feed', label: 'Feed', icon: 'forum' },
  { href: '/events', label: 'Events', icon: 'event' },
  { href: '/packs', label: 'Packs / Trips', icon: 'groups' },
]

function SidebarMenuItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-low/50 transition-colors"
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const username = profile?.username || user?.user_metadata?.username

  return (
    <aside className="hidden lg:flex flex-col p-6 gap-4 h-screen w-64 bg-surface fixed left-0 top-0 z-40 font-body">
      {/* Logo */}
      <Link href="/" className="flex items-end gap-1 mb-3">
        <Image
          src="/plantspack-logo-real.svg"
          alt="PlantsPack Logo"
          width={64}
          height={42}
          className="object-contain"
        />
        <div className="flex flex-col">
          <span className="font-headline font-extrabold text-primary text-lg tracking-tight leading-tight">Plants Pack</span>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-60">vegan syndicate</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-primary font-bold bg-surface-container-low'
                  : 'text-on-surface-variant hover:bg-surface-container-low/50'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto space-y-4">
        {!user && (
          <Link
            href="/auth"
            className="w-full block text-center bg-primary text-on-primary-btn py-4 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/10 hover:opacity-90 transition-all"
          >
            Sign In
          </Link>
        )}

        <Link
          href="/support"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary ghost-border hover:bg-primary/5 transition-all"
        >
          <span className="material-symbols-outlined text-lg">volunteer_activism</span>
          Support Us
        </Link>

        {user && username && (
          <div className="pt-4 border-t border-outline-variant/15 space-y-1">
            <Link href={`/profile/${username}`} className="flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-surface-container-low/50 transition-colors">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold">
                  {profile?.first_name?.[0] || username[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{profile?.first_name || username}</p>
                <p className="text-xs text-on-surface-variant truncate">@{username}</p>
              </div>
            </Link>
            <SidebarMenuItem href={`/profile/${username}`} icon="account_circle" label="My profile" />
            <SidebarMenuItem href="/profile/contributions" icon="stars" label="My contributions" />
            <SidebarMenuItem href={`/profile/${username}/settings`} icon="settings" label="Settings" />
            <SidebarMenuItem href={`/profile/${username}/subscription`} icon="credit_card" label="Subscription" />
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container-low/50 transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
