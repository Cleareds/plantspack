import Link from 'next/link'
import { ArrowLeft, Cookie } from 'lucide-react'

export const metadata = {
  title: 'Cookie Policy — How PlantsPack Uses Cookies | PlantsPack',
  description: 'PlantsPack uses a minimal set of cookies for authentication, saved preferences, and anonymous analytics. No third-party ad cookies. Read the full policy here.',
  alternates: { canonical: 'https://plantspack.com/legal/cookies' },
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-primary hover:text-primary-container transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-surface-container-low rounded-full">
              <Cookie className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-on-surface mb-4">
            Cookie Policy
          </h1>
          <p className="text-on-surface-variant">
            Last updated: January 8, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              What Are Cookies?
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Cookies are small text files that are placed on your device when you visit our website.
              They help us provide you with a better experience by remembering your preferences and
              understanding how you use PlantsPack.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              How We Use Cookies
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-on-surface mb-2">
                  Essential Cookies
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  These cookies are necessary for the website to function properly. They enable
                  core functionality such as security, authentication, and accessibility features.
                </p>
                <ul className="list-disc list-inside text-on-surface-variant mt-2 ml-4 space-y-1">
                  <li>Session management</li>
                  <li>User authentication</li>
                  <li>Security and fraud prevention</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-on-surface mb-2">
                  Analytics Cookies
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  We use Google Analytics to understand how visitors interact with our website.
                  This helps us improve our service and user experience.
                </p>
                <ul className="list-disc list-inside text-on-surface-variant mt-2 ml-4 space-y-1">
                  <li>Page views and navigation patterns</li>
                  <li>Feature usage statistics</li>
                  <li>Performance monitoring</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-on-surface mb-2">
                  Preference Cookies
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  These cookies remember your preferences and choices to provide a personalized experience.
                </p>
                <ul className="list-disc list-inside text-on-surface-variant mt-2 ml-4 space-y-1">
                  <li>Language preferences</li>
                  <li>Display settings</li>
                  <li>Saved filters and preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              Third-Party Cookies
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              We use the following third-party services that may set cookies:
            </p>
            <ul className="list-disc list-inside text-on-surface-variant ml-4 space-y-2">
              <li>
                <strong>Google Analytics:</strong> For website analytics and usage tracking
              </li>
              <li>
                <strong>Stripe:</strong> For secure payment processing (subscription payments)
              </li>
              <li>
                <strong>Supabase:</strong> For authentication and database services
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              Managing Cookies
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              You can control and manage cookies in several ways:
            </p>
            <div className="bg-primary-container/20 border border-primary-container rounded-lg p-4">
              <h3 className="font-semibold text-on-surface mb-2">
                Browser Settings
              </h3>
              <p className="text-on-surface-variant leading-relaxed mb-2">
                Most browsers allow you to:
              </p>
              <ul className="list-disc list-inside text-on-surface-variant ml-4 space-y-1">
                <li>View what cookies are stored and delete them individually</li>
                <li>Block third-party cookies</li>
                <li>Block all cookies from specific websites</li>
                <li>Block all cookies from being set</li>
                <li>Delete all cookies when you close your browser</li>
              </ul>
            </div>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              Please note that blocking all cookies may affect your ability to use certain features
              of PlantsPack.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              Cookie Retention
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Different cookies have different retention periods:
            </p>
            <ul className="list-disc list-inside text-on-surface-variant ml-4 space-y-2 mt-2">
              <li>
                <strong>Session cookies:</strong> Deleted when you close your browser
              </li>
              <li>
                <strong>Persistent cookies:</strong> Remain for a set period (typically up to 1 year)
              </li>
              <li>
                <strong>Analytics cookies:</strong> Typically expire after 2 years
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              Updates to This Policy
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              We may update this Cookie Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-on-surface mb-4">
              Contact Us
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-on-surface-variant">
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:hello@cleareds.com"
                  className="text-primary hover:text-primary-container transition-colors"
                >
                  hello@cleareds.com
                </a>
              </p>
              <p className="text-on-surface-variant mt-2">
                <strong>Contact Form:</strong>{' '}
                <Link
                  href="/contact"
                  className="text-primary hover:text-primary-container transition-colors"
                >
                  Contact Page
                </Link>
              </p>
            </div>
          </section>
        </div>

        {/* Back to Top */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-primary hover:text-primary-container font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
