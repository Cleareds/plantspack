import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Delete your account · Plants Pack',
  description: 'How to delete your Plants Pack account and all associated data.',
  robots: { index: true, follow: true },
}

const SUPPORT_EMAIL = 'hello@plantspack.com'

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-surface-container-low px-4 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-outline-variant p-8">
        <h1 className="text-3xl font-bold text-on-surface mb-2">Delete your Plants Pack account</h1>
        <p className="text-on-surface-variant mb-8">
          You can permanently delete your Plants Pack account and the data associated with it at any
          time. This applies to both the website and the mobile app (the same account).
        </p>

        {/* Option 1 — self-serve */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-on-surface mb-3">Delete it yourself (instant)</h2>
          <ol className="list-decimal list-inside space-y-2 text-on-surface-variant">
            <li>Sign in to Plants Pack (website or mobile app).</li>
            <li>Go to your <strong>Profile → Account &amp; privacy</strong> (on the website: Profile → Settings).</li>
            <li>Tap <strong>Delete account</strong> and confirm.</li>
          </ol>
          <Link
            href="/settings"
            className="inline-flex items-center mt-4 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90"
          >
            Go to account settings
          </Link>
        </section>

        {/* Option 2 — request by email */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-on-surface mb-3">Can&apos;t sign in? Request deletion</h2>
          <p className="text-on-surface-variant mb-3">
            If you no longer have access to your account, email us from the address on the account and
            we&apos;ll delete it for you within <strong>30 days</strong>.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account deletion request')}&body=${encodeURIComponent('Please delete my Plants Pack account and associated data. (Send this from the email address on the account.)')}`}
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </section>

        {/* What gets deleted */}
        <section className="rounded-xl bg-surface-container p-5">
          <h2 className="text-base font-semibold text-on-surface mb-2">What gets deleted</h2>
          <p className="text-sm text-on-surface-variant mb-2">
            Deletion is permanent and removes the data tied to your account:
          </p>
          <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
            <li>Your profile (name, username, avatar, bio) and login</li>
            <li>Saved places, followed cities and preferences</li>
            <li>Your reviews, posts, comments and place suggestions</li>
            <li>Tool scan history associated with your account</li>
          </ul>
          <p className="text-sm text-on-surface-variant mt-3">
            Some records may be retained only where required by law (e.g. payment/tax records for
            supporters). Anonymous, aggregated data that can&apos;t identify you may be kept.
          </p>
        </section>

        <p className="text-sm text-outline mt-6">
          Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          See also our <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}
