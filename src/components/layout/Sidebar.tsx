'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/map', label: 'Discover', icon: 'explore' },
  { href: '/packs', label: 'Packs', icon: 'groups' },
  { href: '/support', label: 'Support Us', icon: 'volunteer_activism' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const username = profile?.username || user?.user_metadata?.username

  return (
    <aside className="hidden lg:flex flex-col p-6 gap-4 h-screen w-64 bg-surface fixed left-0 top-0 z-40 font-body">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-6">
        <Image
          src="/plantspack9.png"
          alt="PlantsPack Logo"
          width={40}
          height={40}
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
      <div className="mt-auto">
        {!user ? (
          <Link
            href="/auth"
            className="w-full block text-center bg-primary text-on-primary py-4 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/10 hover:opacity-90 transition-all"
          >
            Sign In
          </Link>
        ) : (
          <Link
            href="/auth"
            className="w-full block text-center bg-primary text-on-primary py-4 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/10 hover:opacity-90 transition-all active:scale-95"
          >
            Create Post
          </Link>
        )}

        {user && username && (
          <Link href={`/profile/${username}`} className="mt-6 flex items-center gap-3 pt-6 border-t border-outline-variant/15">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold">
                {profile?.first_name?.[0] || username[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-on-surface">{profile?.first_name || username}</p>
              <p className="text-xs text-on-surface-variant">View Profile</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
