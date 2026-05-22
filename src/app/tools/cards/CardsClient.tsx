'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Printer, Languages, ListChecks, EyeOff, Search, ExternalLink } from 'lucide-react'
import {
  RESTAURANT_CARDS,
  NON_VEGAN_E_NUMBERS,
  MAYBE_VEGAN_E_NUMBERS,
  HIDDEN_NON_VEGAN_INGREDIENTS,
  ALSO_AVOID_PREFIX,
  translateAllergen,
  type CardVariant,
} from './cards-data'
import AllergenSelector from '../_components/AllergenSelector'

type Tab = 'restaurant' | 'e-numbers' | 'hidden'

export default function CardsClient() {
  const [tab, setTab] = useState<Tab>('restaurant')
  const [query, setQuery] = useState('')
  const [variant, setVariant] = useState<CardVariant>('vegan')
  const [allergens, setAllergens] = useState<string[]>([])
  const [allergensFromProfile, setAllergensFromProfile] = useState(false)

  useEffect(() => {
    fetch('/api/tools/allergens')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.allergens) && data.allergens.length > 0) {
          setAllergens(data.allergens)
          setAllergensFromProfile(true)
        }
      })
      .catch(() => {})
  }, [])

  async function persistAllergens(next: string[]) {
    const r = await fetch('/api/tools/allergens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergens: next }),
    })
    if (r.ok) setAllergensFromProfile(true)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 print:hidden">
        <TabBtn active={tab === 'restaurant'} onClick={() => setTab('restaurant')} icon={Languages} label="Restaurant cards" />
        <TabBtn active={tab === 'e-numbers'} onClick={() => setTab('e-numbers')} icon={ListChecks} label="E-number guide" />
        <TabBtn active={tab === 'hidden'} onClick={() => setTab('hidden')} icon={EyeOff} label="Hidden ingredients" />
      </div>

      {tab === 'restaurant' && (
        <div className="mb-5 print:hidden space-y-3">
          <div className="inline-flex p-1 rounded-full ghost-border bg-surface">
            <VariantBtn active={variant === 'vegan'} onClick={() => setVariant('vegan')} label="Vegan" />
            <VariantBtn active={variant === 'gentle'} onClick={() => setVariant('gentle')} label="Animal-free dining" />
          </div>
          {variant === 'gentle' && (
            <p className="text-xs text-on-surface-variant">
              Softer wording for skeptical restaurants. Same factual content, no preachy framing. Available in English, Spanish, French, German, and Italian; other languages fall back to the standard text.
            </p>
          )}

          <AllergenSelector
            value={allergens}
            onChange={setAllergens}
            savedRemote={allergensFromProfile}
            onPersist={persistAllergens}
            compact
          />
          {allergens.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              Each card will include &quot;I also can&apos;t eat&quot; in the local language with your allergens listed.
            </p>
          )}
        </div>
      )}

      {tab === 'restaurant' && <RestaurantCardsTab query={query} setQuery={setQuery} allergens={allergens} variant={variant} />}
      {tab === 'e-numbers' && <ENumbersTab />}
      {tab === 'hidden' && <HiddenIngredientsTab />}
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Languages; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
        active ? 'bg-primary text-on-primary' : 'ghost-border bg-surface-container-lowest text-on-surface hover:border-primary/30'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function VariantBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {label}
    </button>
  )
}

function RestaurantCardsTab({ query, setQuery, allergens, variant }: { query: string; setQuery: (s: string) => void; allergens: string[]; variant: CardVariant }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return RESTAURANT_CARDS
    return RESTAURANT_CARDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.native.toLowerCase().includes(q) || c.lang.includes(q),
    )
  }, [query])

  return (
    <div>
      <div className="relative mb-5 print:hidden">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search language (e.g. spanish, español, es)"
          className="w-full pl-10 pr-4 py-3 rounded-xl ghost-border bg-surface text-on-surface focus:outline-none focus:border-primary"
        />
      </div>

      <div className="mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
          Print all visible cards
        </button>
        <p className="text-xs text-on-surface-variant mt-2">
          Each card prints on its own page. In the print dialog, choose &quot;Save as PDF&quot; to keep them on your phone.
        </p>
      </div>

      <div className="space-y-6 print:space-y-0">
        {filtered.map((card) => {
          const isRtl = card.lang === 'ar' || card.lang === 'he' || card.lang === 'ur'
          const title = variant === 'gentle' && card.titleGentle ? card.titleGentle : card.title
          const body = variant === 'gentle' && card.bodyGentle ? card.bodyGentle : card.body
          const allergenParams = allergens.length > 0 ? `?a=${encodeURIComponent(allergens.join(','))}&v=${variant}` : `?v=${variant}`
          return (
          <article
            key={card.lang}
            className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-6 md:p-8 print:shadow-none print:border print:border-black print:rounded-none print:break-after-page print:m-0"
            lang={card.lang}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between mb-2 print:text-black" dir="ltr">
              <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                {card.label} / {card.native}
              </div>
              <Link
                href={`/tools/cards/${card.lang}${allergenParams}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline print:hidden"
                aria-label={`Open ${card.label} card in new tab`}
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </Link>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-4 print:text-black">{title}</h2>
            <p className="text-on-surface leading-relaxed mb-4 print:text-black">{body}</p>
            {allergens.length > 0 && (
              <p className="text-on-surface leading-relaxed mb-4 print:text-black">
                <strong>{(ALSO_AVOID_PREFIX[card.lang] ?? ALSO_AVOID_PREFIX.en)}:</strong>{' '}
                {allergens.map((a) => translateAllergen(a, card.lang)).join(', ')}.
              </p>
            )}
            <p className="text-on-surface-variant italic print:text-black">{card.thanks}</p>
            <div className="mt-5 pt-4 border-t border-on-surface/10 text-xs text-on-surface-variant print:text-black" dir="ltr">
              plantspack.com/tools/cards
            </div>
          </article>
        )})}
        {filtered.length === 0 && (
          <p className="text-on-surface-variant text-center py-8">No language matches &quot;{query}&quot;.</p>
        )}
      </div>
    </div>
  )
}

function ENumbersTab() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold text-on-surface mb-3">Not vegan</h2>
        <div className="rounded-2xl ghost-border bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-on-surface/5">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface w-20">Code</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface">Name</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface">Source</th>
              </tr>
            </thead>
            <tbody>
              {NON_VEGAN_E_NUMBERS.map((e) => (
                <tr key={e.code} className="border-t border-on-surface/10">
                  <td className="px-4 py-3 font-mono font-semibold text-on-surface">{e.code}</td>
                  <td className="px-4 py-3 text-on-surface">{e.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{e.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-on-surface mb-3">Check the source</h2>
        <p className="text-sm text-on-surface-variant mb-3">These can be plant or animal-derived. Most major brands use plant sources in the EU but it&apos;s worth checking the packaging or contacting the manufacturer.</p>
        <div className="rounded-2xl ghost-border bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-on-surface/5">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface w-20">Code</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface">Name</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface">Source</th>
              </tr>
            </thead>
            <tbody>
              {MAYBE_VEGAN_E_NUMBERS.map((e) => (
                <tr key={e.code} className="border-t border-on-surface/10">
                  <td className="px-4 py-3 font-mono font-semibold text-on-surface">{e.code}</td>
                  <td className="px-4 py-3 text-on-surface">{e.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{e.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
          Print this page
        </button>
      </div>
    </div>
  )
}

function HiddenIngredientsTab() {
  return (
    <div>
      <p className="text-sm text-on-surface-variant mb-5">
        Animal-derived ingredients that hide in everyday products. Worth a quick label check the first time you buy a new brand.
      </p>
      <div className="space-y-3">
        {HIDDEN_NON_VEGAN_INGREDIENTS.map((i) => (
          <div key={i.name} className="rounded-xl ghost-border bg-surface-container-lowest p-4">
            <div className="font-semibold text-on-surface mb-1">{i.name}</div>
            <div className="text-sm text-on-surface-variant">{i.where}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
          Print this page
        </button>
      </div>
    </div>
  )
}
