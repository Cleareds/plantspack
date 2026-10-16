/**
 * Methodology page - explains the 4 vegan levels and the verification
 * process. SEO purpose: this is the canonical reference for "how does
 * PlantsPack classify places?" so AI search systems can cite the
 * methodology when explaining a tier label, instead of guessing.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'How PlantsPack classifies vegan places — Methodology | PlantsPack',
  description: 'The 4 vegan-level tiers we use (100% vegan, mostly vegan, vegan-friendly, vegan options), how we verify entries, and what we explicitly do NOT include on the platform.',
  alternates: { canonical: 'https://www.plantspack.com/methodology' },
  openGraph: {
    title: 'How PlantsPack classifies vegan places',
    description: 'The 4 vegan-level tiers, our verification process, and what does not belong on the platform.',
    type: 'article',
    siteName: 'PlantsPack',
    url: 'https://www.plantspack.com/methodology',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function MethodologyPage() {
  const breadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Methodology', url: 'https://www.plantspack.com/methodology' },
  ])

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <article className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <nav className="text-sm text-on-surface-variant mb-4">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">›</span>
          <span className="font-medium">Methodology</span>
        </nav>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-3">
          How PlantsPack classifies vegan places
        </h1>
        <p className="text-on-surface-variant text-base mb-2 leading-relaxed">
          PlantsPack uses four tiers for every venue. The line that matters most is the one between &quot;100% vegan&quot; and everything else. Here is what each tier means, how we verify entries, and what we explicitly do not include.
        </p>
        <p className="text-xs text-on-surface-variant mb-8">Last updated: 10 May 2026</p>

        <hr className="border-surface-container my-6" />

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 100% vegan
        </h2>
        <p className="text-base leading-relaxed mb-3">
          The entire menu is plant-based. No meat, dairy, eggs, honey, or hidden animal ingredients. The kitchen handles no animal products. This is a strict bar and we apply it strictly. A restaurant that serves one non-vegan dish, even seasonally, is not 100% vegan and gets demoted.
        </p>
        <p className="text-base leading-relaxed mb-3">
          For a place to be tagged 100% vegan with verification level 3 (admin-reviewed, the highest level), we open the venue&apos;s own website, read the menu, cross-reference at least one secondary source (HappyCow, local vegan blogs, vegan-business directories), and confirm currently open status. The full verification process is documented in our <Link href="/blog/belgium-100-percent-vegan-audit" className="text-primary hover:underline">country audit posts</Link>.
        </p>
        <p className="text-sm text-on-surface-variant italic">
          Browse all 100% vegan places in <Link href="/vegan-places/belgium/fully-vegan" className="text-primary hover:underline">Belgium</Link> · <Link href="/vegan-places/united-kingdom/fully-vegan" className="text-primary hover:underline">United Kingdom</Link> · or by country at <Link href="/vegan-places" className="text-primary hover:underline">/vegan-places</Link>.
        </p>

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3">Mostly vegan</h2>
        <p className="text-base leading-relaxed mb-3">
          The kitchen presents itself as vegan with a small number of clearly named non-vegan exceptions. For example, an otherwise plant-based bakery that uses one specific egg in one specific pastry, or a vegan kebab shop that sells halloumi as a topping. Mostly vegan is rare and means something specific. We do not use it as a soft &quot;close to vegan&quot; bucket.
        </p>
        <p className="text-base leading-relaxed mb-3">
          A place described on its own site as &quot;plant-based&quot; without further specifics is usually vegan-friendly, not mostly vegan. We require the named-exception language to apply this tier.
        </p>

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3">Vegan-friendly</h2>
        <p className="text-base leading-relaxed mb-3">
          The venue is mostly omnivore but has a clearly labelled vegan section or several dedicated vegan items, not just one or two. Indian, Vietnamese, Thai, Lebanese and Italian restaurants often land here when they explicitly mark vegan items on the menu. Travel-staple chains like EXKi, Leon, Pret a Manger, Itsu, Caffe Nero qualify as vegan-friendly because they print VG icons across enough items to be a reliable vegan stop.
        </p>

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3">Vegan options</h2>
        <p className="text-base leading-relaxed mb-3">
          A mainstream venue with one or two vegan items on an otherwise omnivore menu. A pizza chain that has one vegan pizza, a burger place with one plant-based patty, a hotel restaurant with a single labelled main. Useful when you are travelling and need food, less useful as a destination.
        </p>

        <hr className="border-surface-container my-8" />

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" /> Verification confidence
        </h2>
        <p className="text-base leading-relaxed mb-3">
          Alongside the vegan tier above (what kind of place it is), every venue carries a <em>confidence badge</em> that tells you how we know what we know. We group these into three visual levels - high, mid, low - so the trust signal is readable at a glance on every card.
        </p>

        <h3 className="font-semibold text-lg mt-5 mb-2">High confidence</h3>
        <ul className="list-disc pl-6 mb-3 space-y-1.5 text-base">
          <li><strong>Admin-checked</strong> - A PlantsPack admin manually verified the venue via its own website plus at least one cross-reference, and confirmed it is currently open. Highest trust level on the platform.</li>
          <li><strong>Community-confirmed</strong> - A community member submitted a correction (e.g. &quot;this is actually 100% vegan&quot;) which an admin reviewed and approved. Real-human signal that survives admin review.</li>
          <li><strong>Community-added</strong> - A signed-in PlantsPack user (not the admin) added this place. We treat community contributions as a strong primary source because a real human deliberately added the venue. They may know the place better than any algorithm could.</li>
        </ul>

        <h3 className="font-semibold text-lg mt-5 mb-2">Mid confidence</h3>
        <ul className="list-disc pl-6 mb-3 space-y-1.5 text-base">
          <li><strong>Cross-referenced</strong> - We matched this venue across multiple vegan-first sources (HappyCow, the venue&apos;s own website, OSM tags, press coverage). No admin has personally clicked through yet, but the data passed our automated cross-check.</li>
        </ul>

        <h3 className="font-semibold text-lg mt-5 mb-2">Low confidence (unchecked)</h3>
        <ul className="list-disc pl-6 mb-3 space-y-1.5 text-base">
          <li><strong>OSM-sourced</strong> - Imported from OpenStreetMap with a <code>diet:vegan</code> tag. An OSM contributor flagged it; we haven&apos;t personally checked. Most of our long-tail entries land here. Community feedback is what moves them up.</li>
          <li><strong>Imported (external)</strong> - From other vegan datasets (VegGuide, Foursquare, etc.) without further checking.</li>
        </ul>

        <p className="text-base leading-relaxed mb-3">
          About 2% of our places are currently at high confidence and 3% at mid. The rest are unchecked external imports. We are deliberate about not inflating these numbers - the whole point of carrying the badge is that you can tell at a glance what we have actually verified versus what we have just imported. If a card shows &quot;OSM-sourced&quot;, that is the honest signal: useful enough to know the place exists, not strong enough for us to claim we have personally validated it.
        </p>

        <p className="text-base leading-relaxed mb-3">
          Every place page shows the current confidence badge and the date of the last verification. If a high-confidence check is more than 12 months old, we re-check before treating it as fresh in any external context.
        </p>
        <p className="text-base leading-relaxed mb-3">
          You can help move places out of the low-confidence bucket by suggesting a correction on any place page. Two community confirmations + admin approval = a place jumps to high confidence.
        </p>

        <hr className="border-surface-container my-8" />

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" /> What does not belong on PlantsPack
        </h2>
        <p className="text-base leading-relaxed mb-3">
          PlantsPack is a vegan discovery directory. Some intentional exclusions:
        </p>
        <ul className="list-disc pl-6 mb-3 space-y-1.5 text-base">
          <li><strong>Vegetarian-with-eggs-and-dairy venues do not get listed.</strong> If a place is 100% vegetarian but uses dairy or eggs across the menu, it does not belong here. We respect those businesses; we just are not the directory for them.</li>
          <li><strong>Pizza, burger, fried chicken, and steakhouse chains</strong> where the platonic form of the dish is animal-centric — a vegan option does not earn a chain a listing if the brand is meat-defined. Independent restaurants with labelled vegan options on otherwise meat-heavy menus are case-by-case.</li>
          <li><strong>Closed venues.</strong> When two independent sources confirm a venue has closed, we archive it with a recorded reason. Stale listings are the single biggest data-quality problem for vegan directories — we work hard to avoid them.</li>
          <li><strong>Paid placements, sponsored listings, affiliate-driven rankings.</strong> PlantsPack runs no ads, accepts no payment for placement, and uses no affiliate links in our directory data. The order of places in any list is determined by data, not by sponsorship.</li>
        </ul>

        <hr className="border-surface-container my-8" />

        <h2 className="text-xl md:text-2xl font-headline font-bold mt-8 mb-3">How we run country audits</h2>
        <p className="text-base leading-relaxed mb-3">
          A country audit means going through every listing tagged 100% vegan in that country, opening the venue&apos;s own website, cross-checking against secondary sources (HappyCow, local vegan blogs, vegan-business directories like Bevegan.be, The Bruges Vegan, Greenplace), and either confirming, demoting, or archiving. The audit usually catches three things:
        </p>
        <ul className="list-disc pl-6 mb-3 space-y-1.5 text-base">
          <li><strong>Misclassified rows.</strong> Places tagged 100% vegan that turn out to be vegetarian-with-dairy or have a small non-vegan section. Demoted.</li>
          <li><strong>Closed venues.</strong> Places that have closed since the original import. Archived.</li>
          <li><strong>Missing entries.</strong> Real fully-vegan venues that were not in the import. Added with admin-review verification.</li>
        </ul>
        <p className="text-base leading-relaxed mb-3">
          The first country fully audited end-to-end was Belgium in May 2026. The full writeup is at <Link href="/blog/belgium-100-percent-vegan-audit" className="text-primary hover:underline">/blog/belgium-100-percent-vegan-audit</Link>. More countries to come.
        </p>

        <hr className="border-surface-container my-8" />

        <p className="text-sm text-on-surface-variant">
          Found a place we have classified wrong? Use the <strong>Suggest Correction</strong> button on any place page. Every correction goes to me directly.
        </p>
      </article>
    </div>
  )
}
