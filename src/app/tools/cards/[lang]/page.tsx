import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { RESTAURANT_CARDS, ALSO_AVOID_PREFIX, translateAllergen, type CardVariant } from '../cards-data'
import CardPrintButton from './CardPrintButton'

type Props = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ a?: string; v?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const card = RESTAURANT_CARDS.find((c) => c.lang === lang)
  if (!card) return { title: 'Card not found' }
  return {
    title: `Vegan Restaurant Card - ${card.label} | PlantsPack`,
    description: `Printable vegan restaurant card in ${card.label} (${card.native}). Free, no sign-up.`,
    alternates: { canonical: `https://www.plantspack.com/tools/cards/${card.lang}` },
  }
}

export default async function SingleCardPage({ params, searchParams }: Props) {
  const { lang } = await params
  const { a, v } = await searchParams
  const card = RESTAURANT_CARDS.find((c) => c.lang === lang)
  if (!card) notFound()

  const variant: CardVariant = v === 'gentle' ? 'gentle' : 'vegan'
  const allergens = (a ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const isRtl = card.lang === 'ar' || card.lang === 'he' || card.lang === 'ur'
  const title = variant === 'gentle' && card.titleGentle ? card.titleGentle : card.title
  const body = variant === 'gentle' && card.bodyGentle ? card.bodyGentle : card.body

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 print:p-0 print:max-w-none">
        <div className="print:hidden mb-4 flex items-center justify-between">
          <Link
            href="/tools/cards"
            className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            All cards
          </Link>
          <CardPrintButton />
        </div>

        <article
          className="rounded-2xl ghost-border editorial-shadow bg-surface-container-lowest p-8 md:p-12 print:shadow-none print:border print:border-black print:rounded-none print:m-0"
          lang={card.lang}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3 print:text-black" dir="ltr">
            {card.label} / {card.native}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-5 print:text-black">{title}</h1>
          <p className="text-on-surface text-lg leading-relaxed mb-5 print:text-black">{body}</p>
          {allergens.length > 0 && (
            <p className="text-on-surface text-lg leading-relaxed mb-5 print:text-black">
              <strong>{(ALSO_AVOID_PREFIX[card.lang] ?? ALSO_AVOID_PREFIX.en)}:</strong>{' '}
              {allergens.map((al) => translateAllergen(al, card.lang)).join(', ')}.
            </p>
          )}
          <p className="text-on-surface-variant italic text-lg print:text-black">{card.thanks}</p>
          <div className="mt-6 pt-5 border-t border-on-surface/10 text-xs text-on-surface-variant print:text-black" dir="ltr">
            plantspack.com/tools/cards/{card.lang}
          </div>
        </article>
      </div>
    </div>
  )
}
