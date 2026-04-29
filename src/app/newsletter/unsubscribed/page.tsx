import Link from 'next/link'

export const metadata = {
  title: 'Unsubscribed · PlantsPack',
  robots: { index: false, follow: false },
}

export default function NewsletterUnsubscribedPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const hasError = searchParams?.error === '1'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center">
        {hasError ? (
          <>
            <h1 className="text-2xl font-bold text-on-surface mb-3">Something went wrong</h1>
            <p className="text-on-surface-variant mb-6">
              We couldn't process your unsubscribe request. The link may be malformed or expired.
              Please try again or email{' '}
              <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">
                hello@plantspack.com
              </a>{' '}
              and we'll remove you manually.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-on-surface mb-3">You're unsubscribed</h1>
            <p className="text-on-surface-variant mb-6">
              We won't send you any more PlantsPack newsletters. Transactional emails (notifications
              you've enabled, password resets, claim responses) continue to work.
            </p>
            <p className="text-sm text-outline mb-6">
              Changed your mind? You can resubscribe from the email preferences section of your account
              settings.
            </p>
          </>
        )}
        <Link
          href="/"
          className="inline-block silk-gradient text-on-primary font-medium py-2 px-5 rounded-md hover:opacity-90 transition"
        >
          Back to PlantsPack
        </Link>
      </div>
    </div>
  )
}
