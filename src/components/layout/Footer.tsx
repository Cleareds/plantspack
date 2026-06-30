import Link from 'next/link'
import { Heart } from 'lucide-react'
import Image from "next/image";
import AppBadges from '@/components/app/AppBadges'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-surface-container-low mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/plantspack.svg"
                        alt="PlantsPack"
                        width={1967}
                        height={233}
                        className="h-7 w-auto"
                    />
                </Link>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              A free, community-driven platform for vegans and anyone exploring
              plant-based living. No investors. No ads. No paywalls.
            </p>
            <div className="flex items-center space-x-1 text-sm text-on-surface-variant">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-error fill-current" />
              <span>for vegans</span>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold text-on-surface mb-2">Get the app</p>
              <AppBadges />
            </div>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-on-surface mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  About PlantsPack
                </Link>
              </li>
              <li>
                <Link
                  href="/roadmap"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Roadmap
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Methodology
                </Link>
              </li>
              <li>
                <a
                  href="https://cleareds.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  About Cleareds
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center space-x-1"
                >
                  <span>Support Us</span>
                  <Heart className="h-3 w-3 text-primary" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore Column */}
          <div>
            <h3 className="font-semibold text-on-surface mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/tools"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Vegan Tools
                </Link>
              </li>
              <li>
                <Link
                  href="/city-ranks"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  City Rankings
                </Link>
              </li>
              <li>
                <Link
                  href="/recipes"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Recipes
                </Link>
              </li>
              <li>
                <Link
                  href="/vegan"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Vegan Answers
                </Link>
              </li>
              <li>
                <Link
                  href="/glossary"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Glossary
                </Link>
              </li>
              <li>
                <Link
                  href="/research/vegan-places-2026"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Data Report 2026
                </Link>
              </li>
              <li>
                <Link
                  href="/compare/happycow"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  vs HappyCow
                </Link>
              </li>
              <li>
                <Link
                  href="/vegan-summer-destinations"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Summer Destinations 2026
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-on-surface mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cookies"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/account/delete"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Delete account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-outline-variant/15">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-on-surface-variant text-center md:text-left">
              &copy; {currentYear}{' '}
              <a
                href="https://cleareds.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-container font-medium transition-colors"
              >
                Cleareds
              </a>
              . All rights reserved.
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <a
                href="https://x.com/plantspackX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="X (Twitter)"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/plants.pack/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61583784658664"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
