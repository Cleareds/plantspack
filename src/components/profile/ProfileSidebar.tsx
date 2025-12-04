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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h2>
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
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
