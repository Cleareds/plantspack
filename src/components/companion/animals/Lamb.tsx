/**
 * Lamb companion — side profile, thin green line, no wool scribbles.
 *
 * The outer silhouette uses gentle undulating curves along the back
 * and belly to imply fluffy wool without drawing every curl. Head is
 * smaller and slightly raised, ear leaning back. Four thin legs,
 * pronounced hooves.
 */
import { VIEW_BOX, LINE, FILL_GREEN } from './_shared'

interface AnimalProps { stage?: import('../messages').Stage }

export default function Lamb(_props: AnimalProps = {}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      role="img"
      aria-label="Lamb companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body" {...LINE}>
        {/* legs (drawn first, body overlays the tops) */}
        <path d="M82 130 L80 168" />
        <path d="M106 130 L104 168" />
        <path d="M150 130 L152 168" />
        <path d="M172 130 L174 168" />
        {/* hooves */}
        <path d="M76 168 L86 168 M76 168 Q78 172 80 168 M82 168 Q84 172 86 168" />
        <path d="M100 168 L110 168 M100 168 Q102 172 104 168 M106 168 Q108 172 110 168" />
        <path d="M148 168 L158 168" />
        <path d="M170 168 L180 168" />
        {/* body silhouette: wavy cloud back, smoother belly */}
        <path d="
          M 62 128
          C 58 118 60 108 70 104
          C 78 96 86 102 92 100
          C 100 94 108 102 114 100
          C 122 94 130 102 138 102
          C 146 96 154 100 158 104
          C 162 102 166 100 172 102
          L 178 116
          C 178 122 174 128 168 130
          L 62 128 Z
        " />
        {/* tail (small wool tuft) */}
        <path d="M62 116 q -8 -2 -8 6 q 4 4 8 0" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '186px 110px', transformBox: 'fill-box' }}>
        {/* head and muzzle (one continuous line) */}
        <path
          d="
            M 168 102
            C 174 92 184 90 192 94
            C 200 96 206 102 208 110
            C 210 118 206 124 198 126
            C 192 128 184 126 178 124
          "
          {...LINE}
        />
        {/* ear */}
        <path d="M 184 92 Q 188 84 194 88 Q 192 94 188 95" {...LINE} />
        {/* eye */}
        <ellipse cx="195" cy="106" rx="1.4" ry="2" {...FILL_GREEN} />
        {/* nostril hint */}
        <path d="M 205 115 q 1 1 0 2" {...LINE} />
      </g>
    </svg>
  )
}
