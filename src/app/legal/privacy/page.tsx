'use client'

import Link from 'next/link'

/* eslint-disable react/no-unescaped-entities */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">Privacy Policy</h1>
          <p className="text-sm text-on-surface-variant mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-green max-w-none">
            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">1. Introduction</h2>
            <p className="text-on-surface-variant mb-4">
              Welcome to Plants Pack. We respect your privacy and are committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, store, and protect your information when you use
              our platform.
            </p>
            <p className="text-on-surface-variant mb-4">
              This policy applies to all users of Plants Pack, regardless of location. For users in the European
              Union, we comply with the General Data Protection Regulation (GDPR).
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">2.1 Information You Provide</h3>
            <p className="text-on-surface-variant mb-4">
              When you create an account and use Plants Pack, we collect:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Account Information:</strong> Username, email address, password (encrypted), name, and profile picture</li>
              <li><strong>Profile Information:</strong> Bio, preferences, and any other information you choose to add</li>
              <li><strong>Content:</strong> Posts, comments, images, videos, recipes, events, and other content you create or share</li>
              <li><strong>Location Data:</strong> If you choose to share your location or add vegan places, we collect city, country, and coordinate data</li>
              <li><strong>Places Data:</strong> When you add or review vegan places, we collect the place name, address, coordinates, category, images, and reviews</li>
              <li><strong>Payment Information:</strong> For voluntary supporter donations, processed securely through Stripe (we do not store full payment details)</li>
            </ul>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-on-surface-variant mb-4">
              When you use Plants Pack, we automatically collect:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Usage Data:</strong> How you interact with the platform, features you use, and time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>IP Address:</strong> For security and analytics purposes</li>
              <li><strong>Cookies:</strong> Small data files stored on your device (see Cookie Policy below)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-on-surface-variant mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Provide Services:</strong> Create and maintain your account, enable posting and social features</li>
              <li><strong>Personalize Experience:</strong> Show relevant content and connections based on your interests</li>
              <li><strong>Communication:</strong> Send transactional emails (account confirmations, notifications you've enabled, password resets) and respond to inquiries</li>
              <li><strong>Security:</strong> Protect against fraud, abuse, and unauthorized access</li>
              <li><strong>Moderation:</strong> Enforce Community Guidelines and Terms of Service</li>
              <li><strong>Analytics:</strong> Understand how users interact with Plants Pack to improve our services</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and respond to lawful requests</li>
            </ul>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">3.1 Marketing Communications (Optional)</h3>
            <p className="text-on-surface-variant mb-4">
              If you opt in — either by ticking the newsletter checkbox at signup or by enabling the
              preference in your account settings — we may send you a periodic newsletter covering
              new vegan places, top-rated spots, and platform updates. We send these emails on the
              basis of your <strong>explicit consent</strong> under GDPR Article 6(1)(a).
            </p>
            <p className="text-on-surface-variant mb-4">
              You can withdraw consent at any time by (a) toggling the newsletter preference off in
              your account settings, (b) clicking the unsubscribe link included in every newsletter,
              or (c) emailing hello@plantspack.com. Withdrawal takes effect immediately and does not
              affect transactional emails you receive for account activity (confirmations, notifications
              you've enabled, password resets, claim responses) — those continue regardless of your
              newsletter preference because they are necessary for operating your account.
            </p>
            <p className="text-on-surface-variant mb-4">
              We never pre-tick the newsletter checkbox, never bundle it into Terms acceptance, and
              never share your email address with third-party marketers. We keep a record of when
              and how you consented (required for GDPR audit) and preserve unsubscribe history
              indefinitely so we can prove we respected your choice.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">4. Legal Basis for Processing (GDPR)</h2>
            <p className="text-on-surface-variant mb-4">
              For EU users, we process your data based on:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Contract:</strong> To provide services you've requested</li>
              <li><strong>Consent:</strong> When you've given explicit permission (e.g., location sharing)</li>
              <li><strong>Legitimate Interests:</strong> To improve our services, ensure security, and prevent abuse</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
            </ul>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">5. Information Sharing and Disclosure</h2>
            <p className="text-on-surface-variant mb-4">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Other Users:</strong> Your public profile and posts are visible to other users as per your privacy settings</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate (e.g., Supabase for database, Stripe for payments)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition</li>
            </ul>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">6. Data Retention</h2>
            <p className="text-on-surface-variant mb-4">
              We retain your data for as long as:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li>Your account is active</li>
              <li>Needed to provide services</li>
              <li>Required by law</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              When you delete your account, we remove or anonymize your personal data within 30 days, except where
              retention is required by law or for legitimate business purposes (e.g., preventing abuse).
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">7. Your Privacy Rights</h2>
            <p className="text-on-surface-variant mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
              <li><strong>Complaint:</strong> Lodge a complaint with your data protection authority</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              To exercise these rights, contact us at hello@plantspack.com or through your account settings.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">8. Data Security</h2>
            <p className="text-on-surface-variant mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li>Encryption of data in transit (HTTPS) and at rest</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Monitoring for suspicious activity</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute
              security but take all reasonable precautions to protect your information.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">9. Cookies and Tracking</h2>
            <p className="text-on-surface-variant mb-4">
              Plants Pack uses cookies to:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              You can manage cookie preferences in your browser settings or through our cookie consent banner.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">10. Third-Party Services</h2>
            <p className="text-on-surface-variant mb-4">
              Plants Pack integrates with third-party services:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing for voluntary supporter donations</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
              <li><strong>OpenStreetMap:</strong> Map data and geocoding for vegan places</li>
              <li><strong>OpenAI:</strong> Content moderation assistance</li>
              <li><strong>Resend:</strong> Transactional email delivery</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              These services have their own privacy policies. We encourage you to review them.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">11. Children's Privacy</h2>
            <p className="text-on-surface-variant mb-4">
              Plants Pack is not intended for users under 16 years of age. We do not knowingly collect information
              from children. If you believe a child has provided us with personal data, please contact us immediately.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">12. International Data Transfers</h2>
            <p className="text-on-surface-variant mb-4">
              Your data may be processed in countries outside your residence. We ensure appropriate safeguards
              are in place to protect your data in accordance with this Privacy Policy and applicable laws.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">13. Changes to Privacy Policy</h2>
            <p className="text-on-surface-variant mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via
              email or platform notification. Your continued use of Plants Pack after changes constitutes acceptance
              of the updated policy.
            </p>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">14. Mobile Applications (iOS and Android)</h2>
            <p className="text-on-surface-variant mb-4">
              In addition to the website, Plants Pack is available as a mobile application on iOS
              (Apple App Store, bundle identifier <code>com.plantspack.app</code>) and Android
              (Google Play, package <code>plantspack.app</code>). Everything in this Privacy Policy
              applies to the mobile apps. The sections below describe the additional, mobile-specific
              data handling required by Apple App Store and Google Play disclosure rules.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.1 Device Permissions We Request</h3>
            <p className="text-on-surface-variant mb-4">
              The mobile app asks for the following operating-system permissions only when you use the
              feature that needs them. You can decline any of them and continue using the rest of the app.
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li>
                <strong>Location (When-In-Use only):</strong> Used to centre the map on your current
                position and to show vegan places near you. We never collect location in the background,
                we do not build a location history, and we do not sell or share precise location data
                with third parties for advertising. Location is processed in memory to query nearby
                places and is not retained.
              </li>
              <li>
                <strong>Camera:</strong> Used by the barcode scanner, ingredient-label scanner, menu
                scanner, and to take a photo when you suggest a new place. Photos taken in scanners are
                used only for the scan itself.
              </li>
              <li>
                <strong>Photo Library:</strong> Used so you can pick an existing photo to scan or to
                attach to a place suggestion. We access only the images you select; we do not scan or
                index your library.
              </li>
              <li>
                <strong>Push Notifications:</strong> Optional. Used to send notifications you have
                explicitly subscribed to (for example, updates in cities you follow). You can turn
                push notifications off at any time in your device settings or in the app.
              </li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              The Android app explicitly blocks the advertising ID (<code>AD_ID</code>) permission. We
              do not collect an advertising identifier on either platform, and we do not use device
              identifiers for advertising or cross-app tracking.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.2 Photos You Scan (AI Scanners)</h3>
            <p className="text-on-surface-variant mb-4">
              When you use the ingredient scanner, menu scanner, or barcode scanner, the image you
              capture is sent over an encrypted connection to our servers and forwarded to a third-party
              AI provider (OpenAI) which extracts and classifies the text. Images are not stored on our
              servers after the scan response is returned, are not used to train any AI model, and are
              not associated with your account in a way that lets us re-identify what you scanned.
              OpenAI processes the request under its API data-usage terms (no training, retained briefly
              for abuse monitoring). If you do not want to use a third-party AI provider, do not use
              the scanner tools — every other feature works without them.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.3 Sign in with Apple</h3>
            <p className="text-on-surface-variant mb-4">
              The iOS app supports Sign in with Apple. When you use it, Apple shares with us a stable
              user identifier and either your real email address or a private relay email address
              (your choice at sign-in). We use this identifier solely to create and authenticate your
              Plants Pack account. We do not receive any other information from your Apple ID.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.4 Data Collection Summary (Apple App Privacy / Google Data Safety)</h3>
            <p className="text-on-surface-variant mb-4">
              For Apple App Store &ldquo;App Privacy&rdquo; and Google Play &ldquo;Data Safety&rdquo;
              disclosures, the following categories apply to Plants Pack:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Contact Info — Email Address:</strong> Collected, linked to identity, used for account functionality and (if you opt in) the newsletter. Not used for tracking.</li>
              <li><strong>Identifiers — User ID:</strong> Collected, linked to identity, used for account functionality and analytics. Not used for tracking.</li>
              <li><strong>User Content — Photos, Reviews, Place Suggestions, Posts:</strong> Collected, linked to identity, used for app functionality. You choose what to submit.</li>
              <li><strong>Location — Precise / Coarse:</strong> Collected only while the app is open and only after you grant permission. Used for app functionality (showing nearby places). Not linked to identity unless you save a place or write a review. Not used for tracking.</li>
              <li><strong>Usage Data — Product Interaction:</strong> Collected, linked to identity, used for analytics and to improve the app. Not used for tracking.</li>
              <li><strong>Diagnostics — Crash and Performance Data:</strong> Collected, not linked to identity, used to fix bugs.</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              We do <strong>not</strong> collect: financial information (subscriptions are web-only,
              handled by Stripe), health or fitness data, sensitive demographic data, contacts, search
              history outside the app, browsing history, audio recordings, or your advertising
              identifier. We do <strong>not</strong> use your data for third-party advertising or
              cross-app tracking, and we do not share your data with data brokers.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.5 Account Deletion (In-App)</h3>
            <p className="text-on-surface-variant mb-4">
              Per Apple App Store guideline 5.1.1(v) and Google Play account-deletion policy, you can
              delete your Plants Pack account and associated personal data directly from the app:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li>Open the app and go to <strong>Profile → Account → Delete account</strong>, or</li>
              <li>Visit{' '}
                <Link href="/data-deletion-confirmation" className="text-primary hover:text-primary-container underline">
                  plantspack.com/data-deletion-confirmation
                </Link>{' '}
                from any browser (no app install required), or
              </li>
              <li>Email <a href="mailto:hello@plantspack.com" className="text-primary hover:text-primary-container underline">hello@plantspack.com</a> with &ldquo;Delete my account&rdquo; in the subject line.</li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              Deletion removes or anonymises your account, profile, saved places, followed cities,
              reviews, comments, and posts within 30 days. We retain a minimal record of the deletion
              itself (account ID and timestamp) to honour the request if you re-register and for legal
              audit purposes, and we may retain content unrelated to your identity (for example, a
              place you suggested that has since been independently verified) in anonymised form.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.6 Children</h3>
            <p className="text-on-surface-variant mb-4">
              The mobile apps are rated for users aged 13 and over on Google Play and 12+ on the Apple
              App Store, however account creation requires you to be at least 16 years old, consistent
              with Section 11 of this policy. We do not knowingly collect data from children under that
              age. The apps are not directed at children, do not include behavioural advertising, and
              do not participate in Apple&rsquo;s Kids Category or Google Play&rsquo;s Designed for
              Families programme.
            </p>

            <h3 className="text-xl font-semibold text-on-surface mt-6 mb-3">14.7 Mobile-Specific Third Parties</h3>
            <p className="text-on-surface-variant mb-4">
              The mobile apps additionally interact with:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant mb-4 space-y-2">
              <li><strong>Apple Push Notification service (APNs)</strong> and <strong>Firebase Cloud Messaging (FCM)</strong>: route push notifications you have opted into. Your device token is shared with Apple/Google for delivery only.</li>
              <li><strong>OpenFreeMap</strong> and the underlying <strong>OpenStreetMap</strong> tile servers: serve the base map tiles. Your IP address is visible to the tile server when tiles are requested; this is standard for any map-based app and the tile server does not receive your account identity.</li>
              <li><strong>Expo Application Services (EAS)</strong>: delivers over-the-air JavaScript updates for the app. EAS receives the app version and platform, not personal data.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-on-surface mt-8 mb-4">15. Contact Us</h2>
            <p className="text-on-surface-variant mb-4">
              If you have questions about this Privacy Policy or how we handle your data, please contact us.
              Plants Pack is operated by Cleareds, a company registered in Belgium.
            </p>
            <ul className="list-none text-on-surface-variant mb-4 space-y-2">
              <li><strong>Data Controller:</strong> Cleareds (Belgium)</li>
              <li><strong>Email:</strong> hello@plantspack.com</li>
              <li><strong>Contact Form:</strong>{' '}
                <Link href="/contact" className="text-primary hover:text-primary-container underline">
                  Contact Us
                </Link>
              </li>
            </ul>
            <p className="text-on-surface-variant mb-4">
              For GDPR-related inquiries or to exercise your data rights, please include "GDPR Request" in your
              subject line.
            </p>

            <div className="mt-12 pt-8 border-t border-outline-variant/15">
              <p className="text-sm text-on-surface-variant mb-4">
                By using Plants Pack, you acknowledge that you have read and understood this Privacy Policy.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/legal/terms"
                  className="text-primary hover:text-primary-container underline text-sm"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/legal/guidelines"
                  className="text-primary hover:text-primary-container underline text-sm"
                >
                  Community Guidelines
                </Link>
                <Link
                  href="/contact"
                  className="text-primary hover:text-primary-container underline text-sm"
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
