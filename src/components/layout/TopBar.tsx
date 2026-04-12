'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import SearchBar from '@/components/search/SearchBar'
import VeganToggle from '@/components/ui/VeganToggle'
import NotificationBell from '@/components/notifications/NotificationBell'
import { Search, Menu, X, Heart, HelpCircle, Mail } from 'lucide-react'

export default function TopBar() {
  const { user } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchOverlayRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (searchOverlayRef.current && !searchOverlayRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-50 bg-surface/80 backdrop-blur-lg">
      <div className="flex justify-between items-center px-4 md:px-8 h-20">
        {/* Mobile logo (shown only on mobile where sidebar is hidden) */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/plantspack-logo-real.svg"
            alt="PlantsPack Logo"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="font-headline font-extrabold text-primary text-xl tracking-tight">Plants Pack</span>
        </Link>

        {/* Search Bar - center (desktop only) */}
        <div className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-1.5 gap-2 flex-1 max-w-lg mx-auto">
          <SearchBar />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
          <button
            onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false) }}
            className="md:hidden p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Toggle search"
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          {user && <NotificationBell />}
          {!user && (
            <Link
              href="/auth"
              className="hidden sm:inline-flex bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-all"
            >
              Sign In
            </Link>
          )}

          {/* Mobile hamburger menu */}
          <div ref={menuRef} className="relative md:hidden">
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false) }}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest glass-float shadow-ambient rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-2">
                  {/* Company */}
                  <div className="px-4 py-2">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Company</span>
                  </div>
                  <Link href="/about" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>info</span>
                    <span className="text-sm text-on-surface">About PlantsPack</span>
                  </Link>
                  <Link href="/roadmap" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>map</span>
                    <span className="text-sm text-on-surface">Roadmap</span>
                  </Link>
                  <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>mail</span>
                    <span className="text-sm text-on-surface">Contact Us</span>
                  </Link>
                  <Link href="/support" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <Heart className="h-5 w-5 text-primary" />
                    <span className="text-sm text-on-surface">Support Us</span>
                  </Link>

                  <div className="my-1 border-t border-outline-variant/15" />

                  {/* Resources */}
                  <div className="px-4 py-2">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Resources</span>
                  </div>
                  <Link href="/support" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>payments</span>
                    <span className="text-sm text-on-surface">Pricing</span>
                  </Link>
                  <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <HelpCircle className="h-5 w-5 text-on-surface-variant" />
                    <span className="text-sm text-on-surface">Help Center</span>
                  </Link>
                  <a href="mailto:hello@cleareds.com" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <Mail className="h-5 w-5 text-on-surface-variant" />
                    <span className="text-sm text-on-surface">Email Support</span>
                  </a>

                  <div className="my-1 border-t border-outline-variant/15" />

                  {/* Legal */}
                  <div className="px-4 py-2">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Legal</span>
                  </div>
                  <Link href="/legal/privacy" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>shield</span>
                    <span className="text-sm text-on-surface">Privacy Policy</span>
                  </Link>
                  <Link href="/legal/terms" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>description</span>
                    <span className="text-sm text-on-surface">Terms of Service</span>
                  </Link>
                  <Link href="/legal/cookies" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>cookie</span>
                    <span className="text-sm text-on-surface">Cookie Policy</span>
                  </Link>

                  <div className="my-1 border-t border-outline-variant/15" />

                  {/* Social */}
                  <div className="flex items-center justify-center gap-6 py-3">
                    <a href="https://x.com/plantspackX" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors" aria-label="X (Twitter)">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </a>
                    <a href="https://www.instagram.com/plants.pack/" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Instagram">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                    </a>
                    <a href="https://www.facebook.com/profile.php?id=61583784658664" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Facebook">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {isSearchOpen && (
        <div ref={searchOverlayRef} className="md:hidden px-4 pb-3 bg-surface/95 backdrop-blur-lg border-b border-outline-variant/15">
          <div className="bg-surface-container-low rounded-full px-4 py-1.5">
            <SearchBar className="mobile-search" />
          </div>
        </div>
      )}
    </header>
  )
}
