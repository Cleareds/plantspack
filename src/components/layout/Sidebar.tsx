'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import VeganToggle from '@/components/ui/VeganToggle'
import { NAV_PILLARS, type NavPillar } from '@/lib/nav'
import { SPROUTS_ENABLED_FOR_ALL } from '@/lib/sprouts-constants'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const username = profile?.username || user?.user_metadata?.username

  const childActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')
  // A section defaults to open when the current route is inside it; clicking the
  // chevron overrides that default.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const isOpen = (p: NavPillar) =>
    p.key in overrides ? overrides[p.key] : !!p.children?.some((c) => childActive(c.href))
  const toggle = (p: NavPillar) => setOverrides((o) => ({ ...o, [p.key]: !isOpen(p) }))

  return (
    <aside className="hidden lg:flex flex-col p-6 gap-4 h-screen w-64 bg-surface fixed left-0 top-0 z-40 font-body">
      {/* Logo */}
      <Link href="/" className="flex items-center mb-3">
        <Image
          src="/plantspack.svg"
          alt="PlantsPack"
          width={1967}
          height={233}
          className="h-7 w-auto"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {NAV_PILLARS.map((pillar) => {
          const parentActive = pathname?.startsWith(pillar.href)

          // Leaf pillar (no children): a plain icon + label link.
          if (!pillar.children?.length) {
            return (
              <Link
                key={pillar.key}
                href={pillar.href}
                prefetch={false}
                aria-current={parentActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  parentActive
                    ? 'text-primary font-bold bg-surface-container-low'
                    : 'text-on-surface-variant hover:bg-surface-container-low/50'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={parentActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {pillar.icon}
                </span>
                <span className="text-sm font-medium">{pillar.label}</span>
              </Link>
            )
          }

          // Expandable section: icon + label links to the hub; chevron toggles children.
          const open = isOpen(pillar)
          return (
            <div key={pillar.key}>
              <div
                className={`flex items-center rounded-xl transition-colors ${
                  parentActive ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/50'
                }`}
              >
                <Link
                  href={pillar.href}
                  prefetch={false}
                  aria-current={parentActive ? 'page' : undefined}
                  className={`flex flex-1 items-center gap-3 px-4 py-3 ${
                    parentActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={parentActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {pillar.icon}
                  </span>
                  <span className="text-sm font-medium">{pillar.label}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(pillar)}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${pillar.label}`}
                  aria-expanded={open}
                  className="flex items-center self-stretch px-3 text-on-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg leading-none">
                    {open ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>
              {open && (
                <div className="mt-0.5 mb-1">
                  {pillar.children.map((child) => {
                    const active = childActive(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch={false}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center pl-12 pr-4 py-2 rounded-xl transition-all duration-300 ${
                          active
                            ? 'text-primary font-bold bg-surface-container-low'
                            : 'text-on-surface-variant hover:bg-surface-container-low/50'
                        }`}
                      >
                        <span className="text-sm font-medium">{child.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto space-y-4">
        {!user && (
          <Link
            href="/auth?mode=signin"
            data-event="cta_click_signup"
            data-cta="sign_in"
            data-from="sidebar"
            className="w-full block text-center bg-primary text-on-primary-btn py-4 rounded-full font-bold text-sm tracking-wide shadow-lg shadow-primary/10 hover:opacity-90 transition-all"
          >
            Sign In
          </Link>
        )}

        <Link
          href="/app"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low/50 transition-all"
        >
          <span className="material-symbols-outlined text-lg">smartphone</span>
          Get the app
        </Link>

        <Link
          href="/support"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary ghost-border hover:bg-primary/5 transition-all"
        >
          <span className="material-symbols-outlined text-lg">volunteer_activism</span>
          Support Us
        </Link>

        {user && username && (
          <Link
            href={`/profile/${username}`}
            className="flex items-center gap-3 pt-4 border-t border-outline-variant/15 px-2 py-1 rounded-lg hover:bg-surface-container-low/50 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold">
                {profile?.first_name?.[0] || username[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface truncate">{profile?.first_name || username}</p>
              <p className="text-xs text-on-surface-variant">View Profile</p>
            </div>
            {(SPROUTS_ENABLED_FOR_ALL || (profile as any)?.role === 'admin') && ((profile as any)?.sprouts_lifetime ?? 0) > 0 && (
              <span
                title={`${((profile as any).sprouts_lifetime).toLocaleString()} Sprouts (lifetime)`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold whitespace-nowrap"
              >
                <span aria-hidden>🌱</span>
                {((profile as any).sprouts_lifetime).toLocaleString()}
              </span>
            )}
          </Link>
        )}
      </div>
    </aside>
  )
}
