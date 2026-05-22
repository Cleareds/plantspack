import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { ACTION_AMOUNTS, TIERS, TREE_STAGES, getMyState, tierFor, treeStageFor } from '@/lib/sprouts'
import { Sprout, TreeDeciduous, Trophy, Coins, Leaf, Heart, MapPin, Camera, ScrollText, Users } from 'lucide-react'

export const metadata = {
  title: 'Sprouts - PlantsPack contribution rewards',
  description: 'Earn Sprouts by adding vegan venues, writing reviews, and sharing your vegan journey. Seed a digital tree, plant real ones, unlock partner perks.',
}
export const revalidate = 3600

export default async function SproutsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  let role: string | null = null
  let myState = null
  if (user) {
    const { data } = await sb.from('users').select('role').eq('id', user.id).maybeSingle()
    role = (data as any)?.role ?? null
    if (role === 'admin') myState = await getMyState(user.id)
  }

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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="mx-auto max-w-4xl px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
            <Sprout className="w-3.5 h-3.5" /> Currently in admin-only preview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-emerald-900 mb-3 flex items-center justify-center gap-3">
            <Sprout className="w-10 h-10 text-emerald-600" />
            Sprouts
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            A way to recognise the people doing the actual work of mapping the plant-based world.
            Earn Sprouts for adding venues, writing reviews, and sharing your vegan journey. Seed
            a digital tree. Plant a real one. Trade Sprouts for partner perks.
          </p>
        </div>

        {/* Admin state card */}
        {myState && (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-emerald-900">Your Sprouts</h2>
              <Link href="/sprouts/me" className="text-sm text-emerald-700 hover:underline">{'View tree ->'}</Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-700">{myState.balance.toLocaleString()}</div>
                <div className="text-xs text-gray-600 mt-1">Balance</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-700">{myState.lifetime.toLocaleString()}</div>
                <div className="text-xs text-gray-600 mt-1">Lifetime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-rose-700">{myState.seeded.toLocaleString()}</div>
                <div className="text-xs text-gray-600 mt-1">Seeded</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-center text-sm">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">{myState.tier.label}</span>
              {myState.nextTier && (
                <span className="text-gray-600">
                  - {myState.toNext.toLocaleString()} to {myState.nextTier.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tiers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6" /> Lifetime tiers
          </h2>
          <p className="text-gray-700 mb-4">
            Your tier is set by lifetime Sprouts earned. Spending Sprouts does not lower your tier - once you reach Silver, you stay Silver.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIERS.map(t => (
              <div key={t.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-sm font-semibold text-gray-900">{t.label}</div>
                <div className="text-xs text-gray-600 mt-1">{t.min.toLocaleString()}+</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Supporters (medium and premium subscription tiers) earn 1.5x Sprouts on every organic action.
          </p>
        </section>

        {/* How to earn */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Coins className="w-6 h-6" /> How to earn
          </h2>
          <div className="space-y-4">
            {earnGroups.map(g => (
              <div key={g.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 mb-3">
                  <g.icon className="w-5 h-5" /> {g.label}
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
          <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <TreeDeciduous className="w-6 h-6" /> Grow a tree
          </h2>
          <p className="text-gray-700 mb-4">
            Seed Sprouts into your digital tree to watch it grow through seven stages. Seeded Sprouts come from your balance, but your lifetime total is untouched - the tree is a way to put your contributions visibly on display, not lose them.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TREE_STAGES.map(s => (
              <div key={s.stage} className="bg-white rounded-xl border border-emerald-100 p-3 text-center">
                <div className="text-2xl">{['◯','🌱','🌿','🌳','🌳','🌲','🌳','🌲'][s.stage]}</div>
                <div className="text-xs font-semibold text-emerald-900 mt-1">{s.label}</div>
                <div className="text-xs text-gray-600">{s.min.toLocaleString()}+</div>
              </div>
            ))}
          </div>
        </section>

        {/* Spend */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Leaf className="w-6 h-6" /> What to spend Sprouts on
          </h2>
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-emerald-900">Plant a real tree</div>
                <div className="font-mono text-emerald-700 font-bold">1,000 Sprouts</div>
              </div>
              <p className="text-sm text-gray-700">
                Silver tier (2,000 lifetime) unlocks the ability to convert 1,000 Sprouts into a real tree planted via a reforestation partner (Eden Reforestation Projects). PlantsPack covers the planting cost.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-emerald-900">Cleareds discount</div>
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
