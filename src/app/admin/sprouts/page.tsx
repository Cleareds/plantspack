'use client'

import { TREE_STAGES, TIERS } from '@/lib/sprouts'
import TreeStageSvg from '@/components/sprouts/TreeStageSvg'
import ForestPreview from '@/components/sprouts/ForestPreview'

const FOREST_COUNTS = [1, 3, 7, 15]

export default function AdminSproutsPreview() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sprouts visual preview</h1>
      <p className="text-sm text-gray-600 mb-8">
        All 8 tree stages and forest variants. Used for QA without spending Sprouts.
        Browse → tell me which stage to tweak.
      </p>

      {/* Tree stages */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tree stages</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TREE_STAGES.map(s => (
            <div key={s.stage} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
              <TreeStageSvg stage={s.stage} size={180} />
              <div className="mt-3 text-sm font-bold text-gray-900">Stage {s.stage}</div>
              <div className="text-xs text-gray-600">{s.label}</div>
              <div className="text-xs text-emerald-700 font-mono mt-1">{s.min.toLocaleString()}+ seeded</div>
            </div>
          ))}
        </div>
      </section>

      {/* Forest variants */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Forest variants</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FOREST_COUNTS.map(n => (
            <div key={n} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
              <ForestPreview count={n} size={180} />
              <div className="mt-3 text-sm font-bold text-gray-900">{n} matured tree{n === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tier chips */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tier chips</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TIERS.map(t => (
            <div key={t.key} className={`rounded-xl border p-4 text-center ${t.chip}`}>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="text-xs opacity-80 mt-1">{t.min.toLocaleString()}+ lifetime</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Sizes</h2>
        <p className="text-sm text-gray-600 mb-3">Same SVG at the sizes used across the site.</p>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end gap-6 flex-wrap">
            {[36, 56, 96, 120, 200].map(sz => (
              <div key={sz} className="text-center">
                <TreeStageSvg stage={5} size={sz} />
                <div className="text-xs text-gray-600 mt-1">size={sz}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
