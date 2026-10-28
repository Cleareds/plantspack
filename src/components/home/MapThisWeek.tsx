import Link from 'next/link'
import PlaceImage from '@/components/places/PlaceImage'
import GlobalAddPlaceButton from '@/components/places/GlobalAddPlaceButton'
import { VEGAN_LEVEL_LABEL, VEGAN_LEVEL_OVERLAY_CLASS } from '@/lib/vegan-level'

/**
 * "This week on the map": the homepage block that shows what people actually
 * did on the map, built from the activity that is really happening (places
 * added, corrections handled, reviews) rather than the dormant social feed.
 * Pure server component: crawlers get the new place links in the first HTML.
 *
 * The one loud element is the live count set inside the headline sentence.
 * Everything else stays quiet: a rail of the places themselves, with the
 * person who added them, and a plain line of the month's bookkeeping.
 */
export interface MapActivityPlace {
  slug: string
  name: string
  city: string
  country: string
  vegan_level: string | null
  category: string | null
  main_image_url: string | null
  created_at: string
  added_by: string | null
}

export interface MapActivity {
  /** 'week' when the last 7 days had enough additions to show, else 'month'. */
  window: 'week' | 'month'
  added: number
  corrections: number
  reviews: number
  places: MapActivityPlace[]
}

function daysAgo(iso: string, now: number): string {
  const d = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000))
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

export default function MapThisWeek({ activity }: { activity: MapActivity }) {
  if (activity.places.length === 0) return null
  const now = Date.now()
  const span = activity.window === 'week' ? 'this week' : 'this month'
  const bookkeeping = [
    activity.corrections > 0 ? `${activity.corrections} ${activity.corrections === 1 ? 'correction' : 'corrections'} handled` : null,
    activity.reviews > 0 ? `${activity.reviews} ${activity.reviews === 1 ? 'review' : 'reviews'} written` : null,
  ].filter(Boolean)

  return (
    <section
      aria-labelledby="map-this-week"
      className="max-w-6xl mx-auto px-4 md:px-8 py-10 border-t border-outline-variant/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        {/* Left: the sentence with the live number, then the quiet bookkeeping. */}
        <div className="lg:sticky lg:top-24">
          <h2 id="map-this-week" className="font-headline font-bold text-on-surface tracking-tight leading-[1.05] text-[1.75rem] sm:text-[2rem]">
            <span className="block font-extrabold text-[4.25rem] leading-none tabular-nums text-primary -mb-1">
              {activity.added}
            </span>
            {activity.added === 1 ? 'place' : 'places'} added {span}
            <span className="block font-semibold text-on-surface-variant text-lg mt-1">by our community.</span>
          </h2>
          <p className="mt-4 text-sm text-on-surface-variant leading-relaxed max-w-[34ch]">
            Each one links to the place and to the member who added it.
            {bookkeeping.length > 0 && (
              <> In the last 30 days, {bookkeeping.join(' and ')}.</>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <GlobalAddPlaceButton
              className="inline-flex items-center rounded-full bg-primary text-on-primary-btn px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Add a place
            </GlobalAddPlaceButton>
            <Link
              href="/vegan-places"
              prefetch={false}
              className="inline-flex items-center rounded-full ghost-border bg-surface-container-lowest px-4 py-2 text-sm text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
            >
              Browse by city
            </Link>
          </div>
        </div>

        {/* Right: the places themselves, newest first, as a snapping rail. */}
        <ul
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 pb-1 lg:grid lg:grid-cols-3 xl:grid-cols-3 lg:overflow-visible"
          aria-label={`Places added ${span}`}
        >
          {activity.places.map((p, i) => {
            const level = p.vegan_level ?? ''
            const overlay = VEGAN_LEVEL_OVERLAY_CLASS[level]
            // The desktop grid has three columns: with fewer than six places,
            // show one full row rather than a ragged second one. The phone rail
            // still scrolls through all of them.
            const desktopHidden = activity.places.length < 6 && i >= 3
            return (
              <li key={p.slug} className={`snap-start shrink-0 w-[11.5rem] sm:w-[13rem] lg:w-auto${desktopHidden ? ' lg:hidden' : ''}`}>
                <Link
                  href={`/place/${p.slug}`}
                  prefetch={false}
                  className="group block rounded-2xl overflow-hidden bg-surface-container-lowest ghost-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <div className="relative aspect-[4/5] bg-surface-container-low">
                    <PlaceImage
                      src={p.main_image_url}
                      alt={p.name}
                      category={p.category}
                      className="absolute inset-0 w-full h-full object-cover"
                      sizes="(min-width: 1024px) 18vw, 208px"
                    />
                    {overlay && (
                      <span className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${overlay}`}>
                        {VEGAN_LEVEL_LABEL[level] ?? level}
                      </span>
                    )}
                    <span className="absolute right-2.5 bottom-2.5 rounded-full bg-surface/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-on-surface">
                      {daysAgo(p.created_at, now)}
                    </span>
                  </div>
                  <div className="px-3 pt-2.5 pb-3">
                    <h3 className="font-semibold text-on-surface text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant truncate">
                      {p.city}, {p.country}
                    </p>
                    {p.added_by && (
                      <p className="mt-1.5 text-[11px] text-on-surface-variant/80 truncate">
                        added by {p.added_by}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
