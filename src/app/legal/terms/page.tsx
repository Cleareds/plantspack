'use client'

import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-green max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              Welcome to PlantsPack! By accessing or using our platform, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack is a social networking platform designed for individuals who embrace a vegan, plant-based, and
              animal-friendly lifestyle. Our mission is to create a drama-light, supportive community where users can:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Share their plant-based journey and experiences</li>
              <li>Discover and share vegan-friendly places and resources</li>
              <li>Connect with like-minded individuals</li>
              <li>Build a positive, supportive community</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              To use certain features of PlantsPack, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Community Guidelines</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack is committed to maintaining a drama-light, respectful environment. Users agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Be respectful and kind to all community members</li>
              <li>Focus on plant-based and vegan-related content</li>
              <li>Avoid engaging in harassment, hate speech, or bullying</li>
              <li>Not post spam, misinformation, or misleading content</li>
              <li>Respect intellectual property rights</li>
              <li>Not share explicit, violent, or inappropriate content</li>
            </ul>
            <p className="text-gray-700 mb-4">
              For detailed community standards, please review our{' '}
              <Link href="/legal/guidelines" className="text-green-600 hover:text-green-700 underline">
                Community Guidelines
              </Link>.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Content Ownership and Rights</h2>
            <p className="text-gray-700 mb-4">
              <strong>Your Content:</strong> You retain all ownership rights to the content you post on PlantsPack.
              By posting content, you grant PlantsPack a non-exclusive, worldwide, royalty-free license to use,
              reproduce, modify, and display your content in connection with providing our services.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Platform Content:</strong> All PlantsPack branding, logos, and platform features are owned by
              PlantsPack and protected by intellectual property laws.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Prohibited Activities</h2>
            <p className="text-gray-700 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Use the platform for any illegal purpose</li>
              <li>Impersonate another person or entity</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the platform's operation</li>
              <li>Scrape, data mine, or harvest user information</li>
              <li>Post content promoting violence, hatred, or discrimination</li>
              <li>Engage in commercial activities without prior authorization</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Moderation and Enforcement</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack reserves the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Remove any content that violates these Terms or Community Guidelines</li>
              <li>Suspend or terminate accounts that violate our policies</li>
              <li>Investigate reports of misconduct</li>
              <li>Take appropriate action to maintain a safe community</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Subscription and Payment</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack offers both free and paid subscription tiers:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Free Tier:</strong> Access to core features with limitations on post length and media uploads</li>
              <li><strong>Paid Tiers:</strong> Enhanced features including unlimited posts, video uploads, and location sharing</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Paid subscriptions are billed according to your selected plan. You may cancel your subscription at any time.
              No refunds will be provided for partial billing periods.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Privacy</h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our{' '}
              <Link href="/legal/privacy" className="text-green-600 hover:text-green-700 underline">
                Privacy Policy
              </Link>{' '}
              to understand how we collect, use, and protect your personal information.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Disclaimers and Limitations of Liability</h2>
            <p className="text-gray-700 mb-4">
              <strong>Service Availability:</strong> PlantsPack is provided "as is" without warranties of any kind.
              We do not guarantee uninterrupted or error-free service.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>User Content:</strong> PlantsPack is not responsible for user-generated content. Users are
              solely responsible for their posts and interactions.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Third-Party Links:</strong> We are not responsible for content on external websites linked
              from our platform.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Liability Limitation:</strong> To the fullest extent permitted by law, PlantsPack shall not
              be liable for any indirect, incidental, special, or consequential damages arising from your use of
              the platform.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify and hold PlantsPack harmless from any claims, damages, or expenses arising
              from your use of the platform, your content, or your violation of these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes
              via email or platform notification. Continued use of PlantsPack after changes constitutes acceptance
              of the modified Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Termination</h2>
            <p className="text-gray-700 mb-4">
              Either party may terminate this agreement at any time. You may delete your account through your
              account settings. We may suspend or terminate your account for violations of these Terms. Upon
              termination, your right to use PlantsPack ceases immediately.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard
              to conflict of law principles.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              Any disputes arising from these Terms or your use of PlantsPack shall be resolved through good
              faith negotiation. If negotiation fails, disputes may be resolved through binding arbitration or
              court proceedings as permitted by law.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">16. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none text-gray-700 mb-4 space-y-2">
              <li><strong>Email:</strong> hello@cleareds.com</li>
              <li><strong>Contact Form:</strong>{' '}
                <Link href="/contact" className="text-green-600 hover:text-green-700 underline">
                  Contact Us
                </Link>
              </li>
            </ul>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                By using PlantsPack, you acknowledge that you have read, understood, and agree to be bound by
                these Terms of Service.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/legal/privacy"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/legal/guidelines"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Community Guidelines
                </Link>
                <Link
                  href="/contact"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
