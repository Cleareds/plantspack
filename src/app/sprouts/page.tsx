import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ACTION_AMOUNTS, TIERS, gameCitySummary } from '@/lib/sprouts'
import RealTreeCeremony from '@/components/sprouts/RealTreeCeremony'
import { Sprout, TreeDeciduous, Trophy, Coins, Leaf, Heart, MapPin, Camera, Users } from 'lucide-react'

export const metadata = {
  title: 'Sprouts - PlantsPack contribution rewards',
  description: 'Earn Sprouts by adding vegan venues, writing reviews, and sharing your vegan journey. Grow your Vegan City in the game, plant real trees, unlock partner perks.',
}
// Admin-only during phase 1. Anyone else gets a 404.
export const dynamic = 'force-dynamic'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export default async function SproutsPage() {
  // Admin-only gate
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) notFound()
  const { data: viewerProfile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle()
  if ((viewerProfile as any)?.role !== 'admin') notFound()

  // Top contributors (public, lifetime-ranked). Currently admin-only during phase 1.
  const { data: top } = await admin.from('users')
    .select('id, username, avatar_url, sprouts_lifetime, sprouts_seeded, forest_size')
    .gt('sprouts_lifetime', 0)
    .order('sprouts_lifetime', { ascending: false })
    .limit(10)

  // real-tree ceremony inputs: viewer's balance + their game city score
  const [{ data: me }, citySummary] = await Promise.all([
    admin.from('users').select('sprouts_balance, sprouts_lifetime').eq('id', user.id).single(),
    gameCitySummary(user.id),
  ])

  const earnGroups = [
    {
      label: 'Add vegan venues', icon: MapPin, items: [
        ['Add a place', ACTION_AMOUNTS.add_place],
        ['Add a place with photo', ACTION_AMOUNTS.add_place_with_image],
        ['Correction approved', ACTION_AMOUNTS.place_correction_approved],
      ],
    },
    {
      label: 'Reviews', icon: Camera, items: [
        ['Text review', ACTION_AMOUNTS.review_text],
        ['Review with photo', ACTION_AMOUNTS.review_with_photo],
        ['Review with video', ACTION_AMOUNTS.review_with_video],
        ['Helpful vote received', ACTION_AMOUNTS.review_helpful_vote_received],
      ],
    },
    {
      label: 'Community', icon: Users, items: [
        ['Share your vegan journey', ACTION_AMOUNTS.post_share_journey],
        ['Recipe post', ACTION_AMOUNTS.post_recipe],
        ['Tip post', ACTION_AMOUNTS.post_tip],
      ],
    },
    {
      label: 'Tell us about you', icon: Heart, items: [
        ['Set vegan status', ACTION_AMOUNTS['profile.is_vegan']],
        ['Add vegan-since date', ACTION_AMOUNTS['profile.vegan_since']],
        ['Write your transition story', ACTION_AMOUNTS['profile.transition_story']],
        ['Share why you went vegan', ACTION_AMOUNTS['profile.vegan_reasons']],
        ['Add favourite vegan meal', ACTION_AMOUNTS['profile.favourite_vegan_meal']],
        ['Current challenges', ACTION_AMOUNTS['profile.current_challenges']],
        ['Dietary specifics', ACTION_AMOUNTS['profile.dietary_specifics']],
        ['Bio', ACTION_AMOUNTS['profile.bio']],
        ['Avatar', ACTION_AMOUNTS['profile.avatar']],
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
            <Sprout className="w-3.5 h-3.5" /> Currently in admin-only preview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
            <Sprout className="w-10 h-10 text-emerald-600" />
            Sprouts
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            A way to recognise the people doing the actual work of mapping the plant-based world.
            Earn Sprouts for adding venues, writing reviews, and sharing your vegan journey. Grow
            your Vegan City in the game. Plant a real tree. Trade Sprouts for partner perks.
          </p>
        </div>

        {/* Real-tree ceremony: game score + sprouts -> one real tree */}
        <RealTreeCeremony
          score={citySummary.score}
          hasSave={citySummary.hasSave}
          cityName={citySummary.cityName}
          balance={(me as { sprouts_balance?: number } | null)?.sprouts_balance ?? 0}
          lifetime={(me as { sprouts_lifetime?: number } | null)?.sprouts_lifetime ?? 0}
        />

        {/* Top contributors */}
        {top && top.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-600" /> Top contributors
            </h2>
            <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {top.map((u: any, i) => {
                const tier = TIERS.slice().reverse().find(t => u.sprouts_lifetime >= t.min) || TIERS[0]
                return (
                  <li key={u.id} className="flex items-center gap-3 p-3">
                    <span className="w-6 text-center text-sm font-mono text-gray-500">{i + 1}</span>
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Sprout className="w-4 h-4" />
                      </div>
                    )}
                    <Link href={`/profile/${u.username}`} className="font-semibold text-gray-900 hover:underline flex-1 truncate">
                      @{u.username}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${tier.chip}`}>{tier.label}</span>
                    <span className="font-mono font-bold text-emerald-700 w-20 text-right">{u.sprouts_lifetime.toLocaleString()}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Tiers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6" /> Lifetime tiers
          </h2>
          <p className="text-gray-700 mb-4">
            Your tier is set by lifetime Sprouts earned. Spending Sprouts never lowers your tier - once you reach Sapling, you stay Sapling.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIERS.map(t => (
              <div key={t.key} className={`rounded-xl border p-4 text-center ${t.chip}`}>
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs opacity-80 mt-1">{t.min.toLocaleString()}+</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Supporters (medium and premium subscription tiers) earn 1.5x Sprouts on every organic action.
          </p>
        </section>

        {/* How to earn */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Coins className="w-6 h-6" /> How to earn
          </h2>
          <div className="space-y-4">
            {earnGroups.map(g => (
              <div key={g.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                  <g.icon className="w-5 h-5 text-emerald-700" /> {g.label}
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-sm">
                  {g.items.map(([label, amount]) => (
                    <li key={label as string} className="flex items-center justify-between gap-3 pr-4">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-mono text-emerald-700 font-semibold">+{amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Daily caps apply to repeat actions (reviews, helpful votes) so the system rewards meaningful contributions, not farming.
            One-time profile fields count once each. Earnings are credited when the action is verified.
          </p>
        </section>

        {/* Your Vegan City: the game is the tree now */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TreeDeciduous className="w-6 h-6 text-emerald-700" /> Grow your Vegan City
          </h2>
          <p className="text-gray-700 mb-4">
            Your profile tree grows with your city in{' '}
            <a href="https://play.plantspack.com" className="text-emerald-700 font-semibold hover:underline">PlantsPack Play</a>:
            turn a grey industrial map into a thriving vegan town, watch your tree move
            from seedling to full blossom as the Vegan City Score climbs, and keep a grove
            of every city you finish. Reach score 400 with 1,000 Sprouts and the city
            plants a REAL tree.
          </p>
          <a
            href="https://play.plantspack.com"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800"
          >
            🎮 Play PlantsPack Play
          </a>
        </section>

        {/* Spend */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-700" /> What to spend Sprouts on
          </h2>
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">Plant a real tree</div>
                <div className="font-mono text-emerald-700 font-bold">1,000 Sprouts</div>
              </div>
              <p className="text-sm text-gray-700">
                Reach Vegan City Score 400 in the game and Sapling tier (2,000 lifetime), then convert 1,000 Sprouts into a real tree ordered with a reforestation partner. The certificate lands on your profile as a golden tree.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">Cleareds discount</div>
                <div className="font-mono text-emerald-700 font-bold">500 Sprouts</div>
              </div>
              <p className="text-sm text-gray-700">
                50% off any IT consultancy or development engagement with <a href="https://cleareds.com" className="underline">Cleareds</a> - the company that builds PlantsPack.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">Run a vegan brand?</span> Offer a reward to Sprouts
                  holders - the most active contributors mapping the vegan world.
                </div>
                <Link href="/contact?topic=sprouts-partner" className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                  Become a reward partner
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-500 mt-12">
          Sprouts are non-transferable, have no cash value, and are not a security or cryptocurrency. They are a way to recognise contributions on PlantsPack.
        </div>
      </div>
    </div>
  )
}
