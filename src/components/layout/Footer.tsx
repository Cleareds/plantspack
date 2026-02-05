import Link from 'next/link'
import { Heart, Mail, HelpCircle, Leaf } from 'lucide-react'
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
                <Link href="/" className="flex items-center space-x-3">
                    <Image
                        src="/plantspack9.png"
                        alt="PlantsPack Logo"
                        width={64}
                        height={64}
                        className="object-contain"
                    />
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-gray-900 leading-[1.1]">PLANTS PACK</span>
                        <span className="text-sm font-light text-gray-600 leading-[1.1]">vegan syndicate</span>
                    </div>
                    <span className="text-xs font-semibold text-white bg-orange-500 px-2 py-1 rounded-full">
              BETA
            </span>
                </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              The world&apos;s most supportive plant-based social network.
              Connect, share, and grow together! 🌱
            </p>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>for vegans</span>
            </div>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://cleareds.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  About Cleareds
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center space-x-1"
                >
                  <span>Support Us</span>
                  <Heart className="h-3 w-3 text-green-600" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/support"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center space-x-1"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Help Center</span>
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@cleareds.com"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors flex items-center space-x-1"
                >
                  <Mail className="h-3 w-3" />
                  <span>Email Support</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cookies"
                  className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-600 text-center md:text-left">
              © {currentYear}{' '}
              <a
                href="https://cleareds.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Cleareds
              </a>
              . All rights reserved.
            </div>

            {/* Social Links / Additional Info */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="hidden sm:inline">
                Building a compassionate community 🌍
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
