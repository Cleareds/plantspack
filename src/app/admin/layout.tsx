'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  MapPin,
  Flag,
  Mail,
  Shield,
  Loader2,
  Menu,
  X,
  Building2,
  ChefHat,
  Calendar,
  PenLine,
  BarChart3,
  Star
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, authReady } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (authReady && user) {
      // Wait for profile to be loaded before checking role
      if (profile === null) {
        // Profile is still loading, wait
        return
      }

      // Profile is loaded, now check if user is admin
      if (profile?.role !== 'admin') {
        console.log('Admin access denied. User role:', profile?.role)
        router.push('/')
      } else {
        console.log('Admin access granted. User role:', profile?.role)
        setIsAuthorized(true)
      }
    } else if (authReady && !user) {
      // No user logged in
      console.log('No user logged in, redirecting to home')
      router.push('/')
    }
  }, [user, profile, authReady, router])

  // Show loading while auth is initializing OR while profile is loading
  if (!authReady || (authReady && user && profile === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Posts', href: '/admin/posts', icon: FileText },
    { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
    { name: 'Places', href: '/admin/places', icon: MapPin },
    { name: 'Reviews', href: '/admin/reviews', icon: Star },
    { name: 'Recipes', href: '/admin/recipes', icon: ChefHat },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Data Quality', href: '/admin/data-quality', icon: BarChart3 },
    { name: 'Staging', href: '/admin/staging', icon: Shield },
    { name: 'Reports', href: '/admin/reports', icon: Flag },
    { name: 'Corrections', href: '/admin/corrections', icon: PenLine },
    { name: 'Business Claims', href: '/admin/claims', icon: Building2 },
    { name: 'Contact Forms', href: '/admin/contact', icon: Mail },
  ]

  return (
    <div className="min-h-screen bg-surface-container">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-on-surface text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-on-surface">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-outline hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-outline-variant hover:bg-on-surface hover:text-white transition-colors"
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-on-surface">
          <Link
            href="/"
            className="flex items-center space-x-2 text-outline hover:text-white transition-colors"
          >
            <span>← Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-on-surface-variant hover:text-on-surface"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-on-surface-variant">
                Logged in as: <span className="font-medium">{user?.email}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
