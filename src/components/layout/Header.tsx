'use client'

import {useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {useAuth} from '@/lib/auth'
import {Menu, X, Home, Map, User, Crown, Package} from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const {user, profile} = useAuth()

    const username = profile?.username || user?.user_metadata?.username

    return (
        <header className="glass-nav ghost-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3">
                        <Image
                            src="/plantspack-logo-real.svg"
                            alt="PlantsPack Logo"
                            width={48}
                            height={48}
                            className="object-contain"
                        />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-on-surface tracking-editorial leading-[1.1]">PLANTS PACK</span>
                            <span className="text-sm font-light text-on-surface-variant leading-[1.1]">vegan syndicate</span>
                        </div>
                        <span className="text-xs font-semibold text-on-secondary bg-secondary-container px-2 py-1 rounded-full">
              BETA
            </span>
                    </Link>

                    {/* Search Bar - Only for logged in users */}
                    {user && (
                        <div className="hidden md:block flex-1 max-w-lg mx-8">
                            <SearchBar/>
                        </div>
                    )}

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/"
                            className="flex items-center space-x-1 text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <Home className="h-5 w-5"/>
                            <span>Feed</span>
                        </Link>
                        <Link
                            href="/map"
                            className="flex items-center space-x-1 text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <Map className="h-5 w-5"/>
                            <span>Map</span>
                        </Link>
                        <Link
                            href="/packs"
                            className="flex items-center space-x-1 text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <Package className="h-5 w-5"/>
                            <span>Packs</span>
                        </Link>
                        <Link
                            href="/support"
                            className="flex items-center space-x-1 text-on-surface-variant hover:text-primary transition-colors"
                        >
                            <Crown className="h-5 w-5"/>
                            <span>Support Us</span>
                        </Link>
                        {user && username && (
                            <>
                                <Link
                                    href={`/profile/${username}`}
                                    className="flex items-center space-x-1 text-on-surface-variant hover:text-primary transition-colors"
                                >
                                    <User className="h-5 w-5"/>
                                    <span>Profile</span>
                                </Link>
                                <NotificationBell/>
                            </>
                        )}
                        {!user && (
                            <Link
                                href="/auth"
                                className="silk-gradient text-on-primary px-4 py-2 rounded-full font-medium transition-all hover:opacity-90"
                            >
                                Sign In
                            </Link>
                        )}
                    </nav>

                    {user && username && (
                        <>
                            <div className="sm:hidden px-1 py-2">
                                <NotificationBell/>
                            </div>
                        </>
                    )}

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                    >
                        {isMenuOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden glass-float border-t border-outline-variant/15">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {/* Mobile Search Bar - Only for logged in users */}
                        {user && (
                            <div className="px-3 py-2">
                                <SearchBar/>
                            </div>
                        )}
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                        >
                            <Home className="h-5 w-5"/>
                            <span>Feed</span>
                        </Link>
                        <Link
                            href="/map"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                        >
                            <Map className="h-5 w-5"/>
                            <span>Map</span>
                        </Link>
                        <Link
                            href="/packs"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                        >
                            <Package className="h-5 w-5"/>
                            <span>Packs</span>
                        </Link>
                        <Link
                            href="/support"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                        >
                            <Crown className="h-5 w-5"/>
                            <span>Support Us</span>
                        </Link>
                        {user && username && (
                            <>
                                <Link
                                    href={`/profile/${username}`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                                >
                                    <User className="h-5 w-5"/>
                                    <span>Profile</span>
                                </Link>
                            </>
                        )}
                        {!user && (
                            <Link
                                href="/auth"
                                onClick={() => setIsMenuOpen(false)}
                                className="block px-3 py-2 rounded-full text-center silk-gradient text-on-primary font-medium"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
