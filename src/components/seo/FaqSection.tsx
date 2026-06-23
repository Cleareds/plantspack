import type { FaqItem } from '@/lib/schema/faq'

/**
 * Visible FAQ block for programmatic directory pages. Pairs with buildFaqSchema
 * (the JSON-LD must match visible content). Plain server-rendered <details> so
 * it needs no client JS and the answer text is in the initial HTML for crawlers.
 */
export default function FaqSection({ items, heading = 'Frequently asked questions' }: { items: FaqItem[]; heading?: string }) {
  if (!items.length) return null
  return (
    <section className="mb-8" aria-label={heading}>
      <h2 className="font-headline font-bold text-xl mb-3">{heading}</h2>
      <div className="space-y-2">
        {items.map((f, i) => (
          <details key={i} className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3">
            <summary className="font-medium text-on-surface cursor-pointer list-none">{f.question}</summary>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
