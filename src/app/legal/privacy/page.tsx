'use client'

import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-green max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to PlantsPack. We respect your privacy and are committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, store, and protect your information when you use
              our platform.
            </p>
            <p className="text-gray-700 mb-4">
              This policy applies to all users of PlantsPack, regardless of location. For users in the European
              Union, we comply with the General Data Protection Regulation (GDPR).
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
            <p className="text-gray-700 mb-4">
              When you create an account and use PlantsPack, we collect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Account Information:</strong> Username, email address, password (encrypted), name, and profile picture</li>
              <li><strong>Profile Information:</strong> Bio, preferences, and any other information you choose to add</li>
              <li><strong>Content:</strong> Posts, comments, images, videos, and other content you create or share</li>
              <li><strong>Location Data:</strong> If you choose to share your location, we collect city and region data (paid tier feature)</li>
              <li><strong>Payment Information:</strong> For paid subscriptions, processed securely through Stripe (we do not store full payment details)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-gray-700 mb-4">
              When you use PlantsPack, we automatically collect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Usage Data:</strong> How you interact with the platform, features you use, and time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>IP Address:</strong> For security and analytics purposes</li>
              <li><strong>Cookies:</strong> Small data files stored on your device (see Cookie Policy below)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Provide Services:</strong> Create and maintain your account, enable posting and social features</li>
              <li><strong>Personalize Experience:</strong> Show relevant content and connections based on your interests</li>
              <li><strong>Communication:</strong> Send important updates, notifications, and respond to inquiries</li>
              <li><strong>Security:</strong> Protect against fraud, abuse, and unauthorized access</li>
              <li><strong>Moderation:</strong> Enforce Community Guidelines and Terms of Service</li>
              <li><strong>Analytics:</strong> Understand how users interact with PlantsPack to improve our services</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and respond to lawful requests</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Legal Basis for Processing (GDPR)</h2>
            <p className="text-gray-700 mb-4">
              For EU users, we process your data based on:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Contract:</strong> To provide services you've requested</li>
              <li><strong>Consent:</strong> When you've given explicit permission (e.g., location sharing)</li>
              <li><strong>Legitimate Interests:</strong> To improve our services, ensure security, and prevent abuse</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Other Users:</strong> Your public profile and posts are visible to other users as per your privacy settings</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate (e.g., Supabase for database, Stripe for payments)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your data for as long as:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Your account is active</li>
              <li>Needed to provide services</li>
              <li>Required by law</li>
            </ul>
            <p className="text-gray-700 mb-4">
              When you delete your account, we remove or anonymize your personal data within 30 days, except where
              retention is required by law or for legitimate business purposes (e.g., preventing abuse).
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-700 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
              <li><strong>Complaint:</strong> Lodge a complaint with your data protection authority</li>
            </ul>
            <p className="text-gray-700 mb-4">
              To exercise these rights, contact us at hello@cleareds.com or through your account settings.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Encryption of data in transit (HTTPS) and at rest</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Monitoring for suspicious activity</li>
            </ul>
            <p className="text-gray-700 mb-4">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute
              security but take all reasonable precautions to protect your information.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack uses cookies to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-700 mb-4">
              You can manage cookie preferences in your browser settings or through our cookie consent banner.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack integrates with third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
            </ul>
            <p className="text-gray-700 mb-4">
              These services have their own privacy policies. We encourage you to review them.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              PlantsPack is not intended for users under 16 years of age. We do not knowingly collect information
              from children. If you believe a child has provided us with personal data, please contact us immediately.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your data may be processed in countries outside your residence. We ensure appropriate safeguards
              are in place to protect your data in accordance with this Privacy Policy and applicable laws.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Changes to Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via
              email or platform notification. Your continued use of PlantsPack after changes constitutes acceptance
              of the updated policy.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <ul className="list-none text-gray-700 mb-4 space-y-2">
              <li><strong>Email:</strong> hello@cleareds.com</li>
              <li><strong>Contact Form:</strong>{' '}
                <Link href="/contact" className="text-green-600 hover:text-green-700 underline">
                  Contact Us
                </Link>
              </li>
            </ul>
            <p className="text-gray-700 mb-4">
              For GDPR-related inquiries or to exercise your data rights, please include "GDPR Request" in your
              subject line.
            </p>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                By using PlantsPack, you acknowledge that you have read and understood this Privacy Policy.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/legal/terms"
                  className="text-green-600 hover:text-green-700 underline text-sm"
                >
                  Terms of Service
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
