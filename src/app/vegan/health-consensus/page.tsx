import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ShieldCheck, Quote } from 'lucide-react'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

const TITLE = 'What major health organisations say about vegan diets'
const DESCRIPTION =
  'Quoted positions from the Academy of Nutrition and Dietetics, British Dietetic Association, Kaiser Permanente, NHMRC, Harvard, WHO/IARC and others — with sources you can verify.'
const URL = 'https://www.plantspack.com/vegan/health-consensus'

export const metadata: Metadata = {
  title: `${TITLE} | PlantsPack`,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'article',
    url: URL,
    siteName: 'PlantsPack',
    images: OG_DEFAULT_IMAGES,
  },
}

type Statement = {
  org: string
  country: string
  year: number
  quote: string
  source: string
  sourceLabel: string
}

// Direct, verifiable quotes from public position papers and guidelines.
// Each entry must be quote-true and sourced to a public URL.
const STATEMENTS: Statement[] = [
  {
    org: 'Academy of Nutrition and Dietetics',
    country: 'United States',
    year: 2016,
    quote:
      'It is the position of the Academy of Nutrition and Dietetics that appropriately planned vegetarian, including vegan, diets are healthful, nutritionally adequate, and may provide health benefits for the prevention and treatment of certain diseases. These diets are appropriate for all stages of the life cycle, including pregnancy, lactation, infancy, childhood, adolescence, older adulthood, and for athletes.',
    source:
      'https://www.eatrightpro.org/practice/position-and-practice-papers/position-papers/vegetarian-diets',
    sourceLabel: 'eatrightpro.org — Position Paper, J Acad Nutr Diet 2016',
  },
  {
    org: 'British Dietetic Association',
    country: 'United Kingdom',
    year: 2017,
    quote:
      'Well-planned plant-based diets — including vegan diets — that follow current healthy eating recommendations can support healthy living in people of all ages.',
    source: 'https://www.bda.uk.com/resource/british-dietetic-association-confirms-well-planned-vegan-diets-can-support-healthy-living-in-people-of-all-ages.html',
    sourceLabel: 'bda.uk.com — joint memorandum with The Vegan Society',
  },
  {
    org: 'Dietitians of Canada',
    country: 'Canada',
    year: 2014,
    quote:
      'A healthy vegan diet has many health benefits including lower rates of obesity, heart disease, high blood pressure, high blood cholesterol, type 2 diabetes and some types of cancer. With some planning a vegan diet can meet the nutrient needs of adults, including pregnant and breastfeeding women, children and adolescents.',
    source: 'https://www.unlockfood.ca/en/Articles/Vegetarian-and-Vegan-Diets/What-You-Need-to-Know-About-Following-a-Vegan-Eati.aspx',
    sourceLabel: 'unlockfood.ca — Dietitians of Canada',
  },
  {
    org: 'Kaiser Permanente',
    country: 'United States',
    year: 2013,
    quote:
      'Healthy eating may be best achieved with a plant-based diet, which we define as a regimen that encourages whole, plant-based foods and discourages meats, dairy products, and eggs as well as all refined and processed foods. We present a case study as an example of the potential health benefits of such a diet. Physicians should consider recommending a plant-based diet to all their patients, especially those with high blood pressure, diabetes, cardiovascular disease, or obesity.',
    source: 'https://www.thepermanentejournal.org/doi/10.7812/TPP/12-085',
    sourceLabel: 'The Permanente Journal 2013;17(2):61–66',
  },
  {
    org: 'National Health and Medical Research Council (NHMRC)',
    country: 'Australia',
    year: 2013,
    quote:
      'Appropriately planned vegetarian diets, including total vegetarian or vegan diets, are healthy and nutritionally adequate. Well-planned vegetarian diets are appropriate for individuals during all stages of the lifecycle.',
    source: 'https://www.eatforhealth.gov.au/sites/default/files/2022-09/n55_australian_dietary_guidelines.pdf',
    sourceLabel: 'eatforhealth.gov.au — Australian Dietary Guidelines',
  },
  {
    org: 'Harvard T.H. Chan School of Public Health',
    country: 'United States',
    year: 2023,
    quote:
      'Traditionally, research into vegetarianism focused mainly on potential nutritional deficiencies, but in more recent years, the pendulum has swung the other way, and studies are confirming the health benefits of meat-free eating. Nowadays, plant-based eating is recognized as not only nutritionally sufficient but also as a way to reduce the risk for many chronic illnesses.',
    source: 'https://www.hsph.harvard.edu/nutritionsource/healthy-weight/diet-reviews/vegetarian-diet/',
    sourceLabel: 'The Nutrition Source — Harvard T.H. Chan',
  },
  {
    org: 'Dietary Guidelines Advisory Committee',
    country: 'United States',
    year: 2020,
    quote:
      'A healthy dietary pattern consists of nutrient-dense forms of foods and beverages across all food groups, in recommended amounts, and within calorie limits. The core elements that make up a healthy dietary pattern include vegetables of all types; fruits, especially whole fruit; grains, at least half of which are whole grain; dairy or fortified soy beverages and yogurts as alternatives; protein foods including lean meats, poultry, eggs, seafood, beans, peas, lentils, nuts, seeds, and soy products.',
    source: 'https://www.dietaryguidelines.gov/sites/default/files/2021-03/Dietary_Guidelines_for_Americans-2020-2025.pdf',
    sourceLabel: 'dietaryguidelines.gov — 2020–2025 Dietary Guidelines for Americans',
  },
  {
    org: 'World Health Organization — IARC',
    country: 'International',
    year: 2015,
    quote:
      'The IARC Working Group classified the consumption of processed meat as carcinogenic to humans (Group 1), based on sufficient evidence in humans that the consumption of processed meat causes colorectal cancer. Red meat was classified as probably carcinogenic to humans (Group 2A).',
    source: 'https://www.iarc.who.int/wp-content/uploads/2018/07/pr240_E.pdf',
    sourceLabel: 'iarc.who.int — IARC Monographs Vol. 114 (Press Release 240)',
  },
  {
    org: 'American Institute for Cancer Research / WCRF',
    country: 'International',
    year: 2018,
    quote:
      'Make whole grains, vegetables, fruit, and pulses (legumes) such as beans and lentils a major part of your usual daily diet. Limit consumption of red and processed meat.',
    source: 'https://www.aicr.org/cancer-prevention/recommendations/',
    sourceLabel: 'aicr.org — Cancer Prevention Recommendations',
  },
]

const COUNTERPOINTS: { q: string; a: string }[] = [
  {
    q: 'Do these organisations recommend everyone go vegan?',
    a: 'No — most stop at "well-planned plant-based or vegetarian diets are appropriate at every life stage" and recommend reducing red and processed meat. The Kaiser Permanente paper is the most direct: it asks physicians to consider recommending a plant-based diet to all their patients. Honest framing: no major health body opposes a well-planned vegan diet; several explicitly support it.',
  },
  {
    q: 'What about B12 and other "vegan deficiencies"?',
    a: 'Every position paper above flags planning. B12 needs a reliable source (fortified foods or a supplement); iron, calcium, omega-3 (ALA → DHA/EPA), iodine, zinc and vitamin D need attention the same way they do on any diet. None of this is contested. Read our notes on B12 and other nutrients linked below.',
  },
  {
    q: 'Is a vegan diet safe for children and pregnancy?',
    a: 'The Academy of Nutrition and Dietetics, Dietitians of Canada, BDA and NHMRC all state explicitly that appropriately planned vegan diets are appropriate during pregnancy, lactation, infancy, childhood and adolescence. The word "appropriately planned" is doing real work — supervision and B12 supplementation matter.',
  },
  {
    q: 'Why does the IARC red-meat ruling matter here?',
    a: 'Because it is the strongest single statement from a public-health body on the animal-product side: processed meat is a Group 1 carcinogen, same category as tobacco smoking and asbestos, on the strength of evidence that it causes cancer (not on potency). Removing processed meat is one of the simplest evidence-backed dietary changes you can make.',
  },
]

export default function HealthConsensusPage() {
  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan answers', url: 'https://www.plantspack.com/vegan' },
    { name: 'Health consensus', url: URL },
  ])

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    author: { '@type': 'Organization', name: 'PlantsPack' },
    publisher: {
      '@type': 'Organization',
      name: 'PlantsPack',
      logo: { '@type': 'ImageObject', url: 'https://www.plantspack.com/icon.png' },
    },
    mainEntityOfPage: URL,
    datePublished: '2026-06-13',
    dateModified: '2026-06-13',
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: COUNTERPOINTS.map((c) => ({
      '@type': 'Question',
      name: c.q,
      acceptedAnswer: { '@type': 'Answer', text: c.a },
    })),
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <Link href="/vegan" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6">
          <ArrowLeft className="h-4 w-4" /> Vegan answers
        </Link>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-bold mb-4">
          <ShieldCheck className="h-3.5 w-3.5" /> Sourced positions, no spin
        </div>

        <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          {TITLE}
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Every quote below is taken directly from the organisation&rsquo;s own position paper, guideline or peer-reviewed
          paper. Click the source link to read it in full. We have not paraphrased or strengthened anything.
        </p>

        <section className="space-y-4 mb-12">
          {STATEMENTS.map((s) => (
            <article key={s.org} className="p-5 md:p-6 rounded-2xl ghost-border bg-surface-container-lowest">
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
                <h2 className="font-bold text-on-surface text-base md:text-lg">{s.org}</h2>
                <span className="text-xs text-on-surface-variant">
                  {s.country} &middot; {s.year}
                </span>
              </header>
              <div className="flex gap-3">
                <Quote className="h-5 w-5 text-primary/50 flex-shrink-0 mt-0.5" />
                <blockquote className="text-on-surface text-[15px] leading-relaxed italic">&ldquo;{s.quote}&rdquo;</blockquote>
              </div>
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {s.sourceLabel}
              </a>
            </article>
          ))}
        </section>

        <section className="mb-12">
          <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-4">Common questions</h2>
          <div className="space-y-4">
            {COUNTERPOINTS.map((c) => (
              <details key={c.q} className="group p-5 rounded-2xl ghost-border bg-surface-container-lowest">
                <summary className="cursor-pointer font-bold text-on-surface list-none flex justify-between items-start gap-3">
                  <span>{c.q}</span>
                  <span className="text-on-surface-variant text-sm group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-on-surface-variant leading-relaxed text-[15px]">{c.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-10 p-5 md:p-6 rounded-2xl bg-primary/5 ghost-border border-primary/20">
          <h2 className="font-bold text-on-surface text-lg mb-2">Want the practical version?</h2>
          <p className="text-on-surface-variant text-[15px] leading-relaxed mb-4">
            The position papers cover the &ldquo;is it healthy&rdquo; question. These notes cover the &ldquo;how do I actually do it&rdquo; part.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/vegan/vitamins" className="px-3 py-1.5 rounded-full bg-surface-container-lowest ghost-border text-sm text-on-surface hover:border-primary/30">
              B12 &amp; vitamins
            </Link>
            <Link href="/vegan/protein" className="px-3 py-1.5 rounded-full bg-surface-container-lowest ghost-border text-sm text-on-surface hover:border-primary/30">
              Protein on a vegan diet
            </Link>
            <Link href="/vegan/vegan-vs-vegetarian" className="px-3 py-1.5 rounded-full bg-surface-container-lowest ghost-border text-sm text-on-surface hover:border-primary/30">
              Vegan vs vegetarian
            </Link>
            <Link href="/vegan" className="px-3 py-1.5 rounded-full bg-surface-container-lowest ghost-border text-sm text-on-surface hover:border-primary/30">
              All vegan answers
            </Link>
          </div>
        </section>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          This page summarises public positions for orientation. It is not medical advice. If you have a specific condition,
          allergy, are pregnant, or are feeding a child a vegan diet, please consult a registered dietitian. We do not
          accept advertising or partnerships from food brands, supplement brands, or restaurants — these listings are
          editorial.
        </p>
      </div>
    </div>
  )
}
