import Link from 'next/link'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ACTION_AMOUNTS, TIERS, TREE_STAGES } from '@/lib/sprouts'
import { Sprout, TreeDeciduous, Trophy, Coins, Leaf, Heart, MapPin, Camera, Users } from 'lucide-react'
import TreeStageSvg from '@/components/sprouts/TreeStageSvg'
import ForestPreview from '@/components/sprouts/ForestPreview'

export const metadata = {
  title: 'Sprouts - PlantsPack contribution rewards',
  description: 'Earn Sprouts by adding vegan venues, writing reviews, and sharing your vegan journey. Seed a digital tree, plant real ones, unlock partner perks.',
}
export const revalidate = 3600

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export default async function SproutsPage() {
  // Top contributors (public, lifetime-ranked). Currently admin-only during phase 1.
  const { data: top } = await admin.from('users')
    .select('id, username, avatar_url, sprouts_lifetime, sprouts_seeded, forest_size')
    .gt('sprouts_lifetime', 0)
    .order('sprouts_lifetime', { ascending: false })
    .limit(10)

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
            Earn Sprouts for adding venues, writing reviews, and sharing your vegan journey. Seed
            a digital tree. Plant a real one. Trade Sprouts for partner perks.
          </p>
        </div>

        {/* Top contributors */}
        {top && top.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-600" /> Top contributors
            </h2>
            <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {top.map((u: any, i) => {
                const tier = TIERS.slice().reverse().find(t => u.sprouts_lifetime >= t.min) || TIERS[0]
                const stage = TREE_STAGES.slice().reverse().find(s => u.sprouts_seeded >= s.min) || TREE_STAGES[0]
                const forestSize = u.forest_size ?? 0
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
                    {forestSize > 0 ? (
                      <Link href={`/profile/${u.username}/forest`} title={`Forest of ${forestSize} matured trees`} className="shrink-0 hover:opacity-90">
                        <ForestPreview count={forestSize} size={56} />
                      </Link>
                    ) : (
                      <Link href={`/profile/${u.username}/sprouts`} title={stage.label} className="shrink-0 hover:opacity-90">
                        <TreeStageSvg stage={stage.stage} size={42} />
                      </Link>
                    )}
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
            Your tier is set by lifetime Sprouts earned. Spending Sprouts does not lower your tier - once you reach Silver, you stay Silver.
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

        {/* Digital tree */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TreeDeciduous className="w-6 h-6 text-emerald-700" /> Grow a tree
          </h2>
          <p className="text-gray-700 mb-4">
            Seed Sprouts into your digital tree to watch it grow through seven stages. Seeded Sprouts come from your balance, but your lifetime total is untouched - the tree is a way to put your contributions visibly on display, not lose them.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TREE_STAGES.map(s => (
              <div key={s.stage} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <div className="flex justify-center"><TreeStageSvg stage={s.stage} size={72} /></div>
                <div className="text-xs font-semibold text-gray-900 mt-1">{s.label}</div>
                <div className="text-xs text-gray-600">{s.min.toLocaleString()}+</div>
              </div>
            ))}
          </div>
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
                Silver tier (2,000 lifetime) unlocks the ability to convert 1,000 Sprouts into a real tree planted via a reforestation partner (Eden Reforestation Projects). PlantsPack covers the planting cost.
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
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              More partner rewards coming as we sign them. If you run a vegan brand and want to offer something to Sprouts holders, get in touch.
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
