'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Edit, Crown, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface ProfileSidebarProps {
  username: string
}

export default function ProfileSidebar({ username }: ProfileSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    {
      href: `/profile/${username}`,
      icon: User,
      label: 'Profile',
      match: (path: string) => path === `/profile/${username}`
    },
    {
      href: `/profile/${username}/edit`,
      icon: Edit,
      label: 'Edit',
      match: (path: string) => path === `/profile/${username}/edit`
    },
    {
      href: `/profile/${username}/subscription`,
      icon: Crown,
      label: 'Subscription',
      match: (path: string) => path === `/profile/${username}/subscription`
    },
    {
      href: `/profile/${username}/settings`,
      icon: Settings,
      label: 'Settings',
      match: (path: string) => path === `/profile/${username}/settings`
    }
  ]

  return (
    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4">
      <h2 className="text-lg font-semibold text-on-surface mb-4">My Profile</h2>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.match(pathname)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="mt-4 pt-4 border-t border-outline-variant/15">
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-md text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
