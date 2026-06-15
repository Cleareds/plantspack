import type { Metadata } from 'next'

// Private tester landing page. Orphan (not linked from nav/footer/sitemap) and
// noindex so it stays unlisted - reachable only by the URL we share.
export const metadata: Metadata = {
  title: 'PlantsPack tester programme',
  description: 'Help test the PlantsPack app before launch.',
  robots: { index: false, follow: false },
}

// Paste these once the test tracks are live:
//  - Android: Play Console -> Closed testing -> copy the "opt-in URL"
//  - iOS:     App Store Connect -> TestFlight -> create a Public Link
const ANDROID_OPT_IN_URL = ''
const IOS_TESTFLIGHT_URL = ''
const SUPPORT_EMAIL = 'hello@plantspack.com'

export default function BetaTestersPage() {
  return (
    <main className="min-h-screen bg-surface-container-low px-4 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-outline-variant p-8">
        <p className="text-sm font-medium text-primary mb-1">Private beta · thanks for helping 🌱</p>
        <h1 className="text-3xl font-bold text-on-surface mb-3">Test the PlantsPack app</h1>
        <p className="text-on-surface-variant mb-8">
          PlantsPack is a vegan map and toolkit: 54,000+ vegan and vegan-friendly places worldwide,
          in-store scanners (barcode, menu, ingredient labels), restaurant cards in 30 languages and
          travel guides. We&apos;re testing it before it hits the app stores - and your feedback shapes
          what ships.
        </p>

        {/* Join */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-on-surface mb-4">Join the test (2 minutes)</h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant p-5">
              <h3 className="font-semibold text-on-surface mb-1">Android</h3>
              <p className="text-sm text-on-surface-variant mb-3">
                Open this on your Android phone, tap <strong>Become a tester</strong>, then install PlantsPack from the Play Store.
              </p>
              {ANDROID_OPT_IN_URL ? (
                <a href={ANDROID_OPT_IN_URL} className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90">
                  Join on Android
                </a>
              ) : (
                <p className="text-sm text-outline italic">Join link coming shortly - check back or DM us on Instagram.</p>
              )}
            </div>

            <div className="rounded-xl border border-outline-variant p-5">
              <h3 className="font-semibold text-on-surface mb-1">iPhone (iOS)</h3>
              <p className="text-sm text-on-surface-variant mb-3">
                Install <strong>TestFlight</strong> from the App Store, then open this link to add PlantsPack.
              </p>
              {IOS_TESTFLIGHT_URL ? (
                <a href={IOS_TESTFLIGHT_URL} className="inline-flex items-center px-5 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5">
                  Join on iPhone (TestFlight)
                </a>
              ) : (
                <p className="text-sm text-outline italic">Join link coming shortly - check back or DM us on Instagram.</p>
              )}
            </div>
          </div>

          <p className="text-sm text-on-surface-variant mt-4">
            On Android, please stay opted in for about <strong>two weeks</strong> - Google requires this before we
            can publish. You don&apos;t have to use it daily, just keep it installed.
          </p>
        </section>

        {/* What to test */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-on-surface mb-3">What to try</h2>
          <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant">
            <li>Open the map and find vegan places near you</li>
            <li>Search and browse by country and city</li>
            <li>Open a place: directions, website, save it, write a review</li>
            <li>Tools: scan a product barcode, a menu photo and an ingredient label</li>
            <li>Restaurant cards, the impact calculator and the drinks checker</li>
            <li>The Learn tab (is-it-vegan answers + travel guides)</li>
            <li>Suggest a place that&apos;s missing</li>
            <li>Sign up / sign in with email, Google or Apple</li>
          </ul>
          <p className="text-sm text-on-surface-variant mt-3">
            Found something broken or confusing? Send it via TestFlight feedback (iOS) or email
            {' '}<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
            A screenshot and your phone model help a lot.
          </p>
        </section>

        {/* Data use */}
        <section className="rounded-xl bg-surface-container p-5 mb-6">
          <h2 className="text-base font-semibold text-on-surface mb-2">How your data is used</h2>
          <ul className="list-disc list-inside text-sm text-on-surface-variant space-y-1">
            <li><strong>Location</strong> - to show places near you and (optionally) tag a place you suggest. You can decline.</li>
            <li><strong>Account</strong> (email, name) - only if you sign in, to save places and sync across devices.</li>
            <li><strong>Photos</strong> - your avatar, and any label/menu photos you scan (sent to our AI provider only to read them).</li>
            <li><strong>Your reviews & suggestions</strong> - stored so they can appear in the app.</li>
            <li><strong>A device id</strong> - to count free scans (fair-use limits).</li>
          </ul>
          <p className="text-sm text-on-surface-variant mt-3">
            We don&apos;t sell your data, there are no ads, and nothing is shared with advertisers. As a
            tester, Google Play and Apple TestFlight may also share crash reports and basic device info
            with us to help fix bugs. Everything is encrypted in transit.
          </p>
          <p className="text-sm text-on-surface-variant mt-3">
            Full detail in our{' '}
            <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>. You can
            delete your account and data any time at{' '}
            <a href="/account/delete" className="text-primary hover:underline">plantspack.com/account/delete</a>.
          </p>
        </section>

        <p className="text-sm text-outline">
          Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          Thank you for helping a vegan-built, independent project get off the ground.
        </p>
      </div>
    </main>
  )
}
