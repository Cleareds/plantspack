// Visible FAQ for city pages, mirroring the FAQ JSON-LD we emit for SEO.
// Google rewards FAQ schema more when the questions and answers are also
// visible on the page (rich-result eligibility tightened in late 2023).
//
// Every answer is grounded in real DB data - place counts, real top-place
// names, actual cuisines from cuisine_types. No AI-generated copy.

interface CityFaqProps {
  cityName: string
  countryName: string
  total: number
  fullyVegan: number
  topPlaceName?: string
  topPlaceRating?: number
  topPlaceReviews?: number
  cuisines: string[]
  storeCount: number
  hotelCount: number
}

export function CityFaq(props: CityFaqProps) {
  const items: Array<{ q: string; a: React.ReactNode }> = []

  items.push({
    q: `How many vegan places are in ${props.cityName}?`,
    a: (
      <>
        <strong>{props.total}</strong> vegan and vegan-friendly places in{' '}
        {props.cityName}, {props.countryName} on PlantsPack
        {props.fullyVegan > 0 ? <>, including <strong>{props.fullyVegan}</strong> fully vegan</> : null}
        {props.storeCount > 0 ? <>, <strong>{props.storeCount}</strong> vegan {props.storeCount === 1 ? 'shop' : 'shops'}</> : null}
        {props.hotelCount > 0 ? <>, <strong>{props.hotelCount}</strong> vegan-friendly {props.hotelCount === 1 ? 'stay' : 'stays'}</> : null}
        .
      </>
    ),
  })

  if (props.fullyVegan > 0) {
    items.push({
      q: `Are there fully vegan restaurants in ${props.cityName}?`,
      a: (
        <>
          Yes - <strong>{props.fullyVegan}</strong> {props.fullyVegan === 1 ? 'spot serves' : 'spots serve'} no
          animal products at all. The remaining {props.total - props.fullyVegan} places are vegan-friendly,
          with plant-based options on the menu.
        </>
      ),
    })
  } else if (props.total > 0) {
    items.push({
      q: `Are there fully vegan restaurants in ${props.cityName}?`,
      a: (
        <>
          Not yet on PlantsPack. The {props.total} places listed have vegan options on
          the menu but aren't 100% plant-based. Know one we're missing? Add it and we'll verify.
        </>
      ),
    })
  }

  if (props.topPlaceName) {
    items.push({
      q: `What's the highest-rated vegan place in ${props.cityName}?`,
      a: (
        <>
          <strong>{props.topPlaceName}</strong>
          {props.topPlaceRating
            ? <> currently leads on community ratings ({props.topPlaceRating.toFixed(1)}/5{props.topPlaceReviews ? ` from ${props.topPlaceReviews} ${props.topPlaceReviews === 1 ? 'review' : 'reviews'}` : ''}).</>
            : <> is among the most-visited vegan spots here.</>
          }
        </>
      ),
    })
  }

  if (props.cuisines.length >= 3) {
    items.push({
      q: `What kind of vegan food can I find in ${props.cityName}?`,
      a: (
        <>
          The scene covers {props.cuisines.slice(0, 6).join(', ')}, plus cafes, bakeries, and
          stores stocking vegan products. Use the category filter above to narrow down.
        </>
      ),
    })
  }

  if (items.length === 0) return null

  return (
    <section className="mt-10 pt-8 border-t border-outline-variant/15" aria-labelledby="city-faq-heading">
      <h2 id="city-faq-heading" className="text-lg font-semibold text-on-surface mb-4">
        Frequently asked about vegan {props.cityName}
      </h2>
      <div className="space-y-3 max-w-3xl">
        {items.map((it, i) => (
          <details
            key={i}
            className="bg-surface-container-lowest rounded-xl ghost-border p-4 group"
            {...(i === 0 ? { open: true } : {})}
          >
            <summary className="cursor-pointer font-medium text-on-surface text-sm flex items-center justify-between gap-3 list-none">
              <span>{it.q}</span>
              <span className="text-on-surface-variant text-xs group-open:rotate-180 transition-transform" aria-hidden>▾</span>
            </summary>
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
