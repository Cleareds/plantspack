// Eight tree stages. ViewBox 240x320 (portrait). Trees grow bigger
// each stage. Stages 0-1 sit in a terracotta pot; stages 2+ are planted
// in the ground (grass strip at the bottom).
//
//   0  Empty pot          terracotta pot + soil
//   1  Seedling            stem + two cotyledons in pot
//   2  Young sprout        small trunk, three leaf tufts at top, in ground
//   3  Sapling             taller trunk, two side branches reaching up
//   4  Young tree          full but compact crown with visible branches
//   5  Mature tree         taller, wider, layered canopy
//   6  Flowering tree      mature + pink/white blossoms + falling petals
//   7  Heritage tree       tallest, thickest trunk, fruits, ready to mature
//
// All branches are drawn as cubic Beziers that curve OUTWARD AND UP.
// Canopies are built from overlapping leaf "clusters" with three shades
// (dark = bottom/back, mid = main body, light = top highlight) so the
// tree reads as foliage rather than a single ball.

type Props = { stage: number; className?: string; size?: number }

const POT = '#a16207'
const POT_DARK = '#713f12'
const POT_LIGHT = '#ca8a04'
const SOIL = '#3f2a14'

const TRUNK = '#7c4a1e'
const TRUNK_DARK = '#5b3514'
const TRUNK_BARK = '#4a2c0f'

const LEAF_DARK = '#047857'    // emerald-700
const LEAF_MID = '#10b981'     // emerald-500
const LEAF_LIGHT = '#6ee7b7'   // emerald-300

const STEM = '#22c55e'

const BLOSSOM_A = '#fbcfe8'    // pink-200
const BLOSSOM_B = '#f472b6'    // pink-400
const BLOSSOM_CENTER = '#fef9c3'

const FRUIT = '#dc2626'

const GRASS = '#65a30d'
const GRASS_DARK = '#3f6212'

/* ---------- Reusable parts ---------- */

function Pot() {
  // Sits at the bottom of the viewBox. Rim top at y=252, body to y=308.
  return (
    <g>
      <rect x="62" y="240" width="116" height="12" rx="3" fill={POT_DARK} />
      <path d="M70 252 L170 252 L160 308 L80 308 Z" fill={POT} />
      <path d="M80 256 L90 304" stroke={POT_LIGHT} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <path d="M158 256 L150 304" stroke={POT_DARK} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="120" cy="252" rx="50" ry="4" fill={SOIL} />
    </g>
  )
}

function Ground() {
  // Grass strip across the bottom for stages 2+.
  return (
    <g>
      <ellipse cx="120" cy="306" rx="120" ry="8" fill={GRASS_DARK} opacity="0.25" />
      <rect x="0" y="296" width="240" height="20" fill={GRASS} />
      {/* grass blades */}
      {[10, 30, 55, 78, 95, 145, 165, 190, 215, 232].map((x, i) => (
        <path key={i} d={`M${x} 296 Q${x + 1} 290 ${x + 3} 296`} stroke={GRASS_DARK} strokeWidth="1.5" fill="none" />
      ))}
    </g>
  )
}

// Tapered trunk polygon from baseY at center 120 up to topY, base width 2*halfBase, top width 2*halfTop.
function Trunk({ topY, halfBase, halfTop, baseY = 298 }: { topY: number; halfBase: number; halfTop: number; baseY?: number }) {
  const d = `M ${120 - halfBase} ${baseY}
             C ${120 - halfBase + 1} ${(topY + baseY) / 2}, ${120 - halfTop - 1} ${(topY + baseY) / 2}, ${120 - halfTop} ${topY}
             L ${120 + halfTop} ${topY}
             C ${120 + halfTop + 1} ${(topY + baseY) / 2}, ${120 + halfBase - 1} ${(topY + baseY) / 2}, ${120 + halfBase} ${baseY} Z`
  return (
    <g>
      <path d={d} fill={TRUNK} />
      {/* shade right side */}
      <path d={`M 120 ${topY} L 120 ${baseY} L ${120 + halfBase} ${baseY} C ${120 + halfTop + 1} ${(topY + baseY)/2}, ${120 + halfTop} ${topY}, 120 ${topY} Z`} fill={TRUNK_DARK} opacity="0.35" />
    </g>
  )
}

// Branch curve from (x,y) on the trunk, outward then upward to (ex,ey).
// Reaching UP means ey < y (smaller y = higher visually).
function Branch({ x, y, ex, ey, w = 2 }: { x: number; y: number; ex: number; ey: number; w?: number }) {
  // Control point: closer to start but pulled in the direction of travel,
  // with a strong upward bias so the branch arcs UPWARD before reaching the leaf cluster.
  const cx = (x + ex) / 2
  const cy = Math.min(y, ey) - Math.abs(ex - x) * 0.15 - 6
  return <path d={`M ${x} ${y} Q ${cx} ${cy} ${ex} ${ey}`} stroke={TRUNK} strokeWidth={w} strokeLinecap="round" fill="none" />
}

// A leaf cluster = layered ellipses with three-tone shading.
function LeafCluster({ cx, cy, r = 16 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <ellipse cx={cx + r * 0.15} cy={cy + r * 0.2} rx={r} ry={r * 0.85} fill={LEAF_DARK} />
      <ellipse cx={cx} cy={cy} rx={r * 0.95} ry={r * 0.8} fill={LEAF_MID} />
      <ellipse cx={cx - r * 0.25} cy={cy - r * 0.3} rx={r * 0.55} ry={r * 0.4} fill={LEAF_LIGHT} opacity="0.9" />
    </g>
  )
}

/* ---------- Stages ---------- */

function Stage0() {
  return <Pot />
}

function Stage1() {
  // Seedling in pot: stem + two small leaves
  return (
    <g>
      <Pot />
      <path d="M120 250 C 120 240, 120 232, 120 220" stroke={STEM} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 235 Q 110 232 102 238 Q 110 244 120 240 Z" fill={LEAF_MID} />
      <path d="M120 235 Q 130 232 138 238 Q 130 244 120 240 Z" fill={LEAF_MID} />
      <circle cx="120" cy="218" r="2.5" fill={LEAF_LIGHT} />
    </g>
  )
}

function Stage2() {
  // Young sprout: planted, small trunk, 3 leaf tufts at top
  return (
    <g>
      <Ground />
      <Trunk topY={236} halfBase={3} halfTop={2} />
      <LeafCluster cx={120} cy={228} r={16} />
      <LeafCluster cx={104} cy={236} r={11} />
      <LeafCluster cx={136} cy={236} r={11} />
      <LeafCluster cx={120} cy={216} r={9} />
    </g>
  )
}

function Stage3() {
  // Sapling: visible side branches reaching up
  return (
    <g>
      <Ground />
      <Trunk topY={200} halfBase={5} halfTop={3} />
      <Branch x={118} y={240} ex={92} ey={222} />
      <Branch x={122} y={240} ex={148} ey={222} />
      <Branch x={118} y={215} ex={102} ey={196} />
      <Branch x={122} y={215} ex={138} ey={196} />
      <LeafCluster cx={120} cy={196} r={20} />
      <LeafCluster cx={94} cy={216} r={14} />
      <LeafCluster cx={146} cy={216} r={14} />
      <LeafCluster cx={104} cy={194} r={11} />
      <LeafCluster cx={136} cy={194} r={11} />
      <LeafCluster cx={120} cy={182} r={10} />
    </g>
  )
}

function Stage4() {
  // Young tree: taller trunk, multi-layer canopy
  return (
    <g>
      <Ground />
      <Trunk topY={172} halfBase={7} halfTop={4} />
      {/* lower branches */}
      <Branch x={116} y={234} ex={84} ey={208} w={2.5} />
      <Branch x={124} y={234} ex={156} ey={208} w={2.5} />
      {/* upper branches */}
      <Branch x={118} y={200} ex={90} ey={176} w={2.2} />
      <Branch x={122} y={200} ex={150} ey={176} w={2.2} />
      <Branch x={118} y={185} ex={108} ey={158} w={2} />
      <Branch x={122} y={185} ex={132} ey={158} w={2} />
      {/* canopy clusters */}
      <LeafCluster cx={120} cy={168} r={24} />
      <LeafCluster cx={92} cy={186} r={18} />
      <LeafCluster cx={148} cy={186} r={18} />
      <LeafCluster cx={82} cy={206} r={14} />
      <LeafCluster cx={158} cy={206} r={14} />
      <LeafCluster cx={104} cy={156} r={14} />
      <LeafCluster cx={136} cy={156} r={14} />
      <LeafCluster cx={120} cy={144} r={12} />
    </g>
  )
}

function Stage5() {
  // Mature tree: wider, layered, visible structure
  return (
    <g>
      <Ground />
      <Trunk topY={140} halfBase={9} halfTop={5} />
      {/* trunk highlight */}
      <path d="M116 290 L118 200" stroke={TRUNK_DARK} strokeWidth="1" opacity="0.4" />
      {/* lower branches */}
      <Branch x={114} y={232} ex={72} ey={200} w={3} />
      <Branch x={126} y={232} ex={168} ey={200} w={3} />
      {/* mid branches */}
      <Branch x={116} y={196} ex={80} ey={162} w={2.5} />
      <Branch x={124} y={196} ex={160} ey={162} w={2.5} />
      {/* upper branches */}
      <Branch x={118} y={170} ex={100} ey={132} w={2} />
      <Branch x={122} y={170} ex={140} ey={132} w={2} />
      {/* canopy */}
      <LeafCluster cx={120} cy={140} r={28} />
      <LeafCluster cx={84} cy={170} r={22} />
      <LeafCluster cx={156} cy={170} r={22} />
      <LeafCluster cx={72} cy={198} r={16} />
      <LeafCluster cx={168} cy={198} r={16} />
      <LeafCluster cx={100} cy={156} r={16} />
      <LeafCluster cx={140} cy={156} r={16} />
      <LeafCluster cx={100} cy={128} r={14} />
      <LeafCluster cx={140} cy={128} r={14} />
      <LeafCluster cx={120} cy={114} r={14} />
    </g>
  )
}

function Stage6() {
  // Flowering tree: same scale as mature + scattered blossoms + petals
  const blossoms: Array<[number, number, number]> = [
    [120, 100, 4], [108, 116, 3.5], [134, 118, 4], [96, 134, 3.5], [144, 136, 4],
    [82, 156, 3.5], [158, 158, 4], [102, 150, 3], [138, 150, 3], [120, 142, 3.5],
    [70, 184, 3.5], [170, 184, 3.5], [112, 178, 3], [128, 178, 3], [88, 210, 3.5],
    [152, 212, 3.5], [120, 168, 3], [98, 192, 3], [142, 192, 3],
  ]
  return (
    <g>
      <Ground />
      {/* Stage 5 base */}
      <Stage5Body />
      {/* blossoms layer above canopy */}
      {blossoms.map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill={i % 3 === 0 ? BLOSSOM_B : BLOSSOM_A} />
          <circle cx={cx} cy={cy} r={r * 0.4} fill={BLOSSOM_CENTER} />
        </g>
      ))}
      {/* falling petals */}
      <g>
        <ellipse cx={66} cy={262} rx={2.5} ry={1.5} fill={BLOSSOM_A} transform="rotate(20 66 262)" />
        <ellipse cx={88} cy={278} rx={2.5} ry={1.5} fill={BLOSSOM_B} transform="rotate(-15 88 278)" />
        <ellipse cx={172} cy={258} rx={2.5} ry={1.5} fill={BLOSSOM_A} transform="rotate(35 172 258)" />
        <ellipse cx={194} cy={282} rx={2.5} ry={1.5} fill={BLOSSOM_A} transform="rotate(-25 194 282)" />
        <ellipse cx={148} cy={290} rx={2.5} ry={1.5} fill={BLOSSOM_B} transform="rotate(10 148 290)" />
      </g>
    </g>
  )
}

// Inner body of Stage 5 for reuse without re-drawing ground.
function Stage5Body() {
  return (
    <>
      <Trunk topY={140} halfBase={9} halfTop={5} />
      <path d="M116 290 L118 200" stroke={TRUNK_DARK} strokeWidth="1" opacity="0.4" />
      <Branch x={114} y={232} ex={72} ey={200} w={3} />
      <Branch x={126} y={232} ex={168} ey={200} w={3} />
      <Branch x={116} y={196} ex={80} ey={162} w={2.5} />
      <Branch x={124} y={196} ex={160} ey={162} w={2.5} />
      <Branch x={118} y={170} ex={100} ey={132} w={2} />
      <Branch x={122} y={170} ex={140} ey={132} w={2} />
      <LeafCluster cx={120} cy={140} r={28} />
      <LeafCluster cx={84} cy={170} r={22} />
      <LeafCluster cx={156} cy={170} r={22} />
      <LeafCluster cx={72} cy={198} r={16} />
      <LeafCluster cx={168} cy={198} r={16} />
      <LeafCluster cx={100} cy={156} r={16} />
      <LeafCluster cx={140} cy={156} r={16} />
      <LeafCluster cx={100} cy={128} r={14} />
      <LeafCluster cx={140} cy={128} r={14} />
      <LeafCluster cx={120} cy={114} r={14} />
    </>
  )
}

function Stage7() {
  // Heritage tree: tallest, thickest, fruits, hint of bark
  return (
    <g>
      <Ground />
      <Trunk topY={112} halfBase={12} halfTop={7} />
      {/* bark lines */}
      <path d="M112 290 Q 114 240 116 180" stroke={TRUNK_BARK} strokeWidth="1.2" opacity="0.5" fill="none" />
      <path d="M124 290 Q 122 240 124 180" stroke={TRUNK_BARK} strokeWidth="1.2" opacity="0.5" fill="none" />
      <path d="M118 260 Q 120 250 122 240" stroke={TRUNK_BARK} strokeWidth="0.8" opacity="0.4" fill="none" />
      {/* branch structure (thicker, wider spread) */}
      <Branch x={110} y={232} ex={56} ey={196} w={3.5} />
      <Branch x={130} y={232} ex={184} ey={196} w={3.5} />
      <Branch x={112} y={196} ex={70} ey={156} w={3} />
      <Branch x={128} y={196} ex={170} ey={156} w={3} />
      <Branch x={116} y={166} ex={90} ey={124} w={2.5} />
      <Branch x={124} y={166} ex={150} ey={124} w={2.5} />
      <Branch x={120} y={140} ex={120} ey={102} w={2.5} />
      {/* canopy: larger and more layered */}
      <LeafCluster cx={120} cy={112} r={32} />
      <LeafCluster cx={78} cy={144} r={26} />
      <LeafCluster cx={162} cy={144} r={26} />
      <LeafCluster cx={58} cy={180} r={22} />
      <LeafCluster cx={182} cy={180} r={22} />
      <LeafCluster cx={66} cy={210} r={17} />
      <LeafCluster cx={174} cy={210} r={17} />
      <LeafCluster cx={94} cy={132} r={18} />
      <LeafCluster cx={146} cy={132} r={18} />
      <LeafCluster cx={120} cy={154} r={18} />
      <LeafCluster cx={104} cy={92} r={16} />
      <LeafCluster cx={136} cy={92} r={16} />
      <LeafCluster cx={120} cy={78} r={14} />
      {/* fruits */}
      {[[88, 162], [150, 162], [118, 174], [72, 188], [168, 188], [102, 122], [142, 122]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={4} fill={FRUIT} />
          <circle cx={cx - 1} cy={cy - 1} r={1.2} fill="#fecaca" />
          <path d={`M ${cx} ${cy - 4} L ${cx + 1} ${cy - 6}`} stroke={TRUNK_DARK} strokeWidth="1" />
        </g>
      ))}
    </g>
  )
}

/* ---------- Entry ---------- */

const STAGE_FNS = [Stage0, Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, Stage7]

export default function TreeStageSvg({ stage, className = '', size = 120 }: Props) {
  const Cmp = STAGE_FNS[Math.max(0, Math.min(7, stage))]
  const aspectH = (size * 320) / 240
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 320"
      width={size}
      height={aspectH}
      className={className}
      role="img"
      aria-label={`Tree stage ${stage}`}
    >
      <Cmp />
    </svg>
  )
}
