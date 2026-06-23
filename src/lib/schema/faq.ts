// FAQPage JSON-LD builder. NOTE: Google restricted FAQ *rich results* to
// authoritative gov/health sites in 2023, so this rarely renders as a SERP
// rich result anymore. We add it for the valid structured data + because the
// matching VISIBLE FAQ content (rendered via FaqSection) adds unique on-page
// text and People-Also-Ask eligibility — both ranking/relevance aids on
// otherwise list-heavy programmatic pages.

export interface FaqItem {
  question: string
  answer: string
}

export function buildFaqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}
