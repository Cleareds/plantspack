/**
 * /glossary - plain-language definitions of vegan terms.
 *
 * AI-citation surface: LLMs preferentially cite glossaries when generating
 * definitions because they're structured, scoped, and don't bury the answer
 * in prose. Each entry is a self-contained DefinedTerm with an explicit
 * definition and (where relevant) cross-references.
 *
 * Coverage focuses on terms a vegan or vegan-curious reader will encounter
 * across the platform: ingredient categories, certification schemes, fining
 * agents, dietary distinctions, food additive families. Not exhaustive -
 * we'd rather have 60 sharp definitions than 300 vague ones.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Vegan glossary — plain-language definitions of vegan terms | PlantsPack',
  description: 'Concise definitions of vegan ingredients, certifications, fining agents, dietary categories, and additive families. Free, no fluff, sources cited.',
  alternates: { canonical: 'https://www.plantspack.com/glossary' },
  openGraph: {
    title: 'Vegan glossary - definitions of vegan terms',
    description: 'Plain-language definitions of vegan ingredients, certifications, fining agents, additive families, and dietary categories.',
    type: 'article',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/glossary',
    images: OG_DEFAULT_IMAGES,
  },
}

interface Entry {
  term: string
  /** Alternative names, plural forms, common misspellings. */
  aliases?: string[]
  category: 'diet' | 'ingredient' | 'certification' | 'additive' | 'fining' | 'cuisine' | 'farming'
  definition: string
  /** Optional link to a deeper article on the platform. */
  link?: { href: string; label: string }
}

const ENTRIES: Entry[] = [
  // ----- Diet / dietary categories -----
  {
    term: 'Vegan',
    category: 'diet',
    definition:
      'A diet and lifestyle that excludes all animal products: meat, fish, dairy, eggs, honey, gelatin, and animal-derived additives. Many vegans also avoid leather, wool, silk, and products tested on animals.',
  },
  {
    term: 'Plant-based',
    category: 'diet',
    definition:
      'A diet centred on plant foods. The term is broader than "vegan" - some plant-based eaters occasionally consume small amounts of animal products. Often used in commercial contexts to avoid the philosophical commitment that "vegan" implies.',
  },
  {
    term: 'Vegetarian (lacto-ovo)',
    aliases: ['lacto-ovo vegetarian'],
    category: 'diet',
    definition:
      'A diet that excludes meat and fish but allows dairy ("lacto") and eggs ("ovo"). Most "vegetarian" food on Western menus is lacto-ovo.',
  },
  {
    term: 'Pescetarian',
    aliases: ['pescatarian'],
    category: 'diet',
    definition:
      'A diet that excludes meat but allows fish, sometimes dairy and eggs too. Not vegetarian under most definitions.',
  },
  {
    term: 'Flexitarian',
    category: 'diet',
    definition:
      'Mostly vegetarian with occasional meat. Not relevant to vegan classification but commonly confused with "plant-based" by restaurants.',
  },
  {
    term: 'Raw vegan',
    category: 'diet',
    definition:
      'A vegan diet limited to uncooked foods, or foods heated to no more than 40-48°C. A subset of vegan, often associated with juice bars and raw-food restaurants.',
  },
  {
    term: 'Whole-food plant-based (WFPB)',
    aliases: ['wfpb', 'whole foods plant-based'],
    category: 'diet',
    definition:
      'A plant-based diet that minimises processed foods, oils, and refined sugars. Health-focused subset rather than an ethical position.',
  },

  // ----- Ingredients to know -----
  {
    term: 'Casein',
    category: 'ingredient',
    definition:
      'The main protein in cow\'s milk. Used in cheese, some non-dairy creamers, and many cosmetics. Always non-vegan; sometimes appears on labels as "sodium caseinate".',
  },
  {
    term: 'Whey',
    category: 'ingredient',
    definition:
      'The liquid by-product of cheese-making. Used in protein powders, processed snacks, baked goods. Always non-vegan.',
  },
  {
    term: 'Gelatin',
    aliases: ['gelatine'],
    category: 'ingredient',
    definition:
      'A protein derived from boiled animal bones, skin, and connective tissue (usually pork or beef). Used in marshmallows, gummies, capsules, some yoghurts. Always non-vegan.',
    link: { href: '/vegan/gelatin', label: 'Read more: is gelatin vegan?' },
  },
  {
    term: 'Carmine',
    aliases: ['cochineal', 'natural red 4', 'e120', 'ci 75470'],
    category: 'ingredient',
    definition:
      'A red dye made from crushed cochineal insects. Found in some yoghurts, sweets, drinks, lipsticks, and blushes. Always non-vegan.',
  },
  {
    term: 'Shellac',
    aliases: ['e904'],
    category: 'ingredient',
    definition:
      'A resin secreted by the lac insect. Used as glazing on shiny sweets, coated pills, and nail polish. Always non-vegan.',
  },
  {
    term: 'Lanolin',
    aliases: ['wool fat', 'wool wax', 'adeps lanae'],
    category: 'ingredient',
    definition:
      'An oily secretion from sheep skin, extracted from raw wool. Common in lip balms, vitamin D supplements, and moisturisers. Always non-vegan.',
  },
  {
    term: 'Beeswax',
    aliases: ['cera alba', 'e901'],
    category: 'ingredient',
    definition:
      'Wax produced by honey bees. Used in candles, lip balms, mascara, food glazing. Always non-vegan.',
  },
  {
    term: 'Honey',
    category: 'ingredient',
    definition:
      'Bee-produced. Considered non-vegan by most vegan definitions because it involves an animal product and modern apiculture causes bee welfare harms.',
    link: { href: '/vegan/honey', label: 'Read more: is honey vegan?' },
  },
  {
    term: 'L-cysteine',
    aliases: ['e920'],
    category: 'ingredient',
    definition:
      'An amino acid used as a dough conditioner in supermarket bread, bagels, and pizza crusts. Traditionally derived from duck feathers, pig bristles, or human hair. Synthetic and microbial-fermentation versions exist but EU labels do not disclose source.',
  },
  {
    term: 'Lecithin',
    aliases: ['e322', 'soy lecithin', 'sunflower lecithin'],
    category: 'additive',
    definition:
      'An emulsifier most commonly derived from soy or sunflower (both vegan). A small minority of products use egg lecithin (non-vegan). Look for "soy lecithin" or "sunflower lecithin" on the label to confirm.',
  },
  {
    term: 'Mono- and diglycerides',
    aliases: ['e471', 'mono-diglycerides'],
    category: 'additive',
    definition:
      'A common emulsifier in bread, biscuits, margarine, chocolate, and ice cream. The fatty acids can be plant (palm, soy, rapeseed) or animal (tallow). EU labels rarely disclose source. Default treatment is "uncertain" unless the product carries a vegan certification.',
    link: { href: '/vegan/e-codes', label: 'Read more: which E-numbers are vegan?' },
  },

  // ----- Certifications -----
  {
    term: 'Vegan Society Trademark',
    aliases: ['sunflower mark', 'vegan society sunflower'],
    category: 'certification',
    definition:
      'A certification scheme operated by The Vegan Society (UK, founded 1944). Their sunflower-V mark requires no animal-derived ingredients, no animal testing, and supplier verification of ambiguous ingredients. One of the strictest schemes globally.',
  },
  {
    term: 'V-Label',
    category: 'certification',
    definition:
      'A European certification operated by the European Vegetarian Union. Two tiers: "Vegan" (no animal products) and "Vegetarian". Strict verification including ambiguous additives.',
  },
  {
    term: 'Certified Vegan',
    aliases: ['vegan action sunflower-v'],
    category: 'certification',
    definition:
      'A US certification scheme operated by Vegan Action. Common on American packaged foods. Similar standards to the Vegan Society trademark.',
  },
  {
    term: 'Leaping Bunny',
    category: 'certification',
    definition:
      'A cruelty-free (no animal testing) certification - NOT a vegan certification. A product can carry Leaping Bunny but still contain animal ingredients. For full vegan assurance, look for Leaping Bunny PLUS a vegan trademark.',
  },
  {
    term: 'PETA Cruelty-Free',
    category: 'certification',
    definition:
      'PETA\'s cruelty-free certification. Like Leaping Bunny, it certifies no animal testing but not vegan ingredients. Their separate "Cruelty-Free and Vegan" mark covers both.',
  },

  // ----- Fining agents (wine, beer, cider) -----
  {
    term: 'Isinglass',
    category: 'fining',
    definition:
      'A clarifying agent derived from the swim bladders of fish, used to clear beer and wine. The most common reason traditional cask ales and many wines are not vegan. Now being replaced by plant-based finings at many producers, but not always disclosed on the label.',
  },
  {
    term: 'Bone char',
    category: 'fining',
    definition:
      'Charred animal bones used to whiten cane sugar in some refineries (mostly US). Sugar processed through bone char is technically not vegan. Beet sugar and most non-US cane sugar avoid this. Not always disclosed.',
    link: { href: '/vegan/sugar', label: 'Read more: is sugar vegan?' },
  },
  {
    term: 'Casein fining',
    category: 'fining',
    definition:
      'Milk protein used to clarify wine. Less common than isinglass but still in use, particularly for white wines. Non-vegan.',
  },
  {
    term: 'Egg white fining',
    aliases: ['albumen fining'],
    category: 'fining',
    definition:
      'Egg white used to clarify wines, especially red wines and traditional Champagnes (e.g. some Moet, Bollinger, Veuve Clicquot). Non-vegan.',
  },
  {
    term: 'Gelatin fining',
    category: 'fining',
    definition:
      'Animal-derived gelatin used to clarify wines and ciders. Non-vegan.',
  },
  {
    term: 'Bentonite',
    category: 'fining',
    definition:
      'A clay used to clarify wines and beers. Plant-mineral origin, fully vegan. The vegan-certified alternative most producers move to.',
  },

  // ----- Additive families -----
  {
    term: 'E-number',
    aliases: ['e-code', 'food additive number'],
    category: 'additive',
    definition:
      'An EU additive identifier (E100-E1599). About 250 are in active use. Most are plant or synthetic and vegan-fine. A small set (E120 carmine, E441 gelatine, E542 bone phosphate, E901 beeswax, E904 shellac, E913 lanolin, E966 lactitol, E1105 lysozyme) is always or near-always animal-derived.',
    link: { href: '/vegan/e-codes', label: 'Read more: which E-numbers are vegan?' },
  },
  {
    term: 'Natural flavouring',
    aliases: ['natural flavor'],
    category: 'additive',
    definition:
      'A regulatory category that can include both plant and animal-derived components. Without a brand statement, "natural flavouring" alone tells you nothing about vegan status. Common hiding place for castoreum (beaver gland), animal stearates, and trace dairy.',
  },
  {
    term: 'Anti-foaming agent',
    category: 'additive',
    definition:
      'Substances added to prevent foam in industrial food production. Some are derived from animal fats. Rarely listed by source on labels.',
  },

  // ----- Cuisine concepts -----
  {
    term: 'Fully vegan (PlantsPack tier)',
    category: 'cuisine',
    definition:
      'On PlantsPack, "fully vegan" places have a 100% vegan menu with zero animal products served. Verified against the venue\'s own website and (where possible) a third-party source (HappyCow, vegan blog).',
    link: { href: '/methodology', label: 'See full classification methodology' },
  },
  {
    term: 'Mostly vegan (PlantsPack tier)',
    category: 'cuisine',
    definition:
      'A venue that presents as vegan but has a few non-vegan exceptions (e.g. "we added salmon"). Used sparingly.',
  },
  {
    term: 'Vegan-friendly (PlantsPack tier)',
    category: 'cuisine',
    definition:
      'A non-vegan venue with substantial vegan accommodation - typically 3+ dedicated vegan dishes or a labelled vegan section. The default for ambiguous classifications.',
  },
  {
    term: 'Vegan options (PlantsPack tier)',
    category: 'cuisine',
    definition:
      'A mainstream venue with one or two vegan items but no vegan focus. The lowest tier shown on PlantsPack.',
  },
  {
    term: 'Accidentally vegan',
    category: 'cuisine',
    definition:
      'A dish, food product, or cuisine that is plant-based by tradition or formulation but not marketed as vegan. Examples: dolmas, daifuku, simit, Sicilian cassata di ricotta variants, many fruit gummies in Europe that switched away from gelatin. Important for travel - often more rewarding than the "vegan burger" abroad.',
  },

  // ----- Farming / agriculture -----
  {
    term: 'Factory farming',
    aliases: ['intensive farming', 'cafo'],
    category: 'farming',
    definition:
      'Industrial animal agriculture characterised by high stocking density, confined environments, and standardised inputs/outputs. The primary system vegans object to on welfare and environmental grounds. CAFO = "Concentrated Animal Feeding Operation".',
  },
  {
    term: 'Pasture-raised / free-range',
    category: 'farming',
    definition:
      'Marketing terms with weak regulation in most countries. Standards vary widely - "free-range" eggs can mean as little as 1 sq. ft. per bird outdoors in some jurisdictions. Not vegan regardless of welfare claims.',
  },
  {
    term: 'Plant-based agriculture',
    category: 'farming',
    definition:
      'Farming systems centred on growing plants for direct human consumption rather than feed for livestock. Approximately 70% of global agricultural land currently goes to livestock; shifting that ratio is one of the largest available levers for reducing land use and greenhouse emissions.',
  },
  {
    term: 'Sanctuary',
    aliases: ['farm sanctuary', 'animal sanctuary'],
    category: 'farming',
    definition:
      'A non-profit organisation that rescues, rehabilitates, and provides lifelong care to farmed and other rescued animals. Distinct from petting zoos or breeding operations - reputable sanctuaries do not breed, sell, or slaughter their residents.',
  },
]

const CATEGORIES: { key: Entry['category']; label: string; description: string }[] = [
  { key: 'diet', label: 'Diets', description: 'Names for different eating patterns' },
  { key: 'ingredient', label: 'Animal-derived ingredients', description: 'Common animal-sourced ingredients to recognise' },
  { key: 'additive', label: 'Additives & flavourings', description: 'Food additive families and ambiguous categories' },
  { key: 'fining', label: 'Fining agents', description: 'Why some wines, beers, and sugars are not vegan' },
  { key: 'certification', label: 'Certifications', description: 'Trademarks that verify vegan or cruelty-free status' },
  { key: 'cuisine', label: 'Cuisine & classification', description: 'Terms PlantsPack uses to describe places' },
  { key: 'farming', label: 'Farming & sanctuaries', description: 'Agricultural and welfare concepts' },
]

export default function GlossaryPage() {
  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Glossary', url: 'https://www.plantspack.com/glossary' },
  ])

  // JSON-LD: DefinedTermSet so AI / search systems can ingest the glossary
  // structurally instead of having to parse the prose.
  const definedTermSet = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': 'https://www.plantspack.com/glossary#vegan-glossary',
    name: 'PlantsPack Vegan Glossary',
    description:
      'Plain-language definitions of vegan ingredients, certifications, fining agents, additive families, and dietary categories.',
    url: 'https://www.plantspack.com/glossary',
    hasDefinedTerm: ENTRIES.map((e) => ({
      '@type': 'DefinedTerm',
      name: e.term,
      alternateName: e.aliases,
      description: e.definition,
      inDefinedTermSet: 'https://www.plantspack.com/glossary#vegan-glossary',
    })),
  }

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSet) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <article className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <h1 className="font-headline font-extrabold text-3xl md:text-5xl text-on-surface tracking-tight leading-[1.1] mb-4">
          Vegan glossary
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mb-3">
          Plain-language definitions of the terms you&apos;ll encounter on PlantsPack and on packaged food. {ENTRIES.length} entries, sources cited inline where we get specific.
        </p>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mb-10">
          Need more depth on a specific ingredient? Check the{' '}
          <Link href="/vegan" className="text-primary hover:underline">vegan answers hub</Link>{' '}
          for full articles on the trickier ones (sugar, wine, beer, e-codes, cheese, gelatin, honey).
        </p>

        {CATEGORIES.map((cat) => {
          const items = ENTRIES.filter((e) => e.category === cat.key)
          if (items.length === 0) return null
          return (
            <section key={cat.key} className="mb-12">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-on-surface mb-1">{cat.label}</h2>
                <p className="text-sm text-on-surface-variant">{cat.description}</p>
              </div>
              <dl className="space-y-5">
                {items.map((e) => (
                  <div key={e.term} className="rounded-2xl ghost-border bg-surface-container-lowest p-5">
                    <dt className="font-bold text-on-surface mb-1">
                      {e.term}
                      {e.aliases && e.aliases.length > 0 && (
                        <span className="text-on-surface-variant font-normal text-sm">
                          {' '}- also: {e.aliases.join(', ')}
                        </span>
                      )}
                    </dt>
                    <dd className="text-sm text-on-surface leading-relaxed">
                      {e.definition}
                      {e.link && (
                        <div className="mt-2">
                          <Link href={e.link.href} className="text-primary text-sm hover:underline">
                            {e.link.label} -&gt;
                          </Link>
                        </div>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}

        <section className="mt-12 pt-8 border-t border-on-surface/10">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Missing a term, or think a definition is wrong? Email <a href="mailto:hello@plantspack.com" className="text-primary hover:underline">hello@plantspack.com</a> - we update this page when readers flag gaps.
          </p>
        </section>
      </article>
    </div>
  )
}
