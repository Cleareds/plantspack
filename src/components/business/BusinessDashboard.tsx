'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, CalendarPlus, ExternalLink, Loader2, MessageSquare, Pencil, Store } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'
import EditPlace from '@/components/places/EditPlace'
import {
  fetchEditablePlace,
  fetchOwnClaims,
  fetchOwnedPlaces,
  fetchReviewCounts,
  placeHref,
  VEGAN_LEVEL_LABEL,
  type OwnedPlace,
  type OwnerClaim,
} from '@/lib/business/owned-places'
import { OwnerToolTiles } from './OwnerToolTiles'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'

export default function BusinessDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [places, setPlaces] = useState<OwnedPlace[] | null>(null)
  const [claims, setClaims] = useState<OwnerClaim[]>([])

  const load = useCallback(async () => {
    if (!user) return
    const [owned, own] = await Promise.all([fetchOwnedPlaces(user.id), fetchOwnClaims(user.id)])
    setPlaces(owned)
    setClaims(own)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  useEffect(() => {
    track('business_dashboard_view')
  }, [])

  if (authLoading || (user && places === null)) {
    return (
      <div className="flex items-center gap-2 text-on-surface-variant py-16 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your business dashboard...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl ghost-border p-8 text-center">
        <Building2 className="h-8 w-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-on-surface mb-2">Sign in to manage your place</h2>
        <p className="text-on-surface-variant mb-5">Use the account you claimed your place with.</p>
        <Link
          href={`/auth?mode=signin&redirect=${encodeURIComponent('/business/dashboard')}`}
          className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium"
        >
          Sign in
        </Link>
      </div>
    )
  }

  const openClaims = claims.filter((c) => c.status !== 'approved')

  return (
    <div className="space-y-8">
      {places && places.length > 0 && <MonthlyReportToggle />}
      {places && places.length > 0 ? (
        places.map((p) => <OwnedPlaceCard key={p.id} place={p} onChanged={load} />)
      ) : (
        <NoPlacesYet />
      )}

      {openClaims.length > 0 && (
        <section className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-3">Your claims</h2>
          <ul className="space-y-3">
            {openClaims.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-on-surface">
                  {c.place ? (
                    <Link href={placeHref(c.place)} className="font-medium hover:text-primary">{c.place.name}</Link>
                  ) : 'A place'}
                  <span className="text-on-surface-variant"> · sent {new Date(c.created_at).toLocaleDateString()}</span>
                </span>
                {c.status === 'pending' ? (
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary text-xs font-medium">Waiting for our check</span>
                ) : (
                  <span className="text-xs text-on-surface-variant">
                    Not approved{c.rejection_reason ? `: ${c.rejection_reason}` : ''}. You can claim again from the place page.
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function NoPlacesYet() {
  return (
    <section className="bg-surface-container-lowest rounded-2xl ghost-border p-8">
      <AdminHint />
      <Store className="h-8 w-8 text-primary mb-3" />
      <h2 className="text-xl font-bold text-on-surface mb-2">You don&apos;t manage a place yet</h2>
      <ol className="list-decimal pl-5 space-y-1.5 text-on-surface-variant mb-5">
        <li>Find your place on PlantsPack.</li>
        <li>On its page, press <strong className="text-on-surface">Claim ownership</strong> and tell us how you are connected to it.</li>
        <li>We check every claim by hand. When it is approved, your place appears here with all tools.</li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href="/business" className="inline-flex px-4 py-2 rounded-xl bg-primary text-on-primary-btn font-medium text-sm">
          Find your place
        </Link>
        <Link href="/contact" className="inline-flex px-4 py-2 rounded-xl ghost-border text-on-surface text-sm font-medium">
          Your place is missing? Tell us
        </Link>
      </div>
    </section>
  )
}

function OwnedPlaceCard({ place, onChanged }: { place: OwnedPlace; onChanged: () => void }) {
  const [reviews, setReviews] = useState<{ total: number; unanswered: number } | null>(null)
  const [editable, setEditable] = useState<any | null>(null)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    fetchReviewCounts(place.id).then(setReviews).catch(() => setReviews(null))
  }, [place.id])

  const openEdit = async () => {
    setOpening(true)
    const full = await fetchEditablePlace(place.id)
    setOpening(false)
    if (full) {
      setEditable(full)
      track('owner_tool_used', { tool: 'edit', action: 'open' })
    }
  }

  const where = [place.city, place.country].filter(Boolean).join(', ')

  return (
    <section className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
      <div className="flex gap-4 p-5 border-b border-outline-variant/15">
        {place.main_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.main_image_url} alt="" className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
            <Store className="h-7 w-7 text-outline" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-on-surface truncate">{place.name}</h2>
          {where && <p className="text-sm text-on-surface-variant">{where}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {place.vegan_level && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {VEGAN_LEVEL_LABEL[place.vegan_level] ?? place.vegan_level}
              </span>
            )}
            <Link href={placeHref(place)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View public page <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
        <button
          onClick={openEdit}
          disabled={opening}
          className="text-left p-4 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4 text-primary" />}
            Edit details
          </div>
          <p className="text-sm text-on-surface-variant mt-1">Hours, address, website, phone, photos, open or closed.</p>
        </button>

        <Link
          href={`${placeHref(place)}#reviews`}
          onClick={() => track('owner_tool_used', { tool: 'reviews', action: 'open' })}
          className="p-4 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            <MessageSquare className="h-4 w-4 text-primary" />
            Reviews
            {reviews && reviews.unanswered > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-primary text-on-primary-btn text-xs">{reviews.unanswered} to answer</span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {reviews === null
              ? 'Read and reply to what visitors wrote.'
              : reviews.total === 0
                ? 'No reviews yet. Replies appear under each review.'
                : `${reviews.total} review${reviews.total === 1 ? '' : 's'}. Reply under each one on your page.`}
          </p>
        </Link>

        <OwnerToolTiles place={place} />

        <Link
          href="/feed"
          onClick={() => track('owner_tool_used', { tool: 'event', action: 'open' })}
          className="p-4 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Add an event
          </div>
          <p className="text-sm text-on-surface-variant mt-1">On the feed, press Create and choose Event. It appears in the events calendar.</p>
        </Link>
      </div>

      {editable && (
        <EditPlace
          place={editable}
          isOpen={!!editable}
          onClose={() => setEditable(null)}
          onSaved={onChanged}
        />
      )}
    </section>
  )
}

function MonthlyReportToggle() {
  const [on, setOn] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    fetch('/api/business/report-preference', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOn(d ? !!d.monthlyReport : null))
      .catch(() => setOn(null))
  }, [])
  if (on === null) return null
  const toggle = async () => {
    setSaving(true)
    const next = !on
    const r = await fetch('/api/business/report-preference', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyReport: next }),
    }).catch(() => null)
    if (r?.ok) setOn(next)
    setSaving(false)
  }
  return (
    <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest ghost-border cursor-pointer">
      <span>
        <span className="block font-semibold text-on-surface">Monthly email summary</span>
        <span className="block text-sm text-on-surface-variant">Views, saves and new reviews for your places, on the 1st of each month.</span>
      </span>
      <input type="checkbox" checked={on} disabled={saving} onChange={toggle} className="h-5 w-5 accent-primary" />
    </label>
  )
}

function AdminHint() {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return null
  return (
    <p className="mb-4 p-3 rounded-xl bg-primary/10 text-sm text-on-surface">
      Admin: {BUSINESS_TOOLS_PUBLIC ? 'the tools are live for owners.' : 'the tools are in admin preview; owners and visitors do not see them.'}{' '}
      You own no place, so open any place page and use the &quot;Owner tools&quot; links there to test the menu and print tools.
    </p>
  )
}
