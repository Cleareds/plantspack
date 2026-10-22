import { UtensilsCrossed } from 'lucide-react'

export interface PublishedMenu {
  checked_at: string | null
  items: Array<{ section: string | null; name: string; description: string | null; price: number | null; currency: string | null; is_vegan: boolean }>
}

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price == null) return null
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency }).format(price)
    } catch {
      /* unknown code: fall through */
    }
  }
  return price.toFixed(2) + (currency ? ` ${currency}` : '')
}

/**
 * Server-rendered menu on the place page. The vegan marks come from the
 * venue, so the label says so and never calls them verified.
 */
export default function PlaceMenuSection({ menu, fullyVegan }: { menu: PublishedMenu; fullyVegan: boolean }) {
  const sections: Array<{ title: string | null; items: PublishedMenu['items'] }> = []
  for (const it of menu.items) {
    const last = sections.at(-1)
    if (last && last.title === it.section) last.items.push(it)
    else sections.push({ title: it.section, items: [it] })
  }
  const veganCount = menu.items.filter((i) => fullyVegan || i.is_vegan).length
  const checked = menu.checked_at
    ? new Date(menu.checked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div id="menu" className="p-6 border-b border-outline-variant/15 scroll-mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" /> Menu
        </h2>
        <span className="text-sm font-medium text-primary">
          {fullyVegan ? `${veganCount} dishes, all vegan` : `${veganCount} of ${menu.items.length} dishes marked vegan`}
        </span>
      </div>
      <p className="text-xs text-on-surface-variant mb-4">
        Menu and vegan marks from the venue{checked ? `, last checked by the owner on ${checked}` : ''}. Prices and dishes can change.
      </p>
      <div className="space-y-5">
        {sections.map((s, si) => (
          <div key={si}>
            {s.title && <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant mb-2">{s.title}</h3>}
            <ul className="divide-y divide-outline-variant/15">
              {s.items.map((it, ii) => (
                <li key={ii} className="py-2 flex justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-on-surface font-medium">{it.name}</span>
                    {!fullyVegan && it.is_vegan && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold align-middle">Vegan</span>
                    )}
                    {it.description && <p className="text-sm text-on-surface-variant">{it.description}</p>}
                  </div>
                  {formatPrice(it.price, it.currency) && (
                    <span className="text-sm text-on-surface whitespace-nowrap">{formatPrice(it.price, it.currency)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
