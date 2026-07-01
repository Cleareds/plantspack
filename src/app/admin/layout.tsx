'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'
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
  Star,
  BookOpen,
  Smartphone,
  Megaphone,
  Layers,
  Sparkles,
  Inbox,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

type NavLeaf = { name: string; href: string; icon: LucideIcon }
type NavGroup = { group: string; icon: LucideIcon; collapsible: boolean; defaultOpen: boolean; children: NavLeaf[] }
type NavNode = NavLeaf | NavGroup
const isGroup = (n: NavNode): n is NavGroup => 'group' in n

// Grouped admin nav. "Content" = things we publish; "Contributions" = user-
// generated content that lands on the site (always open); "Moderation & Inbox"
// = inbound queues awaiting an admin action.
const NAV: NavNode[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    group: 'Content', icon: Layers, collapsible: true, defaultOpen: false,
    children: [
      { name: 'Posts', href: '/admin/posts', icon: FileText },
      { name: 'Places', href: '/admin/places', icon: MapPin },
      { name: 'Recipes', href: '/admin/recipes', icon: ChefHat },
      { name: 'Events', href: '/admin/events', icon: Calendar },
      { name: 'Staging', href: '/admin/staging', icon: Shield },
    ],
  },
  {
    group: 'Contributions', icon: Sparkles, collapsible: false, defaultOpen: true,
    children: [
      { name: 'Reviews', href: '/admin/reviews', icon: Star },
      { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
      { name: 'Mobile Submissions', href: '/admin/submissions', icon: Smartphone },
      { name: 'Data Quality', href: '/admin/data-quality', icon: BarChart3 },
    ],
  },
  {
    group: 'Moderation & Inbox', icon: Inbox, collapsible: true, defaultOpen: false,
    children: [
      { name: 'Reports', href: '/admin/reports', icon: Flag },
      { name: 'Corrections', href: '/admin/corrections', icon: PenLine },
      { name: 'Business Claims', href: '/admin/claims', icon: Building2 },
      { name: 'Contact Forms', href: '/admin/contact', icon: Mail },
    ],
  },
  { name: 'Blog', href: '/admin/blog', icon: BookOpen },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Notifications', href: '/admin/notifications', icon: Megaphone },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, authReady } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : !!pathname?.startsWith(href)

  // Collapsible-group open state, seeded from defaultOpen and auto-expanded for
  // whichever group contains the current route.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const n of NAV) {
      if (isGroup(n)) init[n.group] = n.defaultOpen || n.children.some((c) => isActive(c.href))
    }
    return init
  })
  const toggleGroup = (g: string) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }))

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

  const renderLeaf = (item: NavLeaf, nested = false) => {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${nested ? 'ml-3' : ''} ${
          active ? 'bg-white/10 text-white font-medium' : 'text-outline-variant hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span>{item.name}</span>
      </Link>
    )
  }

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

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {NAV.map((node) => {
            if (!isGroup(node)) return renderLeaf(node)
            const GroupIcon = node.icon
            const open = node.collapsible ? (openGroups[node.group] ?? node.defaultOpen) : true
            return (
              <div key={node.group} className="pt-3">
                {node.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(node.group)}
                    className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-outline hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4" />
                      {node.group}
                    </span>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-outline">
                    <GroupIcon className="h-4 w-4" />
                    {node.group}
                  </div>
                )}
                {open && <div className="mt-1 space-y-1">{node.children.map((c) => renderLeaf(c, true))}</div>}
              </div>
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
