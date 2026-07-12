'use client'

// The profile's Vegan City: the game and the platform unified in one story.
// Your CURRENT city is a tree that grows with the game's Vegan City Score;
// completed cities form your grove; real planted trees (from the ceremony)
// are golden certificate trees. This replaces the old seed-sprouts-into-a-
// digital-tree "forest" concept.
//
// Gated on SPROUTS_ENABLED_FOR_ALL (admin-only while off, everyone after) -
// same gate as SproutsCard; the backing API mirrors it.

import { useEffect, useState } from 'react'
import { Gamepad2, TreeDeciduous, ExternalLink } from 'lucide-react'
import { SPROUTS_ENABLED_FOR_ALL } from '@/lib/sprouts-constants'

interface PlantedTree {
  id: string
  partner: string | null
  partner_tree_id: string | null
  tree_location: string | null
  planted_at: string | null
}
interface ArchivedCity {
  id: string
  name: string
  score: number
  buildings: number
  created_at: string
}
interface CityData {
  score: number
  cityName: string
  citiesBuilt: number
  buildings: number
  hasSave: boolean
  planted: PlantedTree[]
  archived: ArchivedCity[]
}

// current-city tree stage by GAME score (mirrors the game's milestones)
const STAGES = [
  { min: 400, img: '/sprouts-trees/ptree_blossom.png', label: 'Blossoming city' },
  { min: 250, img: '/sprouts-trees/ptree_mature.png', label: 'Mature city' },
  { min: 120, img: '/sprouts-trees/ptree_young.png', label: 'Growing city' },
  { min: 25, img: '/sprouts-trees/ptree_sapling.png', label: 'Young city' },
  { min: 0, img: '/sprouts-trees/ptree_seedling.png', label: 'Fresh seedling' },
]
const stageFor = (score: number) => STAGES.find((s) => score >= s.min) ?? STAGES[STAGES.length - 1]

export default function VeganCityCard({
  userId, isOwnProfile, viewerIsAdmin,
}: {
  userId: string
  isOwnProfile: boolean
  viewerIsAdmin: boolean
}) {
  const [data, setData] = useState<CityData | null>(null)
  const visible = SPROUTS_ENABLED_FOR_ALL || viewerIsAdmin

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    fetch(`/api/profile/vegan-city?userId=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setData(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId, visible])

  // Admin-only while the launch flag is off, and only when there is anything to show
  if (!visible || !data) return null
  if (!data.hasSave && data.planted.length === 0 && data.archived.length === 0) return null

  const stage = stageFor(data.score)
  const name = data.cityName.trim() || 'Vegan City'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TreeDeciduous className="w-5 h-5 text-emerald-700" />
          <h3 className="font-bold text-gray-900">Vegan City</h3>
        </div>
        <a
          href="https://play.plantspack.com"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
        >
          <Gamepad2 className="w-3.5 h-3.5" /> {isOwnProfile ? 'Open your city' : 'Build yours'}
        </a>
      </div>

      <div className="flex items-center gap-4">
        {/* the current city as a growing tree */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={stage.img} alt={stage.label} className="w-24 h-24 object-contain shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-sm text-gray-600">
            {stage.label} · Score <b className="text-emerald-700">{data.score}</b>
            {data.buildings > 0 && <> · {data.buildings} places</>}
          </p>
          {data.citiesBuilt > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{data.citiesBuilt} finished {data.citiesBuilt === 1 ? 'city' : 'cities'}</p>
          )}
        </div>
      </div>

      {/* finished cities: a real LIST when the archive has rows, else the
          legacy grove icons from the counter (pre-archive completions) */}
      {data.archived.length > 0 ? (
        <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
          {data.archived.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sprouts-trees/ptree_city.png" alt="" className="w-9 h-9 object-contain shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500">Score {c.score} · {c.buildings} places · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : data.citiesBuilt > 0 ? (
        <div className="mt-4 flex items-end gap-1 flex-wrap">
          {Array.from({ length: Math.min(data.citiesBuilt, 12) }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={'c' + i} src="/sprouts-trees/ptree_city.png" alt="Finished city" title="A finished Vegan City" className="w-12 h-12 object-contain" />
          ))}
        </div>
      ) : null}
      {/* golden trees for real planted ones */}
      {data.planted.length > 0 && (
        <div className="mt-3 flex items-end gap-1 flex-wrap">
          {data.planted.map((t) => {
            const cert = t.partner_tree_id && t.partner_tree_id.startsWith('http') ? t.partner_tree_id : null
            const title = `Real tree planted${t.tree_location ? ` in ${t.tree_location}` : ''}${t.partner ? ` with ${t.partner}` : ''}`
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/sprouts-trees/ptree_gold.png" alt="Real planted tree" title={title} className="w-14 h-14 object-contain" />
            )
            return cert ? (
              <a key={t.id} href={cert} target="_blank" rel="noopener noreferrer" className="relative hover:scale-105 transition-transform" title={title}>
                {img}
                <ExternalLink className="w-3 h-3 absolute -top-0.5 -right-0.5 text-amber-600" />
              </a>
            ) : (
              <span key={t.id}>{img}</span>
            )
          })}
        </div>
      )}
      {data.planted.length > 0 && (
        <p className="text-xs text-amber-700 font-semibold mt-2">
          🌳 {data.planted.length} real {data.planted.length === 1 ? 'tree' : 'trees'} planted - grown from Sprouts and a finished Vegan City.
        </p>
      )}
    </div>
  )
}
