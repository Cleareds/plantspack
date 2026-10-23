import { Metadata } from 'next'
import Link from 'next/link'
import { PARTNER_FEATURES, PARTNER_PRICE } from '@/lib/business/plan'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Business terms | PlantsPack',
  description: 'Terms for venue owners using PlantsPack business tools and the Partner plan.',
  alternates: { canonical: 'https://www.plantspack.com/business/terms' },
}

const LAST_UPDATED = '23 October 2026'

/**
 * Business terms for owners. Plain language; supplements the general Terms of
 * Service. Review with legal counsel before the paid launch.
 */
export default function BusinessTermsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <article className="max-w-3xl mx-auto px-4 py-12 prose prose-neutral dark:prose-invert">
        <h1>Business terms</h1>
        <p>Last updated: {LAST_UPDATED}. These terms apply to owners and managers of places listed on PlantsPack who use the business tools, free or paid. They add to the general <Link href="/legal/terms">Terms of Service</Link> and the <Link href="/legal/privacy">Privacy Policy</Link>. PlantsPack is operated by Cleareds, a company registered in Belgium.</p>

        <h2>1. Claiming a place</h2>
        <p>You may claim a place only if you own it, manage it, or are authorised to act for it. We check every claim by hand and may ask for proof. We may refuse a claim or remove an owner if the information is wrong or the account is misused.</p>

        <h2>2. What stays ours</h2>
        <ul>
          <li><strong>Position in lists and search.</strong> No plan or payment changes where a place appears.</li>
          <li><strong>The vegan level and verification.</strong> You can ask for a change; our team decides.</li>
          <li><strong>Reviews.</strong> You can reply. We do not remove reviews because an owner disagrees; we remove reviews that break our community guidelines.</li>
        </ul>

        <h2>3. Your content</h2>
        <p>You are responsible for what you publish through the business tools: details, photos, menus, vegan marks on dishes, deals, events, messages and links. It must be true, legal, and yours to publish. Vegan marks on a menu are your statement about your dishes. Deals must be honoured as described. We may edit, hide or remove content that is misleading, unlawful, or against our guidelines. You give us permission to show this content on PlantsPack and in our apps.</p>

        <h2>4. Messages to followers</h2>
        <p>Partner places can send one short message a month to people who follow the place&apos;s city or saved the place on PlantsPack. Messages appear as in-app notifications, without links to other websites. People can switch these messages off. Do not use messages for anything unrelated to your place.</p>

        <h2>5. The Partner plan</h2>
        <p>The Partner plan costs €{PARTNER_PRICE.monthEur} a month or €{PARTNER_PRICE.yearEur} a year per place, plus VAT where it applies. It includes:</p>
        <ul>
          {PARTNER_FEATURES.map((f) => <li key={f.key}><strong>{f.title}.</strong> {f.text}</li>)}
        </ul>
        <p>Payment is handled by Stripe. The plan renews automatically at the end of each month or year until you cancel. You can cancel at any time from your business dashboard (Plan and billing, Manage billing); the plan stays active until the end of the period you paid for. We do not refund part-periods, except where the law requires it. If a payment fails, the paid tools may stop after a short grace period; the free tools stay.</p>
        <p>We may change the price or the contents of the plan with at least 30 days&apos; notice by email. A price change applies from your next billing period, and you can cancel before it does.</p>

        <h2>6. Free tools</h2>
        <p>Editing your details, replying to reviews, publishing your menu, your stats, the monthly summary email, the sticker and table card, the website badge and events stay free. We may change or end free tools at any time.</p>

        <h2>7. Ending</h2>
        <p>You can stop using the business tools at any time. We may suspend or end your access if you break these terms; for a paid plan ended by us without a breach on your side, we refund the unused part.</p>

        <h2>8. Liability</h2>
        <p>We provide the business tools as they are. We do not promise a number of visitors, bookings or sales. To the extent the law allows, our liability is limited to the amount you paid us in the 12 months before the claim.</p>

        <h2>9. Contact</h2>
        <p>Questions about these terms or your plan: <a href="mailto:hello@plantspack.com">hello@plantspack.com</a>.</p>
      </article>
    </div>
  )
}
