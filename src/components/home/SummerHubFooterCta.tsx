'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const AddPlaceModal = dynamic(() => import('@/components/places/AddPlaceModal'), { ssr: false })

/**
 * Context-aware CTA at the foot of /vegan-summer-destinations.
 *
 * Logged-out visitors get the value-prop framing (create an account to
 * contribute). Logged-in users - who already have the add-place ability -
 * get a direct prompt to add a venue, with the hint that mentioning
 * "great summer location" in the description helps editorial curate it
 * into the next edition of the hub.
 */
export default function SummerHubFooterCta() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (user) {
    return (
      <section className="mt-12 rounded-2xl bg-primary/8 px-6 py-8 md:px-10 md:py-12 text-center">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-3">
          Visited a great vegan spot this summer?
        </h2>
        <p className="text-on-surface-variant max-w-xl mx-auto mb-3">
          Add it to Plants Pack and mention &quot;great summer location&quot;
          in the description - we&apos;ll consider it for next edition of
          this Mediterranean summer guide.
        </p>
        <p className="text-on-surface-variant max-w-xl mx-auto mb-5 text-sm">
          Every entry is free. We don&apos;t take paid listings and we don&apos;t run ads.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary-btn rounded-xl text-sm font-bold hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add a place
        </button>
        {showModal && <AddPlaceModal onClose={() => setShowModal(false)} />}
      </section>
    )
  }

  return (
    <section className="mt-12 rounded-2xl bg-primary/8 px-6 py-8 md:px-10 md:py-12 text-center">
      <h2 className="font-headline text-2xl font-bold text-on-surface mb-3">
        Found a great vegan spot on your trip?
      </h2>
      <p className="text-on-surface-variant max-w-xl mx-auto mb-5">
        Help future travellers by adding it. Every entry on Plants Pack is free -
        we don&apos;t take paid listings, and we don&apos;t run ads.
      </p>
      <Link
        href="/auth?mode=signup"
        data-event="cta_click_signup"
        data-cta="create_account"
        data-from="summer_hub_footer"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary-btn rounded-xl text-sm font-bold hover:opacity-90 transition-all"
      >
        Create a free account
      </Link>
    </section>
  )
}
