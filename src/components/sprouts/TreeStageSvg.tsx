// Eight tree stages in a 240x320 portrait viewBox. Stages 0-1 sit in a
// terracotta pot; stages 2+ are planted in a grass strip. Trees get
// visibly bigger each stage. Branches curve outward then upward; canopy
// is built from layered leaf clusters with three-tone shading; flowers
// in stage 6 are anchored on canopy cluster positions, not floating.

type Props = { stage: number; className?: string; size?: number }

const POT = '#a16207'
const POT_DARK = '#713f12'
const POT_LIGHT = '#ca8a04'
const SOIL = '#3f2a14'

const TRUNK = '#7c4a1e'
const TRUNK_DARK = '#5b3514'
const TRUNK_BARK = '#4a2c0f'

const LEAF_DARK = '#047857'
const LEAF_MID = '#10b981'
const LEAF_LIGHT = '#6ee7b7'

const STEM = '#22c55e'

const BLOSSOM_A = '#fce7f3'
const BLOSSOM_B = '#f9a8d4'
const BLOSSOM_C = '#ec4899'
const BLOSSOM_CENTER = '#fcd34d'

const FRUIT = '#dc2626'
const FRUIT_HIGHLIGHT = '#fecaca'

const GRASS = '#65a30d'
const GRASS_DARK = '#3f6212'

/* ---------- Reusable parts ---------- */

function Defs() {
  // Defined once via a single instance. SVG ids are global so multiple
  // TreeStageSvg renderings on the same page reuse the same defs.
  return (
    <defs>
      <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8b5a23" />
        <stop offset="0.5" stopColor={TRUNK} />
        <stop offset="1" stopColor={TRUNK_DARK} />
      </linearGradient>
      <linearGradient id="canopyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={LEAF_LIGHT} />
        <stop offset="0.5" stopColor={LEAF_MID} />
        <stop offset="1" stopColor={LEAF_DARK} />
      </linearGradient>
      <filter id="ragged" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="1.6" />
      </filter>
    </defs>
  )
}

function Pot() {
  // Restored to the earlier, simpler look: clean rim + trapezoid body,
  // one subtle highlight, dark soil ellipse aligned with the rim.
  return (
    <g>
      <rect x="60" y="244" width="120" height="11" rx="3" fill={POT_DARK} />
      <path d="M68 255 L172 255 L158 305 L82 305 Z" fill={POT} />
      <path d="M78 258 L86 301" stroke={POT_LIGHT} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="120" cy="255" rx="56" ry="3.5" fill={SOIL} />
    </g>
  )
}

function Ground() {
  return (
    <g>
      {/* soft tree shadow on ground */}
      <ellipse cx="120" cy="298" rx="76" ry="5" fill="#000" opacity="0.1" />
      <rect x="0" y="294" width="240" height="18" fill={GRASS} />
      <rect x="0" y="294" width="240" height="2" fill={GRASS_DARK} opacity="0.5" />
    </g>
  )
}

// Tapered trunk with gradient shading. baseY=298 means trunk sinks
// slightly below visual ground line to give weight.
function Trunk({ topY, halfBase, halfTop, baseY = 298 }: { topY: number; halfBase: number; halfTop: number; baseY?: number }) {
  const d = `M ${120 - halfBase} ${baseY}
             C ${120 - halfBase + 0.5} ${(topY + baseY) / 2}, ${120 - halfTop - 0.5} ${(topY + baseY) / 2}, ${120 - halfTop} ${topY}
             L ${120 + halfTop} ${topY}
             C ${120 + halfTop + 0.5} ${(topY + baseY) / 2}, ${120 + halfBase - 0.5} ${(topY + baseY) / 2}, ${120 + halfBase} ${baseY} Z`
  return <path d={d} fill="url(#trunkGrad)" />
}

function Branch({ x, y, ex, ey, w = 2 }: { x: number; y: number; ex: number; ey: number; w?: number }) {
  const cx = (x + ex) / 2
  const cy = Math.min(y, ey) - Math.abs(ex - x) * 0.15 - 6
  return <path d={`M ${x} ${y} Q ${cx} ${cy} ${ex} ${ey}`} stroke={TRUNK} strokeWidth={w} strokeLinecap="round" fill="none" />
}

// Cluster of foliage with gradient-painted main body + darker back and lighter highlight.
function LeafCluster({ cx, cy, r = 16 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <ellipse cx={cx + r * 0.18} cy={cy + r * 0.22} rx={r} ry={r * 0.85} fill={LEAF_DARK} />
      <ellipse cx={cx} cy={cy} rx={r * 0.96} ry={r * 0.82} fill="url(#canopyGrad)" filter="url(#ragged)" />
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.35} rx={r * 0.5} ry={r * 0.35} fill={LEAF_LIGHT} opacity="0.85" />
    </g>
  )
}

// 5-petal cherry blossom centred at (cx, cy). Scaled for context.
function Flower({ cx, cy, scale = 1, accent = false }: { cx: number; cy: number; scale?: number; accent?: boolean }) {
  const petalLen = 3.2 * scale
  const petalW = 2.1 * scale
  const petalColor = accent ? BLOSSOM_C : BLOSSOM_A
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse
          key={deg}
          cx="0" cy={-petalLen * 0.9}
          rx={petalW} ry={petalLen}
          fill={petalColor}
          transform={`rotate(${deg})`}
          opacity="0.95"
        />
      ))}
      <circle r={1.4 * scale} fill={BLOSSOM_CENTER} />
      <circle r={0.5 * scale} fill={BLOSSOM_B} />
    </g>
  )
}

/* ---------- Stages ---------- */

function Stage0() {
  return <Pot />
}

function Stage1() {
  // Seedling clearly sitting above the soil, leaves above the pot rim.
  return (
    <g>
      <Pot />
      <path d="M120 254 C 120 246, 120 232, 120 218" stroke={STEM} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="110" cy="226" rx="10" ry="5.5" transform="rotate(-28 110 226)" fill={LEAF_MID} />
      <ellipse cx="130" cy="226" rx="10" ry="5.5" transform="rotate(28 130 226)" fill={LEAF_MID} />
      <ellipse cx="111" cy="223" rx="5" ry="2.5" transform="rotate(-28 111 223)" fill={LEAF_LIGHT} opacity="0.8" />
      <ellipse cx="129" cy="223" rx="5" ry="2.5" transform="rotate(28 129 223)" fill={LEAF_LIGHT} opacity="0.8" />
      <ellipse cx="120" cy="213" rx="3.5" ry="5.5" fill={LEAF_LIGHT} />
    </g>
  )
}

function Stage2() {
  // Sapling planted in ground: thin stem with leaves along it + a small
  // tuft at the top. Reads as a young plant, not a triangle.
  return (
    <g>
      <Ground />
      <path d="M120 294 C 120 280, 120 260, 120 232" stroke={STEM} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* alternating side leaves */}
      <g>
        <path d="M120 274 Q 106 270 96 273 Q 106 280 120 278 Z" fill={LEAF_MID} />
        <path d="M105 273 L 100 274" stroke={LEAF_DARK} strokeWidth="0.6" opacity="0.5" />
      </g>
      <g>
        <path d="M120 258 Q 134 254 144 257 Q 134 264 120 262 Z" fill={LEAF_MID} />
        <path d="M135 258 L 140 258" stroke={LEAF_DARK} strokeWidth="0.6" opacity="0.5" />
      </g>
      <g>
        <path d="M120 244 Q 106 240 96 244 Q 106 250 120 248 Z" fill={LEAF_MID} />
      </g>
      {/* top tuft */}
      <ellipse cx="120" cy="228" rx="14" ry="10" fill={LEAF_DARK} />
      <ellipse cx="115" cy="225" rx="9" ry="6.5" fill={LEAF_MID} />
      <ellipse cx="126" cy="228" rx="9" ry="6.5" fill={LEAF_MID} />
      <ellipse cx="118" cy="219" rx="6" ry="4" fill={LEAF_LIGHT} opacity="0.9" />
    </g>
  )
}

function Stage3() {
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
  return (
    <g>
      <Ground />
      <Trunk topY={172} halfBase={7} halfTop={4} />
      <Branch x={116} y={234} ex={84} ey={208} w={2.5} />
      <Branch x={124} y={234} ex={156} ey={208} w={2.5} />
      <Branch x={118} y={200} ex={90} ey={176} w={2.2} />
      <Branch x={122} y={200} ex={150} ey={176} w={2.2} />
      <Branch x={118} y={185} ex={108} ey={158} w={2} />
      <Branch x={122} y={185} ex={132} ey={158} w={2} />
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

// Canopy positions for stage 5 (mature) - reused by stage 6 (flowering)
// so blossoms land ON the foliage rather than floating in air.
const MATURE_CANOPY = [
  { cx: 120, cy: 140, r: 28 },
  { cx: 84,  cy: 170, r: 22 },
  { cx: 156, cy: 170, r: 22 },
  { cx: 72,  cy: 198, r: 16 },
  { cx: 168, cy: 198, r: 16 },
  { cx: 100, cy: 156, r: 16 },
  { cx: 140, cy: 156, r: 16 },
  { cx: 100, cy: 128, r: 14 },
  { cx: 140, cy: 128, r: 14 },
  { cx: 120, cy: 114, r: 14 },
]

function MatureSkeleton() {
  return (
    <g>
      <Trunk topY={140} halfBase={9} halfTop={5} />
      <Branch x={114} y={232} ex={72} ey={200} w={3} />
      <Branch x={126} y={232} ex={168} ey={200} w={3} />
      <Branch x={116} y={196} ex={80} ey={162} w={2.5} />
      <Branch x={124} y={196} ex={160} ey={162} w={2.5} />
      <Branch x={118} y={170} ex={100} ey={132} w={2} />
      <Branch x={122} y={170} ex={140} ey={132} w={2} />
    </g>
  )
}

function Stage5() {
  return (
    <g>
      <Ground />
      <MatureSkeleton />
      {MATURE_CANOPY.map((c, i) => <LeafCluster key={i} {...c} />)}
    </g>
  )
}

function Stage6() {
  // Flowering = mature + blossoms anchored on canopy clusters.
  // Each canopy cluster gets 2-3 flowers placed near its centre at small
  // radius offsets, plus a few falling petals below the tree.
  const flowers: Array<{ cx: number; cy: number; scale: number; accent: boolean }> = []
  for (const c of MATURE_CANOPY) {
    const flowerCount = c.r > 20 ? 3 : c.r > 14 ? 2 : 1
    for (let i = 0; i < flowerCount; i++) {
      // Deterministic-ish placement around cluster centre based on i and r
      const angle = (i / flowerCount) * Math.PI * 2 + c.cx * 0.07
      const dist = c.r * (0.3 + (i % 2 === 0 ? 0.2 : 0.45))
      flowers.push({
        cx: c.cx + Math.cos(angle) * dist,
        cy: c.cy + Math.sin(angle) * dist * 0.8,
        scale: c.r > 20 ? 1.3 : c.r > 14 ? 1.1 : 0.9,
        accent: i === 0 && c.r > 16,
      })
    }
  }
  return (
    <g>
      <Ground />
      <MatureSkeleton />
      {MATURE_CANOPY.map((c, i) => <LeafCluster key={i} {...c} />)}
      {/* blossoms anchored on canopy */}
      {flowers.map((f, i) => <Flower key={i} {...f} />)}
      {/* falling petals (curves down below the canopy, never floating in mid-air alone) */}
      <g>
        <ellipse cx={72} cy={246} rx={1.8} ry={3.2} fill={BLOSSOM_B} transform="rotate(20 72 246)" />
        <ellipse cx={88} cy={272} rx={1.8} ry={3.2} fill={BLOSSOM_A} transform="rotate(-15 88 272)" />
        <ellipse cx={170} cy={258} rx={1.8} ry={3.2} fill={BLOSSOM_B} transform="rotate(35 170 258)" />
        <ellipse cx={192} cy={282} rx={1.8} ry={3.2} fill={BLOSSOM_A} transform="rotate(-25 192 282)" />
        <ellipse cx={150} cy={290} rx={1.8} ry={3.2} fill={BLOSSOM_B} transform="rotate(10 150 290)" />
      </g>
    </g>
  )
}

function Stage7() {
  // Heritage: tallest, thickest, fruits, hint of bark
  return (
    <g>
      <Ground />
      <Trunk topY={112} halfBase={12} halfTop={7} />
      <path d="M112 290 Q 114 240 116 180" stroke={TRUNK_BARK} strokeWidth="1.2" opacity="0.5" fill="none" />
      <path d="M124 290 Q 122 240 124 180" stroke={TRUNK_BARK} strokeWidth="1.2" opacity="0.5" fill="none" />
      <path d="M118 260 Q 120 250 122 240" stroke={TRUNK_BARK} strokeWidth="0.8" opacity="0.4" fill="none" />
      <Branch x={110} y={232} ex={56} ey={196} w={3.5} />
      <Branch x={130} y={232} ex={184} ey={196} w={3.5} />
      <Branch x={112} y={196} ex={70} ey={156} w={3} />
      <Branch x={128} y={196} ex={170} ey={156} w={3} />
      <Branch x={116} y={166} ex={90} ey={124} w={2.5} />
      <Branch x={124} y={166} ex={150} ey={124} w={2.5} />
      <Branch x={120} y={140} ex={120} ey={102} w={2.5} />
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
      {/* fruits anchored on canopy areas */}
      {[[88, 162], [150, 162], [118, 174], [72, 188], [168, 188], [102, 122], [142, 122]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={4} fill={FRUIT} />
          <circle cx={cx - 1} cy={cy - 1} r={1.2} fill={FRUIT_HIGHLIGHT} />
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
      <Defs />
      <Cmp />
    </svg>
  )
}
