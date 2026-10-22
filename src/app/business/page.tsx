import { Metadata } from 'next'
import Link from 'next/link'
import AdminPreviewGate from '@/components/business/AdminPreviewGate'
import { PARTNER_FEATURES, PARTNER_PRICE } from '@/lib/business/plan'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'
import { BarChart3, Building2, MessageSquare, Pencil, QrCode, Search, ShieldCheck, UtensilsCrossed } from 'lucide-react'

// Static page: no cookies, no searchParams, so it is served from the CDN.
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'PlantsPack for Business: free tools for vegan venues',
  description: 'Claim your place on PlantsPack for free. Keep your hours and photos right, reply to reviews, publish your menu and get a QR sticker. Listing and ranking are never paid.',
  alternates: { canonical: 'https://www.plantspack.com/business' },
  ...(BUSINESS_TOOLS_PUBLIC ? {} : { robots: { index: false, follow: false } }),
}

const FREE_TOOLS = [
  { icon: Pencil, title: 'Keep your page right', text: 'Edit hours, address, website, phone and photos. Mark the place as temporarily or permanently closed.' },
  { icon: MessageSquare, title: 'Reply to reviews', text: 'Answer visitors under their review, marked as a reply from the owner.' },
  { icon: UtensilsCrossed, title: 'Publish your menu', text: 'Upload a photo or PDF of your menu. We read the dishes, you check them, and the menu shows on your page.' },
  { icon: BarChart3, title: 'See your numbers', text: 'Page views and saves on your dashboard, and a short monthly summary by email.' },
  { icon: QrCode, title: 'Sticker and table card', text: 'Print a window sticker or table card with a QR code to your page, or ask us for a printed sticker.' },
  { icon: Building2, title: 'Website badge', text: 'A "Find us on PlantsPack" badge for your own website, linking to your page.' },
]

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-surface">
      <AdminPreviewGate fallback={<ComingSoon />}>
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-5">
            <Building2 className="h-3.5 w-3.5" />
            <span>For businesses</span>
          </div>
          <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-tight mb-4">
            Your place on PlantsPack, <span className="text-primary">managed by you</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Run a vegan or vegan-friendly café, restaurant, shop or stay? Claim your page for free and keep it right.
            Listing and ranking on PlantsPack are never paid.
          </p>
        </div>

        <section className="bg-surface-container-lowest rounded-2xl ghost-border p-6 md:p-8 mb-10">
          <h2 className="text-xl font-bold text-on-surface mb-4">Find your place</h2>
          <form action="/search" method="get" className="flex gap-2">
            <label htmlFor="business-search" className="sr-only">Place name and city</label>
            <input
              id="business-search"
              name="q"
              required
              placeholder="Your place name and city"
              className="flex-1 px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary-btn font-medium">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
          <ol className="grid md:grid-cols-3 gap-4 mt-6 text-sm">
            <li className="p-4 rounded-xl bg-surface-container-low">
              <span className="block font-semibold text-on-surface mb-1">1. Open your page</span>
              <span className="text-on-surface-variant">Search above and open your place.</span>
            </li>
            <li className="p-4 rounded-xl bg-surface-container-low">
              <span className="block font-semibold text-on-surface mb-1">2. Press &quot;Claim ownership&quot;</span>
              <span className="text-on-surface-variant">Sign in and tell us how you are connected to the place.</span>
            </li>
            <li className="p-4 rounded-xl bg-surface-container-low">
              <span className="block font-semibold text-on-surface mb-1">3. We check it by hand</span>
              <span className="text-on-surface-variant">When we approve it, your tools are on your business dashboard.</span>
            </li>
          </ol>
          <p className="text-sm text-on-surface-variant mt-5">
            Your place is not on PlantsPack yet? <Link href="/auth?mode=signin&redirect=%2Fmap%3Fadd%3Dtrue" className="text-primary font-medium hover:underline">Sign in and add it</Link>, then claim it from its page.
            Already approved? <Link href="/business/dashboard" className="text-primary font-medium hover:underline">Open your dashboard</Link>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-on-surface mb-4">Free for every verified owner</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FREE_TOOLS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-5 rounded-2xl bg-surface-container-lowest ghost-border">
                <div className="flex items-center gap-2 font-semibold text-on-surface mb-1">
                  <Icon className="h-4 w-4 text-primary" /> {title}
                </div>
                <p className="text-sm text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 md:p-8 mb-10">
          <h2 className="text-xl font-bold text-on-surface mb-1">Want more? The Partner plan</h2>
          <p className="text-on-surface-variant mb-4">€{PARTNER_PRICE.monthEur} a month or €{PARTNER_PRICE.yearEur} a year, per place. Everything above stays free.</p>
          <ul className="grid sm:grid-cols-3 gap-4">
            {PARTNER_FEATURES.map((f) => (
              <li key={f.key} className="text-sm">
                <span className="block font-semibold text-on-surface">{f.title}</span>
                <span className="text-on-surface-variant">{f.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl ghost-border p-6 md:p-8">
          <div className="flex items-center gap-2 font-semibold text-on-surface mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" /> What owners cannot change
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-on-surface-variant">
            <li>Your position in lists and search. Nobody can pay for a better place, not even with the Partner plan.</li>
            <li>The vegan level. You can ask for a change, and our team checks it before it goes live.</li>
            <li>Reviews. You can reply, but reviews are not removed because an owner disagrees.</li>
          </ul>
          <p className="text-sm text-on-surface-variant mt-4">
            Questions? Write to <a href="mailto:hello@plantspack.com" className="text-primary font-medium hover:underline">hello@plantspack.com</a>.
          </p>
        </section>
      </div>
      </AdminPreviewGate>
    </div>
  )
}

function ComingSoon() {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-3">PlantsPack for Business is coming soon</h1>
      <p className="text-on-surface-variant">Own a vegan place listed on PlantsPack? You can already claim it from its page.</p>
    </div>
  )
}

