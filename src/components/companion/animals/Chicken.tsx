/**
 * Chicken companion. Side profile, thin green line, minimal detail.
 *
 * Two visual variants:
 *   - baby: renders ChickenBaby (user-supplied fluffy chick artwork)
 *   - juvenile / adult: the line-drawn rooster below
 *
 * A rounded body, smaller head set forward and high, simple comb,
 * triangular beak, soft tail plume. Two visible legs (chickens are
 * bipedal, so no "back legs" in side view).
 */
import { VIEW_BOX, LINE, FILL_GREEN } from './_shared'
import type { Stage } from '../messages'
import ChickenBaby from './ChickenBaby'

interface ChickenProps {
  stage?: Stage
}

export default function Chicken({ stage }: ChickenProps = {}) {
  if (stage === 'baby') return <ChickenBaby />
  return <ChickenAdult />
}

function ChickenAdult() {
  return (
    <svg
      viewBox={VIEW_BOX}
      role="img"
      aria-label="Chicken companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body" {...LINE}>
        {/* legs */}
        <path d="M108 138 L106 168" />
        <path d="M140 138 L142 168" />
        {/* feet (3 toes each) */}
        <path d="M100 168 L106 168 M106 168 L104 172 M106 168 L108 172 M106 168 L110 172" />
        <path d="M136 168 L142 168 M142 168 L140 172 M142 168 L144 172 M142 168 L146 172" />
        {/* body — rounded oval with subtle tail plume on the left */}
        <path d="
          M 70 130
          C 60 122 60 108 72 102
          C 84 92 100 92 116 96
          C 132 100 148 102 156 116
          C 160 128 152 138 140 140
          L 108 140
          C 88 140 78 138 70 130 Z
        " />
        {/* tail feathers (3 soft arcs) */}
        <path d="M 70 112 Q 56 100 50 86" />
        <path d="M 66 118 Q 50 110 46 96" />
        <path d="M 72 124 Q 56 122 50 114" />
        {/* wing line on body */}
        <path d="M 92 116 Q 110 122 124 116" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '156px 90px', transformBox: 'fill-box' }}>
        {/* head */}
        <path d="
          M 144 102
          C 142 90 150 80 162 78
          C 174 76 184 82 186 92
          C 188 102 180 110 170 110
          C 158 110 148 108 144 102 Z
        " {...LINE} />
        {/* comb (3 bumps) */}
        <path d="M 156 76 Q 158 70 162 74 Q 164 68 168 74 Q 170 68 174 76" {...LINE} />
        {/* beak (triangle) */}
        <path d="M 186 90 L 196 92 L 186 96 Z" {...LINE} />
        {/* wattle */}
        <path d="M 184 100 Q 188 106 184 110" {...LINE} />
        {/* eye */}
        <ellipse cx="172" cy="92" rx="1.6" ry="2.2" {...FILL_GREEN} />
      </g>
    </svg>
  )
}
