'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import SearchBar from '@/components/search/SearchBar'
import NotificationBell from '@/components/notifications/NotificationBell'

interface TopBarProps {
  bannerOffset?: boolean
}

export default function TopBar({ bannerOffset }: TopBarProps) {
  const { user, profile } = useAuth()
  const username = profile?.username || user?.user_metadata?.username

  return (
    <header className={`fixed ${bannerOffset ? 'top-8' : 'top-0'} right-0 left-0 lg:left-64 z-50 bg-surface/80 backdrop-blur-lg flex justify-between items-center px-4 md:px-8 h-16`}>
      {/* Mobile logo (shown only on mobile where sidebar is hidden) */}
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <Image
          src="/plantspack9.png"
          alt="PlantsPack Logo"
          width={36}
          height={36}
          className="object-contain"
        />
        <span className="font-headline font-extrabold text-primary text-xl tracking-tight">Plants Pack</span>
        <span className="text-[9px] font-bold text-on-secondary bg-secondary-container px-1.5 py-0.5 rounded-full">BETA</span>
      </Link>

      {/* Search Bar - center */}
      <div className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-1.5 gap-2 flex-1 max-w-lg mx-auto">
        <SearchBar />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {user && username && (
          <>
            <NotificationBell />
            <Link href={`/profile/${username}`} className="hidden lg:flex items-center gap-3 bg-surface-container-high pr-1 pl-4 py-1 rounded-full group cursor-pointer hover:bg-surface-container-highest transition-colors">
              <span className="text-sm font-bold font-label">{profile?.first_name || username}</span>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
                  {profile?.first_name?.[0] || username[0].toUpperCase()}
                </div>
              )}
            </Link>
          </>
        )}
        {!user && (
          <Link
            href="/auth"
            className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
