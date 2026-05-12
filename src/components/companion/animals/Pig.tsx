/**
 * Pig companion - side profile, thin green line. Rounded body with a
 * pronounced snout, floppy ear, small curly tail, four short legs.
 */
import { VIEW_BOX, LINE, FILL_GREEN } from './_shared'

export default function Pig() {
  return (
    <svg
      viewBox={VIEW_BOX}
      role="img"
      aria-label="Pig companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body" {...LINE}>
        {/* legs */}
        <path d="M80 132 L78 168" />
        <path d="M104 132 L102 168" />
        <path d="M150 132 L152 168" />
        <path d="M172 132 L174 168" />
        {/* hooves */}
        <path d="M74 168 L84 168" />
        <path d="M98 168 L108 168" />
        <path d="M146 168 L156 168" />
        <path d="M168 168 L178 168" />
        {/* body - chunky rounded rectangle */}
        <path d="
          M 64 124
          C 58 112 64 96 80 92
          C 100 86 130 86 150 92
          C 162 96 168 102 170 108
          L 178 110
          C 184 112 186 120 180 124
          C 174 128 168 130 158 132
          L 70 132
          C 64 132 60 128 64 124 Z
        " />
        {/* curly tail */}
        <path d="M 62 116 q -10 -4 -6 -10 q 6 -4 8 4 q 0 4 -4 4" />
        {/* belly line hint */}
        <path d="M 90 130 Q 120 134 150 130" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '170px 110px', transformBox: 'fill-box' }}>
        {/* head (largely overlaps body, just the cheek + snout) */}
        <path d="
          M 170 108
          C 174 96 188 92 196 100
          C 202 106 200 116 192 120
          L 178 120
          C 172 118 168 114 170 108 Z
        " {...LINE} />
        {/* ear (floppy triangle) */}
        <path d="M 174 96 Q 170 84 182 86 Q 184 92 180 98" {...LINE} />
        {/* snout disc */}
        <ellipse cx="196" cy="110" rx="6" ry="5" {...LINE} />
        {/* nostrils */}
        <circle cx="194" cy="110" r="0.9" {...FILL_GREEN} />
        <circle cx="199" cy="110" r="0.9" {...FILL_GREEN} />
        {/* eye */}
        <ellipse cx="184" cy="104" rx="1.6" ry="2.2" {...FILL_GREEN} />
      </g>
    </svg>
  )
}
