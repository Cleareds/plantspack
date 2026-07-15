import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ACTION_AMOUNTS, TIERS, gameCitySummary, type GameCitySummary } from '@/lib/sprouts'
import { sproutsOpenFor, SPROUTS_ENABLED_FOR_ALL } from '@/lib/sprouts-constants'
import RealTreeCeremony from '@/components/sprouts/RealTreeCeremony'
import { Sprout, TreeDeciduous, Trophy, Coins, Leaf, MapPin, Camera } from 'lucide-react'

export const metadata = {
  title: 'Sprouts - Plants Pack contribution rewards',
  description: 'Earn Sprouts by adding vegan venues and writing reviews. Grow your Vegan City in the game, plant real trees, unlock partner perks.',
}
// Gated by SPROUTS_ENABLED_FOR_ALL (sprouts-constants): admin-only while the
// flag is off, everyone (signed-in or not) once it flips.
export const dynamic = 'force-dynamic'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export default async function SproutsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  let viewerRole: string | null = null
  if (user) {
    const { data: viewerProfile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle()
    viewerRole = (viewerProfile as any)?.role ?? null
  }
  if (!sproutsOpenFor(viewerRole)) notFound()

  // Top contributors (public, lifetime-ranked).
  const { data: top } = await admin.from('users')
    .select('id, username, avatar_url, sprouts_lifetime, sprouts_seeded, forest_size')
    .gt('sprouts_lifetime', 0)
    .order('sprouts_lifetime', { ascending: false })
    .limit(10)

  // real-tree ceremony inputs: viewer's balance + their game city score
  // (guests see the page with zeroed ceremony inputs once the flag is on)
  const emptyCity: GameCitySummary = { score: 0, cityName: '', citiesBuilt: 0, buildings: 0, hasSave: false }
  const [{ data: me }, citySummary] = user
    ? await Promise.all([
        admin.from('users').select('sprouts_balance, sprouts_lifetime').eq('id', user.id).single(),
        gameCitySummary(user.id),
      ])
    : [{ data: null }, emptyCity]

  // Only actions that actually mint today (add-place + review hooks are the
  // live ones). Posts / profile / streaks / onboarding actions exist in the
  // catalog but aren't wired yet - per the honesty rule they don't get
  // advertised until they credit for real.
  const earnGroups = [
    {
      label: 'Add vegan venues', icon: MapPin, items: [
        ['Add a place', ACTION_AMOUNTS.add_place],
        ['Add a place with photo', ACTION_AMOUNTS.add_place_with_image],
      ],
    },
    {
      label: 'Reviews', icon: Camera, items: [
        ['Text review', ACTION_AMOUNTS.review_text],
        ['Review with photo', ACTION_AMOUNTS.review_with_photo],
        ['Review with video', ACTION_AMOUNTS.review_with_video],
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          {!SPROUTS_ENABLED_FOR_ALL && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
              <Sprout className="w-3.5 h-3.5" /> Currently in admin-only preview
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-3">
            <Sprout className="w-10 h-10 text-emerald-600" />
            Sprouts
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            A way to recognise the people doing the actual work of mapping the plant-based world.
            Earn Sprouts for adding vegan venues and writing reviews. Grow
            your Vegan City in the game. Plant a real tree. Trade Sprouts for partner perks.
          </p>
        </div>

        {/* Real-tree ceremony: game score + sprouts -> one real tree */}
        <RealTreeCeremony
          score={citySummary.score}
          hasSave={citySummary.hasSave}
          cityName={citySummary.cityName}
          balance={(me as { sprouts_balance?: number } | null)?.sprouts_balance ?? 0}
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
            Daily caps apply to repeat actions so the system rewards meaningful contributions, not farming.
            Earnings are credited when the action is verified. More ways to earn (posts, profile,
            streaks) are planned and will appear here once they credit for real.
          </p>
        </section>

        {/* Your Vegan City: the game is the tree now */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TreeDeciduous className="w-6 h-6 text-emerald-700" /> Grow your Vegan City
          </h2>
          <p className="text-gray-700 mb-4">
            Your profile tree grows with your city in{' '}
            <a href="https://play.plantspack.com" className="text-emerald-700 font-semibold hover:underline">Plants Pack Play</a>:
            turn a grey industrial map into a thriving vegan town, watch your tree move
            from seedling to full blossom as the Vegan City Score climbs, and keep a grove
            of every city you finish. Every score point cuts the real-tree price by 2
            Sprouts - a score-750 city plants a REAL tree for free.
          </p>
          <a
            href="https://play.plantspack.com"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800"
          >
            🎮 Play Plants Pack Play
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
                <div className="font-mono text-emerald-700 font-bold">0-1,500 Sprouts</div>
              </div>
              <p className="text-sm text-gray-700">
                1,500 Sprouts plants a real tree with a reforestation partner - or let your Vegan City in the game pay for it: every score point knocks 2 Sprouts off, and a score-750 city plants it for free. One tree per 90 days; the certificate lands on your profile as a golden tree.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-gray-900">Cleareds discount</div>
                <div className="font-mono text-emerald-700 font-bold">500 Sprouts</div>
              </div>
              <p className="text-sm text-gray-700">
                50% off any IT consultancy or development engagement with <a href="https://cleareds.com" className="underline">Cleareds</a> - the company that builds Plants Pack.
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
          Sprouts are non-transferable, have no cash value, and are not a security or cryptocurrency. They are a way to recognise contributions on Plants Pack.
        </div>
      </div>
    </div>
  )
}
