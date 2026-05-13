/**
 * Cow companion - side profile, thin green line. Rectangular body,
 * small horns, floppy ear, simple muzzle, long tail with tuft.
 */
import { VIEW_BOX, LINE, FILL_GREEN } from './_shared'

interface AnimalProps { stage?: import('../messages').Stage }

export default function Cow(_props: AnimalProps = {}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      role="img"
      aria-label="Cow companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body" {...LINE}>
        {/* legs */}
        <path d="M72 130 L70 168" />
        <path d="M100 130 L98 168" />
        <path d="M148 130 L150 168" />
        <path d="M170 130 L172 168" />
        {/* hooves */}
        <path d="M66 168 L76 168 M70 168 L70 172" />
        <path d="M94 168 L104 168 M98 168 L98 172" />
        <path d="M144 168 L154 168 M150 168 L150 172" />
        <path d="M166 168 L176 168 M172 168 L172 172" />
        {/* body - longer, more rectangular than pig */}
        <path d="
          M 56 116
          C 56 100 70 90 90 88
          C 110 86 132 88 152 92
          C 162 94 168 100 170 110
          L 170 130
          L 64 130
          C 56 128 54 122 56 116 Z
        " />
        {/* tail (long, curving down on left, with tuft) */}
        <path d="M 56 110 q -10 8 -8 30" />
        <ellipse cx="47" cy="142" rx="3.5" ry="5" />
        <path d="M 47 137 q 1 -2 0 -3 M 47 147 q 1 2 0 3 M 44 144 q -2 1 -3 0 M 50 144 q 2 1 3 0" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '180px 110px', transformBox: 'fill-box' }}>
        {/* head + muzzle (rounded rectangle, lower than back line) */}
        <path d="
          M 168 104
          C 170 92 184 86 196 90
          C 208 94 212 104 208 114
          C 204 124 192 126 184 122
          L 178 118
          C 172 116 170 110 168 104 Z
        " {...LINE} />
        {/* horn (single visible horn, simple curve) */}
        <path d="M 188 88 Q 186 82 192 80" {...LINE} />
        <path d="M 196 88 Q 198 82 202 84" {...LINE} />
        {/* ear */}
        <path d="M 200 92 Q 208 88 210 96 Q 206 100 200 98" {...LINE} />
        {/* muzzle line */}
        <path d="M 200 112 Q 206 114 210 110" {...LINE} />
        {/* nostril */}
        <ellipse cx="206" cy="113" rx="0.9" ry="0.5" {...FILL_GREEN} />
        {/* eye */}
        <ellipse cx="194" cy="98" rx="1.6" ry="2.2" {...FILL_GREEN} />
      </g>
    </svg>
  )
}
