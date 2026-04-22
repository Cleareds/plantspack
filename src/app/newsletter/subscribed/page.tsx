import Link from 'next/link'

export const metadata = {
  title: 'Subscribed · PlantsPack',
  robots: { index: false, follow: false },
}

export default function NewsletterSubscribedPage({
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
              We couldn't complete your subscription. The link may be malformed or expired. You can
              opt in from your account settings instead, or email{' '}
              <a href="mailto:hello@cleareds.com" className="text-primary hover:underline">
                hello@cleareds.com
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-on-surface mb-3">You're subscribed</h1>
            <p className="text-on-surface-variant mb-6">
              Thanks! You'll start receiving the PlantsPack newsletter. Every email includes a
              one-click unsubscribe link if you ever change your mind.
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
