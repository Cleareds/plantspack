'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { CATEGORY_CONFIG } from '@/lib/leaflet-config'

/**
 * Collapsible legend for the map, pinned bottom-left.
 *
 * Addresses Reddit feedback: "Add something that shows what the icons mean,
 * so I don't have to guess what a leaf icon is supposed to represent."
 */
export default function MapLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-4 left-4 z-[500] max-w-[calc(100%-2rem)]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest/95 backdrop-blur-sm ghost-border rounded-full text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors editorial-shadow"
        aria-expanded={open}
        aria-label="Toggle map legend"
      >
        <Info className="h-3.5 w-3.5 text-primary" />
        Legend
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 bg-surface-container-lowest/95 backdrop-blur-sm ghost-border rounded-xl p-3 editorial-shadow w-56">
          <div className="space-y-1.5">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white"
                  style={{ background: cfg.color, fontSize: 12 }}
                >
                  {cfg.emoji}
                </span>
                <span className="text-on-surface">{cfg.label}</span>
              </div>
            ))}
          </div>

          <hr className="my-2.5 border-outline/20" />

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full border-[2.5px] border-white bg-emerald-500" />
              <span className="text-on-surface">White ring = 100% vegan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full border-[2.5px] border-amber-400 bg-emerald-500" />
              <span className="text-on-surface">Amber ring = vegan-friendly</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full border-[1.5px] border-white">
                ★4+
              </span>
              <span className="text-on-surface">Star badge = review rating</span>
            </div>
          </div>

          <p className="text-[10px] text-on-surface-variant/70 mt-2.5 leading-snug">
            Click any pin for details, or hover on desktop.
          </p>
        </div>
      )}
    </div>
  )
}
